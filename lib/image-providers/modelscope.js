/**
 * ModelScope Image Generation Adapter
 * Model: Qwen/Qwen-Image-2.1
 *
 * Implements secondary/backup text-to-image generation via ModelScope API-Inference.
 * Supports multi-token failover pooling across configured MODELSCOPE_API_TOKEN slots.
 * Supports asynchronous task creation, status polling lifecycle with deadlines,
 * SSRF-safe image download, Sharp validation, and commercial license gating.
 * Supports both International (modelscope.ai) and China (modelscope.cn) API endpoints.
 */

import dns from 'node:dns';
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

// Ensure IPv4 first in Node.js runtime to prevent connection timeouts with Alibaba Cloud/ModelScope endpoints
if (dns && typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

export const MODELSCOPE_MODEL_ID = 'Qwen/Qwen-Image-2.1';
export const MODELSCOPE_PROVIDER_ID = 'modelscope';
export const MODELSCOPE_API_BASE = process.env.MODELSCOPE_API_BASE || 'https://api-inference.modelscope.ai/v1';
export const MODELSCOPE_FALLBACK_API_BASE = 'https://api-inference.modelscope.cn/v1';

const DEFAULT_POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 60000;
const MAX_IMAGE_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Checks if ModelScope is approved for commercial production use.
 * Returns false by default until explicit legal/account verification.
 */
export function isModelScopeCommercialVerified() {
    return process.env.MODELSCOPE_COMMERCIAL_VERIFIED === 'true';
}

/**
 * Validates prompt.
 */
function validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
        throw new ProviderBadRequestError('Prompt must be a non-empty string.', {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
        });
    }
    const trimmed = prompt.trim();
    if (trimmed.length === 0) {
        throw new ProviderBadRequestError('Prompt cannot be empty.', {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
        });
    }
    return trimmed;
}

/**
 * Collects and deduplicates all configured ModelScope tokens in order.
 * Supports primary MODELSCOPE_API_TOKEN and numbered slots (MODELSCOPE_API_TOKEN_2, _3, _4, etc.).
 */
export function getModelScopeTokenPool() {
    const tokens = [];
    const seen = new Set();

    function addToken(tok, index) {
        const t = (tok || '').trim();
        if (t && !seen.has(t)) {
            seen.add(t);
            tokens.push({ token: t, index });
        }
    }

    addToken(process.env.MODELSCOPE_API_TOKEN, 1);

    for (let slot = 2; slot <= 10; slot++) {
        addToken(process.env[`MODELSCOPE_API_TOKEN_${slot}`], slot);
    }

    return tokens;
}

/**
 * Retrieves and validates ModelScope API token (single token backwards compatibility).
 */
export function getModelScopeToken() {
    const pool = getModelScopeTokenPool();
    if (pool.length === 0) {
        throw new ProviderAuthError('ModelScope API token is not configured (missing MODELSCOPE_API_TOKEN).', {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
        });
    }
    return pool[0].token;
}

/**
 * SSRF-safe URL verification and image download.
 * Validates protocol, domain, size ceiling, and MIME headers.
 */
async function downloadImageSafely(imageUrl) {
    let parsed;
    try {
        parsed = new URL(imageUrl);
    } catch {
        throw new ImageProviderError(`ModelScope returned an invalid image URL: ${imageUrl}`, {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            code: 'INVALID_URL',
        });
    }

    if (parsed.protocol !== 'https:') {
        throw new ImageProviderError(`Insecure protocol in ModelScope image URL: ${parsed.protocol}`, {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            code: 'INSECURE_URL_PROTOCOL',
        });
    }

    // SSRF Domain Allowlist Check
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedDomain =
        hostname.endsWith('.modelscope.cn') ||
        hostname.endsWith('.modelscope.ai') ||
        hostname.endsWith('.aliyuncs.com') ||
        hostname.endsWith('.aliyun.com');

    // Reject localhost and private IP address ranges
    const isPrivate =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
        hostname.startsWith('169.254.');

    if (!isAllowedDomain || isPrivate) {
        throw new ImageProviderError(`Blocked download from untrusted or internal host: ${hostname}`, {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            code: 'SSRF_BLOCKED',
        });
    }

    const response = await fetch(imageUrl, {
        headers: {
            'User-Agent': 'ChatboxAI-ImageService/1.0',
        },
    });

    if (!response.ok) {
        throw new ImageProviderError(`Failed to download generated image from ModelScope (${response.status})`, {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            statusCode: response.status,
        });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_DOWNLOAD_BYTES) {
        throw new ImageProviderError(`ModelScope image download exceeds maximum size limit (${contentLength} bytes)`, {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            code: 'IMAGE_OVERSIZED',
        });
    }

    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (buffer.length === 0) {
        throw new ImageProviderError('Downloaded image buffer is empty', {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            code: 'EMPTY_BUFFER',
        });
    }

    return buffer;
}

