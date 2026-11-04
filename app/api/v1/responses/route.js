/**
 * POST /api/v1/responses
 * ChatboxAI API — Responses API (higher-level chat interface).
 *
 * A higher-level wrapper over chat completions that accepts a simpler
 * { model, input, instructions } format and returns structured response objects.
 *
 * v1 is stateless — previous_response_id is accepted but context must
 * be re-sent by the client. Server-side state tracking is planned for v2.
 *
 * Body:
 *   model                – model publicId (required)
 *   input                – string or array of message objects (required)
 *   instructions         – system instruction (optional)
 *   tools                – array of tool definitions (optional)
 *   temperature          – 0.0–2.0 (default: 0.7)
 *   max_output_tokens    – max tokens (default: 2048)
 *   previous_response_id – ignored in v1, accepted for API compatibility
 */

import { NextResponse } from 'next/server';
import { validateApiRequest, createApiResponse, createApiErrorResponse } from '@/lib/api-gateway.js';
import { calculateChatCost } from '@/lib/api-pricing.js';
import { findModel, isFreeModelPublicId } from '@/lib/models-registry.js';
import { deductApiCreditsWithLock } from '@/lib/api-credits.js';
import { databases } from '@/services/appwrite-admin.js';
import { API_USAGE_LOGS_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';
import { ID } from 'node-appwrite';
import { v4 as uuidv4 } from 'uuid';

const AUTO_CHAIN = [
  'chatboxai/llama-3.3-70b',
  'chatboxai/gemini-2.5-flash',
  'chatboxai/llama-3.1-8b',
];

async function callOpenAICompat(modelApi, messages, options, baseURL, apiKey, label) {
  const { OpenAI } = await import('openai');
  if (!apiKey) throw new Error(`[${label}] API key not configured.`);
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  const res = await client.chat.completions.create({
    model: modelApi, messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2048,
    top_p: options.top_p ?? 1.0,
    ...(options.tools?.length ? { tools: options.tools, tool_choice: options.tool_choice || 'auto' } : {}),
    stream: false,
  });
  return {
    provider: label,
    choices: res.choices.map((c) => ({
      message: { role: c.message.role, content: c.message.content, tool_calls: c.message.tool_calls },
      finish_reason: c.finish_reason,
      index: c.index,
    })),
    usage: {
      prompt_tokens:     res.usage?.prompt_tokens     ?? 0,
      completion_tokens: res.usage?.completion_tokens ?? 0,
      total_tokens:      res.usage?.total_tokens      ?? 0,
    },
  };
}

async function callProvider(provider, modelApi, messages, options) {
  switch (provider) {
    case 'groq':
      return callOpenAICompat(modelApi, messages, options, 'https://api.groq.com/openai/v1', process.env.GROQ_API_KEY, 'groq');
    case 'openrouter':
      return callOpenAICompat(modelApi, messages, options, 'https://openrouter.ai/api/v1', process.env.OPENROUTER_API_KEY, 'openrouter');
    case 'openai':
      return callOpenAICompat(modelApi, messages, options, null, process.env.OPENAI_API_KEY, 'openai');
    case 'google': {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!key) throw new Error('[google] Key not configured.');
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: modelApi });
      const contents = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content || '' }],
      }));
      const res = await model.generateContent({
        contents,
        generationConfig: { temperature: options.temperature ?? 0.7, maxOutputTokens: options.max_tokens ?? 2048 },
      });
      return {
        provider: 'google',
        choices: [{ message: { role: 'assistant', content: res.response.text() }, finish_reason: 'stop', index: 0 }],
        usage: {
          prompt_tokens:     res.response.usageMetadata?.promptTokenCount     ?? 0,
          completion_tokens: res.response.usageMetadata?.candidatesTokenCount ?? 0,
          total_tokens:      res.response.usageMetadata?.totalTokenCount      ?? 0,
        },
      };
    }
    default:
      throw new Error(`Unknown provider: "${provider}"`);
  }
}

async function routeRequest(publicId, messages, options) {
  if (!publicId || publicId === 'auto') {
    for (const id of AUTO_CHAIN) {
      try { return await routeRequest(id, messages, options); }
      catch (e) { console.warn(`[Responses] Auto fallback "${id}" failed:`, e.message); }
    }
    throw new Error('All auto-fallback models failed.');
  }
  const model = findModel(publicId);
  if (!model?.providers?.length) throw new Error(`Model "${publicId}" not found.`);
  const errors = [];
  for (const { provider, modelApi } of model.providers) {
    try {
      const result = await callProvider(provider, modelApi, messages, options);
      result.resolvedModel = { publicId, provider, modelApi };
      return result;
    } catch (e) {
      errors.push(`${provider}: ${e.message}`);
    }
  }
  throw new Error(`All providers failed for "${publicId}":\n${errors.join('\n')}`);
}

