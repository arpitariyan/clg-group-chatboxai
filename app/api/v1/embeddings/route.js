/**
 * POST /api/v1/embeddings
 * Generate embeddings for text
 * 
 * Requires: Bearer token with API key
 * 
 * Request body:
 * {
 *   input: "string" | ["string"],
 *   model: "text-embedding-3-small" | "text-embedding-3-large"
 * }
 * 
 * Response:
 * {
 *   object: "list",
 *   data: [
 *     {
 *       object: "embedding",
 *       embedding: [...float],
 *       index: 0
 *     }
 *   ],
 *   model: "text-embedding-3-small",
 *   usage: {
 *     prompt_tokens: 100,
 *     total_tokens: 100
 *   },
 *   cost_usd: 0.001
 * }
 */

import { NextResponse } from 'next/server';
import { validateApiRequest, createApiResponse, createApiErrorResponse } from '@/lib/api-gateway.js';
import { calculateEmbeddingsCost } from '@/lib/api-pricing.js';
import { databases } from '@/services/appwrite-admin.js';
import { API_USAGE_LOGS_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';
import { ID } from 'node-appwrite';
import { deductApiCreditsWithLock } from '@/lib/api-credits.js';

const AVAILABLE_EMBEDDING_MODELS = ['text-embedding-3-small', 'text-embedding-3-large'];

/**
 * Generate embeddings using OpenAI API
 */
async function generateEmbeddings(texts, model) {
  const { OpenAI } = await import('openai');
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const client = new OpenAI({ apiKey });

  const response = await client.embeddings.create({
    model,
    input: texts,
  });

  return {
    embeddings: response.data,
    usage: {
      prompt_tokens: response.usage.prompt_tokens,
      total_tokens: response.usage.total_tokens,
    },
  };
}

/**
 * Log embeddings API usage
 */
async function logEmbeddingsUsage(userId, keyId, tokenCount, costUsd, status = 'success') {
  try {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      API_USAGE_LOGS_COLLECTION_ID,
      ID.unique(),
      {
        user_id: userId,
        key_id: keyId,
        endpoint: 'embeddings',
        model: 'text-embedding',
        input_tokens: tokenCount,
        cost_usd: costUsd,
        status,
        created_at: new Date().toISOString(),
        timestamp: Math.floor(Date.now() / 1000),
      }
    );
  } catch (error) {
    console.error('Error logging embeddings usage:', error);
  }
}

export async function POST(request) {
  const context = await validateApiRequest(request, 50);

  if (!context.valid) {
    return context.errorResponse;
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.input) {
      return createApiErrorResponse(
        'Missing required field: input',
        'validation_error',
        'invalid_request',
        400,
        context.context
      );
    }

    // Normalize input to array
    const inputs = Array.isArray(body.input) ? body.input : [body.input];

    // Validate inputs
    if (inputs.length === 0 || !inputs.every((item) => typeof item === 'string')) {
      return createApiErrorResponse(
        'input must be a non-empty string or array of strings',
        'validation_error',
        'invalid_request',
        400,
        context.context
      );
    }

    // Validate model
    const model = body.model || 'text-embedding-3-small';
    if (!AVAILABLE_EMBEDDING_MODELS.includes(model)) {
      return createApiErrorResponse(
        `Model not found: ${model}. Available models: ${AVAILABLE_EMBEDDING_MODELS.join(', ')}`,
        'invalid_request_error',
        'model_not_found',
        404,
        context.context
      );
    }

    // ── TEST environment: return deterministic mock embeddings ────────────────
    if (context.context.environment === 'test') {
      const DIM = model === 'text-embedding-3-large' ? 3072 : 1536;
      const mockEmbeddings = inputs.map((_, i) => ({
        object: 'embedding',
        embedding: Array.from({ length: DIM }, (__, j) => Math.sin(i * 100 + j) * 0.01),
        index: i,
      }));
      return createApiResponse({
        object: 'list',
        data: mockEmbeddings,
        model,
        usage: { prompt_tokens: 0, total_tokens: 0 },
        cost_usd: 0,
        test_mode: true,
      }, context.context, 200);
    }

    // Generate embeddings
    const embeddingsResult = await generateEmbeddings(inputs, model);

    // Calculate cost — allowNegative so overspend is captured, not silently granted
    const costUsd = calculateEmbeddingsCost(embeddingsResult.usage.prompt_tokens);

    const creditDeduction = await deductApiCreditsWithLock(context.context.userEmail, costUsd, {
      transactionType: 'usage',
      keyId: context.context.keyId,
      endpoint: 'embeddings',
      costUsd,
      allowNegative: true,
      meta: {
        model,
        tokenCount: embeddingsResult.usage.prompt_tokens,
      },
    });

    if (!creditDeduction.success) {
      return createApiErrorResponse(
        creditDeduction.error || 'Insufficient API credits.',
        'payment_required',
        'insufficient_api_credits',
        402,
        context.context
      );
    }

    // Log usage only after the API credit deduction succeeds.
    await logEmbeddingsUsage(
      context.context.userId,
      context.context.keyId,
      embeddingsResult.usage.prompt_tokens,
      costUsd
    );

    // Format response in OpenAI format
    const response = {
      object: 'list',
      data: embeddingsResult.embeddings.map((item) => ({
        object: 'embedding',
        embedding: item.embedding,
        index: item.index,
      })),
      model,
      usage: {
        prompt_tokens: embeddingsResult.usage.prompt_tokens,
        total_tokens: embeddingsResult.usage.total_tokens,
      },
      cost_usd: costUsd,
    };

    const apiResponse = createApiResponse(response, context.context, 200);
    apiResponse.headers.set('X-API-Credits-Remaining', String(creditDeduction.balance_credits ?? 0));
    return apiResponse;
  } catch (error) {
    console.error('Error in embeddings:', error);

    await logEmbeddingsUsage(
      context.context.userId,
      context.context.keyId,
      0,
      0,
      'error'
    ).catch(() => {});

    return createApiErrorResponse(
      error.message || 'Failed to generate embeddings',
      'server_error',
      'internal_error',
      500,
      context.context
    );
  }
}