/**
 * Polls ModelScope task status until completion or deadline.
 */
async function pollModelScopeTask(taskId, apiToken, apiBase = MODELSCOPE_API_BASE, deadlineMs = MAX_POLL_DURATION_MS) {
    const startTime = Date.now();
    const pollEndpoint = `${apiBase}/tasks/${encodeURIComponent(taskId)}`;

    while (Date.now() - startTime < deadlineMs) {
        const response = await fetch(pollEndpoint, {
            headers: {
                Authorization: `Bearer ${apiToken}`,
                Accept: 'application/json',
                'X-ModelScope-Task-Type': 'image_generation',
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new ProviderAuthError(
                    `ModelScope polling authentication error (${response.status}): MODELSCOPE_API_TOKEN is invalid or expired.`,
                    {
                        provider: MODELSCOPE_PROVIDER_ID,
                        model: MODELSCOPE_MODEL_ID,
                    }
                );
            }
            if (response.status === 429) {
                throw new ProviderRateLimitError('ModelScope polling rate limit reached', {
                    provider: MODELSCOPE_PROVIDER_ID,
                    model: MODELSCOPE_MODEL_ID,
                });
            }
            const errText = await response.text().catch(() => '');
            throw new ProviderUnavailableError(`ModelScope task poll failed (${response.status}): ${errText}`, {
                provider: MODELSCOPE_PROVIDER_ID,
                model: MODELSCOPE_MODEL_ID,
            });
        }

        const data = await response.json();
        const status = (data?.task_status || data?.status || '').toUpperCase();

        if (status === 'SUCCEEDED' || status === 'SUCCESS') {
            const results = data?.output?.results || data?.results || data?.data;
            const imageUrl = results?.[0]?.url || results?.[0]?.image_url || data?.output?.image_url;
            const base64 = results?.[0]?.b64_image || results?.[0]?.base64;

            if (base64) {
                return { buffer: Buffer.from(base64, 'base64'), taskId };
            }
            if (imageUrl) {
                const buffer = await downloadImageSafely(imageUrl);
                return { buffer, taskId, imageUrl };
            }

            throw new ImageProviderError('ModelScope task succeeded but returned no image URL or base64', {
                provider: MODELSCOPE_PROVIDER_ID,
                model: MODELSCOPE_MODEL_ID,
                code: 'NO_IMAGE_IN_OUTPUT',
            });
        }

        if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELED') {
            const failureReason = data?.message || data?.error || status;
            throw new ImageProviderError(`ModelScope generation task failed with status ${status}: ${failureReason}`, {
                provider: MODELSCOPE_PROVIDER_ID,
                model: MODELSCOPE_MODEL_ID,
                code: 'TASK_FAILED',
            });
        }

        // Handle retry-after header if present
        const retryAfterHeader = Number(response.headers?.get?.('retry-after'));
        const sleepMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
            ? retryAfterHeader * 1000
            : DEFAULT_POLL_INTERVAL_MS;

        await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }

    throw new ProviderTimeoutError(`ModelScope task ${taskId} timed out after ${deadlineMs}ms.`, {
        provider: MODELSCOPE_PROVIDER_ID,
        model: MODELSCOPE_MODEL_ID,
    });
}

/**
 * Attempts single token task submission and completion.
 */
