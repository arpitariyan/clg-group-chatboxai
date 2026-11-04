/**
 * Cloudflare Workers AI Image Generation Adapter
 * Model: @cf/black-forest-labs/flux-1-schnell
 *
 * Implements primary text-to-image generation via Cloudflare Workers AI.
 * Supports multi-key credential pooling with automated sequential failover.
 * Handles authentication, step bounding (1-8, default 4), Base64 decoding,
 * strict image validation, and deterministic Sharp aspect-ratio adaptation.
 */

import sharp from 'sharp';
import {
    ProviderAuthError,
    ProviderQuotaError,
    ProviderRateLimitError,
    ProviderBadRequestError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    ImageProviderError,
} from './provider-errors.js';
import { createNormalizedImageResult } from './normalize-image-result.js';

export const CLOUDFLARE_MODEL_ID = '@cf/black-forest-labs/flux-1-schnell';
export const CLOUDFLARE_PROVIDER_ID = 'cloudflare';
export const CLOUDFLARE_DEFAULT_STEPS = 4;
export const CLOUDFLARE_MAX_STEPS = 8;
export const CLOUDFLARE_MIN_STEPS = 1;
const DEFAULT_TIMEOUT_MS = 45000;
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB ceiling

/**
 * Validates and normalizes prompt string.
 */
function validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
        throw new ProviderBadRequestError('Prompt must be a non-empty string.', {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
        });
    }
    const trimmed = prompt.trim();
    if (trimmed.length === 0) {
        throw new ProviderBadRequestError('Prompt cannot be empty.', {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
        });
    }
    return trimmed;
}

/**
 * Collects and deduplicates all configured Cloudflare credential pairs in order.
 * Supports primary (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CF_ACCOUNT_ID, CF_API_TOKEN)
 * and numbered slots (CLOUDFLARE_ACCOUNT_ID_2, CLOUDFLARE_API_TOKEN_2, etc.).
 */
export function getCloudflareCredentialPool() {
    const pairs = [];
    const seen = new Set();

    function addPair(accountId, apiToken, index) {
        const a = (accountId || '').trim();
        const t = (apiToken || '').trim();
        if (a && t) {
            const key = `${a}:::${t}`;
            if (!seen.has(key)) {
                seen.add(key);
                pairs.push({ accountId: a, apiToken: t, index });
            }
        }
    }

    // Slot 1 (Primary):
    addPair(
        process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID,
        process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN,
        1
    );

    // Numbered slots: 2 to 10
    for (let slot = 2; slot <= 10; slot++) {
        addPair(
            process.env[`CLOUDFLARE_ACCOUNT_ID_${slot}`] || process.env[`CF_ACCOUNT_ID_${slot}`],
            process.env[`CLOUDFLARE_API_TOKEN_${slot}`] || process.env[`CF_API_TOKEN_${slot}`],
            slot
        );
    }

    return pairs;
}

/**
 * Extracts and validates Cloudflare credentials (single pair backwards compatibility).
 */
export function getCloudflareCredentials() {
    const pool = getCloudflareCredentialPool();
    if (pool.length === 0) {
        const hasAcct = Boolean((process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '').trim());
        if (!hasAcct) {
            throw new ProviderAuthError('Cloudflare Account ID is not configured (missing CLOUDFLARE_ACCOUNT_ID or CF_ACCOUNT_ID).', {
                provider: CLOUDFLARE_PROVIDER_ID,
                model: CLOUDFLARE_MODEL_ID,
            });
        }
        throw new ProviderAuthError('Cloudflare API Token is not configured (missing CLOUDFLARE_API_TOKEN or CF_API_TOKEN).', {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
        });
    }
    return pool[0];
}

/**
 * Safely decodes base64 string to Buffer and validates integrity.
 */
function decodeBase64Image(base64Str) {
    if (!base64Str || typeof base64Str !== 'string') {
        throw new ImageProviderError('Cloudflare returned an invalid or empty image payload.', {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
            code: 'INVALID_PAYLOAD',
        });
    }

    let clean = base64Str.trim();
    if (clean.includes(',')) {
        clean = clean.split(',')[1] || clean;
    }

    const buffer = Buffer.from(clean, 'base64');
    if (buffer.length === 0) {
        throw new ImageProviderError('Decoded image buffer is empty.', {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
            code: 'EMPTY_BUFFER',
        });
    }

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new ImageProviderError(`Decoded image exceeds maximum size limit (${buffer.length} bytes).`, {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
            code: 'IMAGE_OVERSIZED',
        });
    }

    return buffer;
}

/**
 * Applies deterministic Sharp aspect-ratio transformation.
 * Cloudflare FLUX Schnell generates square 1024x1024 images.
 * Modes supported:
 *  - 'crop_to_fill': Center crop to exact aspect ratio (default visually pleasant)
 *  - 'contain_pad': Contain with letterboxing to prevent any content loss
 */
