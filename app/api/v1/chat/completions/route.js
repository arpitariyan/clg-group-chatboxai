/**
 * POST /api/v1/chat/completions
 * ═══════════════════════════════════════════════════════════════
 * ChatboxAI API Gateway — OpenAI-compatible chat completion endpoint.
 *
 * FLOW:
 *   User  →  cbx_live_* API key  →  This route
 *   This route:
 *     1. Authenticates the key
 *     2. Resolves the model from MODEL_REGISTRY via publicId
 *     3. Tries each provider in model.providers[] (fallback chain)
 *     4. Returns OpenAI-compatible response
 *     5. Logs usage to Appwrite
 *
 * To add a new model: edit ONLY lib/models-registry.js
 * To add a new provider: add a case in callProvider() below
 */

import { NextResponse } from 'next/server';
import { validateApiRequest, createApiResponse, createApiErrorResponse } from '@/lib/api-gateway.js';
import { findModel, MODEL_REGISTRY, isFreeModelPublicId } from '@/lib/models-registry.js';
import { databases } from '@/services/appwrite-admin.js';
import { API_USAGE_LOGS_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';
import { resolveModelWithBudget, settleBudgetUsage, refundBudgetReserve } from '@/lib/budget-router.js';
import { ID } from 'node-appwrite';
import { v4 as uuidv4 } from 'uuid';

// ── Auto-select fallback chain (publicIds) ───────────────────────────────────
const AUTO_CHAIN = [
  'chatboxai/llama-3.3-70b',          // Groq — fast & high quality
  'chatboxai/gemini-2.5-flash',       // Google — reliable fallback
  'chatboxai/llama-3.1-8b',          // Groq — lightest fallback
];

// ── Shared OpenAI-compatible call ───────────────────────────────────────────
async function callOpenAICompat(modelApi, messages, options, baseURL, apiKey, providerLabel) {
  const { OpenAI } = await import('openai');
  if (!apiKey) throw new Error(`[${providerLabel}] API key not configured on server (env var missing).`);

  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

  const response = await client.chat.completions.create({
    model: modelApi,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2048,
    top_p: options.top_p ?? 1.0,
    frequency_penalty: options.frequency_penalty ?? 0,
    presence_penalty: options.presence_penalty ?? 0,
    stream: false,
  });

  return {
    provider: providerLabel,
    choices: response.choices.map((c) => ({
      message: { role: c.message.role, content: c.message.content },
      finish_reason: c.finish_reason,
      index: c.index,
    })),
    usage: {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    },
  };
}

// ── Provider dispatch ────────────────────────────────────────────────────────
async function callProvider(provider, modelApi, messages, options) {
  switch (provider) {

    case 'openai':
      return callOpenAICompat(modelApi, messages, options, null,
        process.env.OPENAI_API_KEY, 'openai');

    case 'groq':
      return callOpenAICompat(modelApi, messages, options,
        'https://api.groq.com/openai/v1',
        process.env.GROQ_API_KEY, 'groq');

    case 'openrouter':
      return callOpenAICompat(modelApi, messages, options,
        'https://openrouter.ai/api/v1',
        process.env.OPENROUTER_API_KEY, 'openrouter');

    case 'nvidia': {
      const nvidiaKeys = [
        process.env.NVIDIA_API_KEY,
        process.env.NVIDIA_API_KEY_2,
        process.env.NVIDIA_API_KEY_3,
        process.env.NVIDIA_API_KEY_4,
      ].filter(k => k && typeof k === 'string' && k.trim() !== '').map(k => k.trim());

      if (nvidiaKeys.length === 0) {
        throw new Error('[nvidia] API key not configured.');
      }

      let lastError;
      for (const key of nvidiaKeys) {
        try {
          return await callOpenAICompat(modelApi, messages, options,
            'https://integrate.api.nvidia.com/v1',
            key, 'nvidia');
        } catch (error) {
          lastError = error;
          console.warn(`[nvidia] API key failed, trying next if available. Error: ${error.message}`);
        }
      }
      throw lastError;
    }


    case 'replicate': {
      // Replicate's real OpenAI-compat endpoint (for models hosted on Replicate)
      const replicateKey = process.env.REPLICATE_API_KEY;
      if (replicateKey) {
        return callOpenAICompat(modelApi, messages, options,
          'https://openai-compat.replicate.com/v1',
          replicateKey, 'replicate');
      }
      // Fallback: all former "replicate" models are now on OpenRouter
      const orKey = process.env.OPENROUTER_API_KEY;
      if (!orKey) throw new Error('[replicate/openrouter] No API key configured. Set REPLICATE_API_KEY or OPENROUTER_API_KEY.');
      console.warn('[replicate] No REPLICATE_API_KEY found, routing via OpenRouter instead.');
      return callOpenAICompat(modelApi, messages, options,
        'https://openrouter.ai/api/v1',
        orKey, 'openrouter');
    }


    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('[anthropic] API key not configured.');
      let Anthropic;
      try {
        ({ Anthropic } = await import('@anthropic-ai/sdk'));
      } catch {
        throw new Error('[anthropic] @anthropic-ai/sdk package is not installed. Run: npm install @anthropic-ai/sdk');
      }
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model: modelApi,
        messages,
        max_tokens: options.max_tokens ?? 2048,
        temperature: options.temperature ?? 0.7,
        ...(options.system ? { system: options.system } : {}),
      });
      return {
        provider: 'anthropic',
        choices: [{
          message: { role: 'assistant', content: res.content.map((b) => b.text).join('') },
          finish_reason: res.stop_reason === 'end_turn' ? 'stop' : res.stop_reason,
          index: 0,
        }],
        usage: {
          prompt_tokens: res.usage?.input_tokens ?? 0,
          completion_tokens: res.usage?.output_tokens ?? 0,
          total_tokens: (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0),
        },
      };
    }

    case 'google': {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error('[google] API key not configured.');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelApi });
      const contents = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
      const res = await model.generateContent({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.max_tokens ?? 2048,
          topP: options.top_p ?? 1.0,
        },
      });
      return {
        provider: 'google',
        choices: [{
          message: { role: 'assistant', content: res.response.text() },
          finish_reason: res.response.candidates?.[0]?.finishReason ?? 'stop',
          index: 0,
        }],
        usage: {
          prompt_tokens: res.response.usageMetadata?.promptTokenCount ?? 0,
          completion_tokens: res.response.usageMetadata?.candidatesTokenCount ?? 0,
          total_tokens: res.response.usageMetadata?.totalTokenCount ?? 0,
        },
      };
    }

    default:
      throw new Error(`Unknown provider: "${provider}"`);
  }
}