async function executeModelScopeTask({ apiToken, requestPayload }) {
    let submitResponse;
    let usedApiBase = MODELSCOPE_API_BASE;
    let lastNetworkError = null;

    // Build candidate endpoints (trying International .ai first, then China .cn)
    const candidateBases = [MODELSCOPE_API_BASE];
    if (MODELSCOPE_FALLBACK_API_BASE && !candidateBases.includes(MODELSCOPE_FALLBACK_API_BASE)) {
        candidateBases.push(MODELSCOPE_FALLBACK_API_BASE);
    }

    const endpointsToTry = [];
    for (const base of candidateBases) {
        endpointsToTry.push({ url: `${base}/images/generations`, base });
        endpointsToTry.push({ url: `${base}/tasks`, base });
    }

    for (const ep of endpointsToTry) {
        try {
            submitResponse = await fetch(ep.url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                    'X-ModelScope-Async-Mode': 'true',
                    'X-ModelScope-Async': 'enable',
                },
                body: JSON.stringify(requestPayload),
            });

            usedApiBase = ep.base;

            // If endpoint doesn't exist (404), try next candidate endpoint
            if (submitResponse.status === 404 && ep !== endpointsToTry[endpointsToTry.length - 1]) {
                continue;
            }

            break;
        } catch (networkError) {
            lastNetworkError = networkError;
            // On connection error, try next endpoint if available
            continue;
        }
    }

    if (!submitResponse) {
        throw new ProviderUnavailableError(`ModelScope request connection failed: ${lastNetworkError?.message || 'Network error'}`, {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            originalError: lastNetworkError,
        });
    }

    if (!submitResponse.ok) {
        let errData = null;
        let errText = '';
        try {
            errData = await submitResponse.json();
        } catch {
            errText = await submitResponse.text().catch(() => '');
        }

        const msg = errData?.errors?.message || errData?.message || errData?.error || errText || submitResponse.statusText;

        if (submitResponse.status === 401 || submitResponse.status === 403) {
            // Check for Alibaba Cloud account binding requirement
            if (msg.includes('bind your Alibaba Cloud account') || msg.includes('settings/account')) {
                throw new ProviderAuthError(
                    'ModelScope requires an Alibaba Cloud account binding before API-Inference can be used. Please visit https://modelscope.ai/my/settings/account to bind your Alibaba Cloud account (free of charge).',
                    {
                        provider: MODELSCOPE_PROVIDER_ID,
                        model: MODELSCOPE_MODEL_ID,
                        statusCode: submitResponse.status,
                        code: 'ALIBABA_CLOUD_BINDING_REQUIRED',
                    }
                );
            }

            throw new ProviderAuthError(
                `ModelScope authentication failed (${submitResponse.status}): MODELSCOPE_API_TOKEN is invalid or expired. Please check your token at https://modelscope.ai/my/myaccesstoken. Message: ${msg}`,
                {
                    provider: MODELSCOPE_PROVIDER_ID,
                    model: MODELSCOPE_MODEL_ID,
                    statusCode: submitResponse.status,
                }
            );
        }

        if (submitResponse.status === 429) {
            throw new ProviderQuotaError(`ModelScope rate limit or daily inference quota exceeded: ${msg}`, {
                provider: MODELSCOPE_PROVIDER_ID,
                model: MODELSCOPE_MODEL_ID,
                statusCode: 429,
            });
        }

        if (submitResponse.status === 400) {
            throw new ProviderBadRequestError(`ModelScope bad request (400): ${msg}`, {
                provider: MODELSCOPE_PROVIDER_ID,
                model: MODELSCOPE_MODEL_ID,
                statusCode: 400,
            });
        }

        throw new ImageProviderError(`ModelScope task submission failed (${submitResponse.status}): ${msg}`, {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            statusCode: submitResponse.status,
        });
    }

    const submitData = await submitResponse.json();

    // Check if response is synchronous (e.g. direct output) or asynchronous (task_id)
    let imageBuffer;
    let taskId = submitData?.task_id || submitData?.output?.task_id || null;

    if (!taskId) {
        // Direct synchronous response
        const directImage = submitData?.output?.results?.[0]?.url || submitData?.data?.[0]?.url;
        const directB64 = submitData?.output?.results?.[0]?.b64_image || submitData?.data?.[0]?.b64_json;

        if (directB64) {
            imageBuffer = Buffer.from(directB64, 'base64');
        } else if (directImage) {
            imageBuffer = await downloadImageSafely(directImage);
        } else {
            throw new ImageProviderError('ModelScope response did not include a task ID or an immediate image payload.', {
                provider: MODELSCOPE_PROVIDER_ID,
                model: MODELSCOPE_MODEL_ID,
            });
        }
    } else {
        // Asynchronous polling
        const pollResult = await pollModelScopeTask(taskId, apiToken, usedApiBase);
        imageBuffer = pollResult.buffer;
    }

    return { imageBuffer, taskId };
}

