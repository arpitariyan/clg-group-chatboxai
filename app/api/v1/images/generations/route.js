/**
 * POST /api/v1/images/generations
 * ═══════════════════════════════════════════════════════════════
 * ChatboxAI API Gateway — Image generation endpoint.
 *
 * Supports text-to-image generation via Cloudflare Workers AI (Primary),
 * ModelScope (Secondary), and Hugging Face (Preserved).
 * Returns OpenAI-compatible image response format.
 *
 * Request body:
 *   model    – image model publicId (e.g. "chatboxai/image-flux-schnell")
 *   prompt   – text description of the image to generate
 *   n        – number of images (1–4, default: 1)
 *   size     – "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792" (default: "1024x1024")
 *   quality  – "standard" | "hd" (default: "standard")
 *   style    – "vivid" | "natural" (default: "vivid")
 *
 * Response (OpenAI-compatible):
 *   { created, data: [{ url?, b64_json?, revised_prompt? }], usage: { images_generated, cost_inr } }
 */

import { NextResponse } from 'next/server';
import { validateApiRequest, createApiErrorResponse } from '@/lib/api-gateway.js';
import { calculateImageCost } from '@/lib/api-pricing.js';
import { deductApiCreditsWithLock, addApiCreditsWithLock } from '@/lib/api-credits.js';
import { databases } from '@/services/appwrite-admin.js';
import { API_USAGE_LOGS_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';
import { ID } from 'node-appwrite';
import { generateImage } from '@/lib/image-providers/index.js';

// ── Supported image models ────────────────────────────────────────────────────
const IMAGE_MODELS = {
  'chatboxai/image-flux-schnell': {
    name: 'FLUX Schnell',
    provider: 'cloudflare',
    modelApi: '@cf/black-forest-labs/flux-1-schnell',
    isPrimary: true,
  },
  'chatboxai/image-qwen-2.1': {
    name: 'Qwen Image 2.1',
    provider: 'modelscope',
    modelApi: 'Qwen/Qwen-Image-2.1',
    isSecondary: true,
  },
  'chatboxai/image-flux-dev': {
    name: 'FLUX Dev',
    provider: 'huggingface',
    modelApi: 'black-forest-labs/FLUX.1-dev',
  },
  'chatboxai/image-stable-diffusion-3.5': {
    name: 'Stable Diffusion 3.5',
    provider: 'huggingface',
    modelApi: 'stabilityai/stable-diffusion-3.5-large',
  },
  'chatboxai/image-sdxl': {
    name: 'Stable Diffusion XL',
    provider: 'huggingface',
    modelApi: 'stabilityai/stable-diffusion-xl-base-1.0',
  },
};

// Default model: Cloudflare FLUX Schnell
const DEFAULT_IMAGE_MODEL = 'chatboxai/image-flux-schnell';

// ── Size mapping ──────────────────────────────────────────────────────────────
const SIZE_MAP = {
  '256x256':   { width: 256,  height: 256  },
  '512x512':   { width: 512,  height: 512  },
  '1024x1024': { width: 1024, height: 1024 },
  '1792x1024': { width: 1792, height: 1024 },
  '1024x1792': { width: 1024, height: 1792 },
};

// ── Usage logging ─────────────────────────────────────────────────────────────
async function logImageUsage(userId, keyId, model, provider, count, costUsd, status = 'success') {
  try {
    await databases.createDocument(APPWRITE_DATABASE_ID, API_USAGE_LOGS_COLLECTION_ID, ID.unique(), {
      user_id:       userId,
      key_id:        keyId,
      endpoint:      'images',
      model,
      input_tokens:  0,
      output_tokens: count,
      total_tokens:  count,
      cost_usd:      String(costUsd),
      status,
      meta:          JSON.stringify({ provider_used: provider }),
      created_at:    new Date().toISOString(),
      timestamp:     Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    console.error('[ChatboxAI] Failed to log image usage:', err);
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  let body;
  let context = null;
  try {
    body = await request.json();

    const { prompt, model: requestedModel, n = 1, size = '1024x1024', quality = 'standard', style = 'vivid' } = body;

    context = await validateApiRequest(request, 0, requestedModel || DEFAULT_IMAGE_MODEL);
    if (!context.valid) return context.errorResponse;

    // ── TEST environment: return mock response ─────────────────────────────────
    if (context.context.environment === 'test') {
      const imageCount = Math.min(Math.max(Math.floor(Number(n) || 1), 1), 4);
      const mockData = Array.from({ length: imageCount }, (_, i) => ({
        url: `https://placehold.co/${size.replace('x', '/')}?text=TEST+IMAGE+${i + 1}`,
        revised_prompt: String(prompt).slice(0, 100),
      }));
      return NextResponse.json({
        created: Math.floor(Date.now() / 1000),
        model: requestedModel || DEFAULT_IMAGE_MODEL,
        data: mockData,
        usage: { images_generated: imageCount, cost_inr: 0 },
        test_mode: true,
      }, { status: 200 });
    }

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return createApiErrorResponse('Missing required field: prompt (string)', 'validation_error', 'invalid_request', 400, context.context);
    }

    // Validate n
    const imageCount = Math.min(Math.max(Math.floor(Number(n) || 1), 1), 4);

    // Resolve model
    const modelId = requestedModel && IMAGE_MODELS[requestedModel] ? requestedModel : DEFAULT_IMAGE_MODEL;
    const modelConfig = IMAGE_MODELS[modelId];

    // Resolve dimensions
    const dimensions = SIZE_MAP[size] || SIZE_MAP['1024x1024'];
    const { width, height } = dimensions;

    // Build styled prompt
    const styledPrompt = style === 'natural'
      ? prompt
      : `${prompt}, vivid colors, high detail, professional photography`;

    // Calculate and pre-deduct credits
    const costUsd = calculateImageCost(imageCount);
    const creditDeduction = await deductApiCreditsWithLock(context.context.userEmail, costUsd, {
      transactionType: 'usage',
      keyId: context.context.keyId,
      endpoint: 'images',
      costUsd,
      meta: { model: modelId, provider: modelConfig.provider, count: imageCount },
    });

    if (!creditDeduction.success) {
      return createApiErrorResponse(
        creditDeduction.error || 'Insufficient API credits.',
        'payment_required', 'insufficient_api_credits', 402, context.context,
      );
    }

    // Generate images with partial success accounting
    const generatedImages = [];
    let providerUsed = modelConfig.provider;
    let lastError = null;

    for (let i = 0; i < imageCount; i++) {
      try {
        const result = await generateImage({
          prompt: styledPrompt,
          provider: modelConfig.provider,
          model: modelConfig.modelApi,
          width,
          height,
          aspectRatio: `${width}x${height}`,
          processingMode: 'crop_to_fill',
        });

        providerUsed = result.provider;
        const b64Json = result.buffer ? result.buffer.toString('base64') : null;

        generatedImages.push({
          ...(b64Json ? { b64_json: b64Json } : {}),
          revised_prompt: styledPrompt,
        });
      } catch (err) {
        console.error(`[ChatboxAI] Image generation error for image ${i + 1}/${imageCount}:`, err.message);
        lastError = err;
        // Break out of loop to calculate partial refund
        break;
      }
    }

    const succeededCount = generatedImages.length;
    const failedCount = imageCount - succeededCount;

    // Handle complete failure: refund 100% of deducted credits
    if (succeededCount === 0) {
      await addApiCreditsWithLock(context.context.userEmail, costUsd, {
        transactionType: 'refund',
        keyId: context.context.keyId,
        endpoint: 'images',
        costUsd,
        meta: { reason: 'All images failed', error: lastError?.message || 'Unknown error' },
      });

      logImageUsage(context.context.userId, context.context.keyId, modelId, providerUsed, 0, 0, 'error');

      return createApiErrorResponse(
        lastError?.message || 'Image generation failed.',
        'server_error',
        'internal_error',
        500,
        context.context,
      );
    }

    // Handle partial success: refund the failed fraction accurately
    let billedCostUsd = costUsd;
    if (failedCount > 0) {
      const perImageCost = costUsd / imageCount;
      const refundUsd = Number((perImageCost * failedCount).toFixed(6));
      billedCostUsd = Number((costUsd - refundUsd).toFixed(6));

      await addApiCreditsWithLock(context.context.userEmail, refundUsd, {
        transactionType: 'refund',
        keyId: context.context.keyId,
        endpoint: 'images',
        costUsd: refundUsd,
        meta: {
          reason: 'Partial failure refund',
          requested: imageCount,
          succeeded: succeededCount,
          failed: failedCount,
          error: lastError?.message,
        },
      });

      logImageUsage(
        context.context.userId,
        context.context.keyId,
        modelId,
        providerUsed,
        succeededCount,
        billedCostUsd,
        'partial_success',
      );
    } else {
      // Complete success: log full usage
      logImageUsage(context.context.userId, context.context.keyId, modelId, providerUsed, imageCount, costUsd, 'success');
    }

    const response = NextResponse.json({
      created: Math.floor(Date.now() / 1000),
      model: modelId,
      data: generatedImages,
      usage: {
        images_generated: succeededCount,
        images_requested: imageCount,
        cost_inr: billedCostUsd,
      },
    }, { status: 200 });

    const remainingCredits = creditDeduction.balance_credits !== undefined
      ? Number(creditDeduction.balance_credits) + (failedCount > 0 ? (costUsd / imageCount) * failedCount : 0)
      : 0;

    response.headers.set('X-API-Credits-Remaining', String(remainingCredits));
    return response;

  } catch (err) {
    console.error('[ChatboxAI] /api/v1/images/generations error:', err);
    if (body && context?.context) {
      logImageUsage(context.context.userId, context.context.keyId, body.model || DEFAULT_IMAGE_MODEL, 'unknown', 0, 0, 'error');
    }
    return createApiErrorResponse(err.message || 'Image generation failed.', 'server_error', 'internal_error', 500, context.context);
  }
}

// ── GET — list available image models ────────────────────────────────────────
export async function GET(request) {
  const context = await validateApiRequest(request, 0);
  if (!context.valid) return context.errorResponse;

  return NextResponse.json({
    object: 'list',
    data: Object.entries(IMAGE_MODELS).map(([id, config]) => ({
      id,
      object: 'model',
      name: config.name,
      owned_by: 'chatboxai',
      type: 'image',
      provider: config.provider,
      primary: Boolean(config.isPrimary),
      secondary: Boolean(config.isSecondary),
    })),
  });
}