// ── Gateway router ───────────────────────────────────────────────────────────
async function routeRequest(publicId, messages, options) {
  // ── Auto: try the priority fallback chain
  if (!publicId || publicId === 'auto') {
    for (const fallbackId of AUTO_CHAIN) {
      try {
        return await routeRequest(fallbackId, messages, options);
      } catch (err) {
        console.warn(`[ChatboxAI] Auto fallback "${fallbackId}" failed:`, err.message);
      }
    }
    throw new Error('All auto-fallback models failed. Please specify a model.');
  }

  // ── Resolve model from registry
  const model = findModel(publicId);
  if (!model || !model.providers?.length) {
    throw new Error(`Model "${publicId}" not found in registry.`);
  }

  // ── Try each provider in order (primary → fallbacks)
  const errors = [];
  for (const { provider, modelApi } of model.providers) {
    try {
      console.log(`[ChatboxAI] Routing "${publicId}" → ${provider} (${modelApi})`);
      const result = await callProvider(provider, modelApi, messages, options);
      result.resolvedModel = { publicId, provider, modelApi };
      return result;
    } catch (err) {
      console.warn(`[ChatboxAI] Provider "${provider}" failed for "${publicId}":`, err.message);
      errors.push(`${provider}: ${err.message}`);
    }
  }

  throw new Error(
    `All providers failed for model "${publicId}".\n${errors.join('\n')}`
  );
}