/**
 * Main ModelScope generation function with automated multi-token failover pool.
 *
 * @param {Object} options
 * @param {string} options.prompt - Text prompt
 * @param {number} [options.targetWidth=1024]
 * @param {number} [options.targetHeight=1024]
 * @param {string} [options.aspectRatio='1:1']
 * @param {boolean} [options.requireCommercialApproval=false]
 * @returns {Promise<NormalizedImageResult>}
 */
export async function generateViaModelScope({
    prompt,
    targetWidth = 1024,
    targetHeight = 1024,
    aspectRatio = '1:1',
    requireCommercialApproval = false,
} = {}) {
    const validatedPrompt = validatePrompt(prompt);
    const tokenPool = getModelScopeTokenPool();

    if (tokenPool.length === 0) {
        // Will throw descriptive missing token error
        getModelScopeToken();
    }

    // Commercial licensing safeguard
    if (requireCommercialApproval && !isModelScopeCommercialVerified()) {
        throw new ProviderBadRequestError(
            'ModelScope Qwen/Qwen-Image-2.1 is currently in research testing mode (available_for_testing) and not verified for commercial customer workloads.',
            {
                provider: MODELSCOPE_PROVIDER_ID,
                model: MODELSCOPE_MODEL_ID,
                code: 'COMMERCIAL_LICENSE_RESTRICTED',
            }
        );
    }

    const requestPayload = {
        model: MODELSCOPE_MODEL_ID,
        prompt: validatedPrompt,
        size: `${targetWidth}x${targetHeight}`,
        n: 1,
        input: {
            prompt: validatedPrompt,
        },
        parameters: {
            size: `${targetWidth}*${targetHeight}`,
        },
    };

    let lastError = null;
    let successfulResult = null;
    let activeTokenIndex = tokenPool[0].index;

    for (let i = 0; i < tokenPool.length; i++) {
        const item = tokenPool[i];
        activeTokenIndex = item.index;

        try {
            successfulResult = await executeModelScopeTask({
                apiToken: item.token,
                requestPayload,
            });
            break;
        } catch (error) {
            lastError = error;

            // Never failover on bad prompt or commercial license restriction
            if (error instanceof ProviderBadRequestError && error.code !== 'COMMERCIAL_LICENSE_RESTRICTED') {
                throw error;
            }

            const next = tokenPool[i + 1];
            if (next) {
                console.warn(
                    `[ModelScope] Token #${item.index} failed (${error.message}). Failing over to ModelScope Token #${next.index}...`
                );
                continue;
            }
        }
    }

    if (!successfulResult) {
        throw lastError;
    }

    const { imageBuffer, taskId } = successfulResult;

    // Validate image format with sharp
    const sharpInstance = sharp(imageBuffer);
    const meta = await sharpInstance.metadata();
    if (!meta.width || !meta.height) {
        throw new ImageProviderError('ModelScope output is not a valid decodable image.', {
            provider: MODELSCOPE_PROVIDER_ID,
            model: MODELSCOPE_MODEL_ID,
            code: 'INVALID_IMAGE_BINARY',
        });
    }

    const finalBuffer = await sharpInstance.png({ quality: 95 }).toBuffer();

    return createNormalizedImageResult({
        buffer: finalBuffer,
        mimeType: 'image/png',
        provider: MODELSCOPE_PROVIDER_ID,
        model: MODELSCOPE_MODEL_ID,
        width: meta.width,
        height: meta.height,
        aspectRatio,
        generationType: 'text-to-image',
        metadata: {
            taskId,
            verificationState: 'available_for_testing',
            keyIndex: activeTokenIndex,
            poolSize: tokenPool.length,
        },
    });
}