async function logUsage(userId, keyId, model, provider, inputT, outputT, cost, status = 'success') {
  try {
    await databases.createDocument(APPWRITE_DATABASE_ID, API_USAGE_LOGS_COLLECTION_ID, ID.unique(), {
      user_id: userId, key_id: keyId, endpoint: 'responses', model,
      provider_used: provider, input_tokens: inputT, output_tokens: outputT,
      total_tokens: inputT + outputT, cost_usd: cost, status,
      created_at: new Date().toISOString(), timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (e) { console.error('[ChatboxAI] Failed to log responses usage:', e); }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
    const { model, input, instructions, tools, temperature, max_output_tokens, previous_response_id, tool_choice } = body;

    // Validate
    if (!model) return createApiErrorResponse('Missing required field: model', 'validation_error', 'invalid_request', 400, null);
    if (!input) return createApiErrorResponse('Missing required field: input', 'validation_error', 'invalid_request', 400, null);

    const context = await validateApiRequest(request, 100, model);
    if (!context.valid) return context.errorResponse;

    const foundModel = findModel(model);
    if (!foundModel) {
      return createApiErrorResponse(`Model "${model}" not found. GET /api/v1/models to list models.`, 'invalid_request_error', 'model_not_found', 404, context.context);
    }

    // Build messages array
    const messages = [];
    if (instructions) messages.push({ role: 'system', content: instructions });

    if (typeof input === 'string') {
      messages.push({ role: 'user', content: input });
    } else if (Array.isArray(input)) {
      messages.push(...input);
    } else {
      return createApiErrorResponse('input must be a string or array of message objects.', 'validation_error', 'invalid_input', 400, context.context);
    }

    const result = await routeRequest(model, messages, {
      temperature: temperature ?? 0.7,
      max_tokens: context.context.accountTier === 'free' && isFreeModelPublicId(model)
        ? Math.max(256, Math.floor((Number(max_output_tokens ?? 2048) || 2048) * 0.5))
        : (max_output_tokens ?? 2048),
      tools:       tools || [],
      tool_choice: tool_choice || 'auto',
    });

    const costUsd = calculateChatCost(model, result.usage.prompt_tokens, result.usage.completion_tokens);

    const shouldDeductCredits = context.context.accountTier !== 'free' && !isFreeModelPublicId(model);

    let deduction = null;
    if (shouldDeductCredits) {
      deduction = await deductApiCreditsWithLock(context.context.userEmail, costUsd, {
        transactionType: 'usage', keyId: context.context.keyId, endpoint: 'responses', costUsd,
        meta: { model, provider: result.resolvedModel?.provider },
      });

      if (!deduction.success) {
        return createApiErrorResponse(deduction.error || 'Insufficient API credits.', 'payment_required', 'insufficient_api_credits', 402, context.context);
      }
    }

    logUsage(context.context.userId, context.context.keyId, model, result.resolvedModel?.provider ?? result.provider,
      result.usage.prompt_tokens, result.usage.completion_tokens, shouldDeductCredits ? costUsd : 0);

    const responseId = `resp_${uuidv4().replace(/-/g, '')}`;
    const primaryChoice = result.choices[0];
    const outputText = primaryChoice?.message?.content || '';

    const responseBody = createApiResponse({
      id: responseId,
      object: 'response',
      created: Math.floor(Date.now() / 1000),
      model,
      ...(previous_response_id ? { previous_response_id } : {}),
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: outputText,
          ...(primaryChoice?.message?.tool_calls?.length
            ? { tool_calls: primaryChoice.message.tool_calls }
            : {}),
        },
      ],
      output_text: outputText,
      usage: {
        input_tokens: result.usage.prompt_tokens,
        output_tokens: result.usage.completion_tokens,
        total_tokens: result.usage.total_tokens,
      },
      cost_inr: shouldDeductCredits ? costUsd : 0,
    }, context.context, 200);

    if (deduction) {
      responseBody.headers.set('X-API-Credits-Remaining', String(deduction.balance_credits ?? 0));
    }

    return responseBody;

  } catch (err) {
    console.error('[ChatboxAI] /api/v1/responses error:', err);
    if (body && context?.context) {
      logUsage(context.context.userId, context.context.keyId, body.model || 'unknown', 'unknown', 0, 0, 0, 'error');
    }
    return createApiErrorResponse(err.message || 'An unexpected error occurred.', 'server_error', 'internal_error', 500, context.context);
  }
}