// ── Usage logging ────────────────────────────────────────────────────────────
async function logUsage(userId, keyId, publicId, provider, inputTokens, outputTokens, costUsd, status = 'success') {
  try {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      API_USAGE_LOGS_COLLECTION_ID,
      ID.unique(),
      {
        user_id: userId,
        key_id: keyId,
        endpoint: 'chat',
        model: publicId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost_usd: String(costUsd), // cost is stored as string in schema
        status,
        meta: JSON.stringify({ provider_used: provider }),
        created_at: new Date().toISOString(),
        timestamp: Math.floor(Date.now() / 1000),
      }
    );
  } catch (err) {
    console.error('[ChatboxAI] Failed to log usage:', err);
  }
}

// ── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  let body;
  let context = null;
  try {
    body = await request.json();

    // Validate required fields
    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
      return createApiErrorResponse(
        'Missing required fields: model (string), messages (array)',
        'validation_error', 'invalid_request', 400, null,
      );
    }

    context = await validateApiRequest(request, 100, body.model);
    if (!context.valid) return context.errorResponse;

    // ── TEST environment: return mock response without hitting any provider ──
    if (context.context.environment === 'test') {
      const lastUserMsg = [...body.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
      return createApiResponse(
        {
          id: `chatcmpl-test-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: body.model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: `[TEST MODE] This is a simulated response to: "${String(lastUserMsg).slice(0, 80)}"`,
            },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          cost_inr: 0,
          test_mode: true,
        },
        context.context,
        200,
      );
    }

    // ── Use dual-wallet Budget Router to find model and reserve credits ──
    const resolution = await resolveModelWithBudget({
      userEmail: context.context.userEmail,
      plan: context.context.accountTier || 'free', // 'paid' or 'free' based on API key validation
      requestedPublicId: body.model,
      requestClass: 'chat',
      estimatedInputTokens: Math.floor(JSON.stringify(body.messages).length / 4),
      expectedOutputTokens: body.max_tokens ?? 1024,
    });

    if (resolution.blocked) {
      return createApiErrorResponse(
        resolution.blockReason || 'Insufficient credits or plan restriction.',
        'payment_required', 'insufficient_api_credits', 402, context.context
      );
    }

    let result;
    try {
      // ── Call the provider exactly like the main app does ──
      const options = {
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        top_p: body.top_p,
        frequency_penalty: body.frequency_penalty,
        presence_penalty: body.presence_penalty,
        system: body.system,
      };

      const providerConfig = resolution.resolvedModel.providers.find(p => p.provider === resolution.provider) || resolution.resolvedModel.providers[0];
      const modelApi = providerConfig?.modelApi;

      if (!modelApi) {
        throw new Error(`Model API configuration missing for ${resolution.provider}`);
      }

      result = await callProvider(
        resolution.provider,
        modelApi,
        body.messages,
        options
      );
    } catch (providerErr) {
      // Refund reservation on complete failure
      await refundBudgetReserve({
        reservationId: resolution.reservationId,
        userEmail: context.context.userEmail,
      });
      throw providerErr;
    }

    // ── Settle usage after successful response ──
    const settlement = await settleBudgetUsage({
      reservationId: resolution.reservationId,
      userEmail: context.context.userEmail,
      actualInputTokens: result.usage.prompt_tokens,
      actualOutputTokens: result.usage.completion_tokens,
      modelUsed: resolution.resolvedModel,
      providerUsed: resolution.provider,
      requestClass: 'chat',
      plan: context.context.accountTier || 'free',
      requestedPublicId: body.model,
      fallbackTriggered: resolution.fallbackTriggered,
    });

    // Return OpenAI-compatible response — no provider details exposed
    const response = createApiResponse(
      {
        id: `chatcmpl-${uuidv4()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model,
        choices: result.choices,
        usage: result.usage,
        cost_credits: settlement.creditsSettled,
      },
      context.context,
      200,
    );

    if (settlement.walletAfter !== undefined) {
      response.headers.set('X-API-Credits-Remaining', String(settlement.walletAfter));
    }
    return response;

  } catch (err) {
    console.error('[ChatboxAI] /api/v1/chat/completions error:', err);
    if (body?.model && context?.context) {
      logUsage(context.context.userId, context.context.keyId, body.model, 'unknown', 0, 0, 0, 'error');
    }
    return createApiErrorResponse(
      err.message || 'An unexpected error occurred.',
      'server_error', 'internal_error', 500, context.context,
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
  });
}