export async function applyAspectRatioProcessing(rawBuffer, targetWidth, targetHeight, mode = 'crop_to_fill') {
    const meta = await sharp(rawBuffer).metadata();
    const srcWidth = meta.width || 1024;
    const srcHeight = meta.height || 1024;

    // If already matching target dimensions, convert to clean PNG
    if (srcWidth === targetWidth && srcHeight === targetHeight) {
        const cleanBuffer = await sharp(rawBuffer).png({ quality: 95 }).toBuffer();
        return {
            buffer: cleanBuffer,
            width: targetWidth,
            height: targetHeight,
            processingMode: 'native',
        };
    }

    let transformer = sharp(rawBuffer);

    if (mode === 'contain_pad') {
        transformer = transformer.resize(targetWidth, targetHeight, {
            fit: 'contain',
            background: { r: 15, g: 17, b: 23, alpha: 1 }, // Subtle neutral dark backdrop
        });
    } else {
        // Default: crop_to_fill (centered cover)
        transformer = transformer.resize(targetWidth, targetHeight, {
            fit: 'cover',
            position: sharp.strategy.attention || 'centre',
        });
    }

    const processedBuffer = await transformer.png({ quality: 95 }).toBuffer();
    return {
        buffer: processedBuffer,
        width: targetWidth,
        height: targetHeight,
        processingMode: mode,
    };
}

/**
 * Executes a single Cloudflare Workers AI HTTP request.
 */
async function executeCloudflareRequest({ accountId, apiToken, requestBody, timeoutMs }) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_MODEL_ID}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
    } catch (networkError) {
        clearTimeout(timeoutId);
        if (networkError.name === 'AbortError') {
            throw new ProviderTimeoutError(`Cloudflare Workers AI timed out after ${timeoutMs}ms.`, {
                provider: CLOUDFLARE_PROVIDER_ID,
                model: CLOUDFLARE_MODEL_ID,
                originalError: networkError,
            });
        }
        throw new ProviderUnavailableError(`Cloudflare connection failed: ${networkError.message}`, {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
            originalError: networkError,
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        let errorPayload = null;
        let errorText = '';
        try {
            const contentType = response.headers?.get?.('content-type') || '';
            if (contentType.includes('application/json')) {
                errorPayload = await response.json();
            } else {
                errorText = await response.text();
            }
        } catch {
            // Ignore parse errors on failure body
        }

        const rawMsg = errorPayload?.errors?.[0]?.message || errorPayload?.message || errorText || response.statusText;
        const errorCode = errorPayload?.errors?.[0]?.code;

        if (response.status === 401 || response.status === 403 || errorCode === 10000) {
            throw new ProviderAuthError(`Cloudflare authentication failed (${response.status}): ${rawMsg}`, {
                provider: CLOUDFLARE_PROVIDER_ID,
                model: CLOUDFLARE_MODEL_ID,
                statusCode: response.status,
            });
        }

        if (response.status === 429) {
            throw new ProviderQuotaError(`Cloudflare rate limit or quota exceeded (429): ${rawMsg}`, {
                provider: CLOUDFLARE_PROVIDER_ID,
                model: CLOUDFLARE_MODEL_ID,
                statusCode: 429,
            });
        }

        if (response.status === 400) {
            throw new ProviderBadRequestError(`Cloudflare rejected request (400): ${rawMsg}`, {
                provider: CLOUDFLARE_PROVIDER_ID,
                model: CLOUDFLARE_MODEL_ID,
                statusCode: 400,
            });
        }

        if (response.status >= 500) {
            throw new ProviderUnavailableError(`Cloudflare server error (${response.status}): ${rawMsg}`, {
                provider: CLOUDFLARE_PROVIDER_ID,
                model: CLOUDFLARE_MODEL_ID,
                statusCode: response.status,
            });
        }

        throw new ImageProviderError(`Cloudflare image generation failed (${response.status}): ${rawMsg}`, {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
            statusCode: response.status,
        });
    }

    // Handle successful response
    let rawImageBuffer = null;
    const contentType = response.headers?.get?.('content-type') || '';

    if (contentType.includes('application/json')) {
        const json = await response.json();

        if (json.success === false) {
            const msg = json.errors?.[0]?.message || 'Cloudflare indicated failure in JSON payload';
            throw new ImageProviderError(`Cloudflare generation unsuccessful: ${msg}`, {
                provider: CLOUDFLARE_PROVIDER_ID,
                model: CLOUDFLARE_MODEL_ID,
            });
        }

        const b64 = json?.result?.image || json?.image;
        if (!b64) {
            throw new ImageProviderError('Cloudflare returned success but missing result.image in response.', {
                provider: CLOUDFLARE_PROVIDER_ID,
                model: CLOUDFLARE_MODEL_ID,
            });
        }
        rawImageBuffer = decodeBase64Image(b64);
    } else if (contentType.includes('image/')) {
        const arrayBuf = await response.arrayBuffer();
        rawImageBuffer = Buffer.from(arrayBuf);
    } else {
        const textPayload = await response.text();
        rawImageBuffer = decodeBase64Image(textPayload);
    }

    return rawImageBuffer;
}

/**
 * Main Cloudflare generation function with automated multi-key failover pool.
 *
 * @param {Object} options
 * @param {string} options.prompt - Text prompt
 * @param {number} [options.steps=4] - Steps (1-8)
 * @param {number} [options.seed] - Optional integer seed
 * @param {number} [options.targetWidth=1024] - Desired output width
 * @param {number} [options.targetHeight=1024] - Desired output height
 * @param {string} [options.aspectRatio='1:1'] - Aspect ratio label
 * @param {'crop_to_fill'|'contain_pad'} [options.processingMode='crop_to_fill'] - Aspect ratio processing mode
 * @param {number} [options.timeoutMs=45000] - Request timeout
 * @returns {Promise<NormalizedImageResult>}
 */
export async function generateViaCloudflare({
    prompt,
    steps = CLOUDFLARE_DEFAULT_STEPS,
    seed,
    targetWidth = 1024,
    targetHeight = 1024,
    aspectRatio = '1:1',
    processingMode = 'crop_to_fill',
    timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
    const validatedPrompt = validatePrompt(prompt);
    const pool = getCloudflareCredentialPool();

    if (pool.length === 0) {
        // Will throw descriptive missing credentials error
        getCloudflareCredentials();
    }

    // Bound steps strictly between 1 and 8 (Cloudflare FLUX Schnell limit)
    const boundedSteps = Math.min(Math.max(Math.floor(Number(steps) || CLOUDFLARE_DEFAULT_STEPS), CLOUDFLARE_MIN_STEPS), CLOUDFLARE_MAX_STEPS);

    const requestBody = {
        prompt: validatedPrompt,
        steps: boundedSteps,
    };

    if (seed !== undefined && seed !== null && Number.isInteger(Number(seed))) {
        requestBody.seed = Number(seed);
    }

    let lastError = null;
    let successfulBuffer = null;
    let activeKeyIndex = pool[0].index;

    for (let i = 0; i < pool.length; i++) {
        const cred = pool[i];
        activeKeyIndex = cred.index;

        try {
            successfulBuffer = await executeCloudflareRequest({
                accountId: cred.accountId,
                apiToken: cred.apiToken,
                requestBody,
                timeoutMs,
            });
            break;
        } catch (error) {
            lastError = error;

            // Never failover on client-side bad prompt or content moderation errors
            if (error instanceof ProviderBadRequestError) {
                throw error;
            }

            const next = pool[i + 1];
            if (next) {
                console.warn(
                    `[Cloudflare] Key #${cred.index} failed (${error.message}). Failing over to Cloudflare Key #${next.index}...`
                );
                continue;
            }
        }
    }

    if (!successfulBuffer) {
        throw lastError;
    }

    // Validate image format with sharp
    let imageMetadata;
    try {
        imageMetadata = await sharp(successfulBuffer).metadata();
        if (!imageMetadata.width || !imageMetadata.height) {
            throw new Error('Image metadata missing width or height.');
        }
    } catch (sharpValErr) {
        throw new ImageProviderError(`Cloudflare output is not a valid decodable image: ${sharpValErr.message}`, {
            provider: CLOUDFLARE_PROVIDER_ID,
            model: CLOUDFLARE_MODEL_ID,
            code: 'INVALID_IMAGE_BINARY',
        });
    }

    // Process aspect ratio
    const { buffer: processedBuffer, width: finalWidth, height: finalHeight, processingMode: appliedMode } =
        await applyAspectRatioProcessing(successfulBuffer, Number(targetWidth) || 1024, Number(targetHeight) || 1024, processingMode);

    return createNormalizedImageResult({
        buffer: processedBuffer,
        mimeType: 'image/png',
        provider: CLOUDFLARE_PROVIDER_ID,
        model: CLOUDFLARE_MODEL_ID,
        width: finalWidth,
        height: finalHeight,
        aspectRatio,
        generationType: 'text-to-image',
        metadata: {
            steps: boundedSteps,
            seed: requestBody.seed || null,
            processingMode: appliedMode,
            nativeWidth: imageMetadata.width,
            nativeHeight: imageMetadata.height,
            keyIndex: activeKeyIndex,
            poolSize: pool.length,
        },
    });
}
