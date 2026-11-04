/**
 * Unified Image Provider Orchestrator
 * Connects Cloudflare Workers AI (Primary), ModelScope (Secondary), and Hugging Face (Preserved).
 * Implements deterministic execution, controlled fallback, and structured error reporting.
 */

import { generateViaCloudflare, CLOUDFLARE_MODEL_ID, CLOUDFLARE_PROVIDER_ID } from './cloudflare.js';
import { generateViaModelScope, MODELSCOPE_MODEL_ID, MODELSCOPE_PROVIDER_ID, isModelScopeCommercialVerified } from './modelscope.js';
import { generateViaHuggingFace, HF_PROVIDER_ID } from './huggingface.js';
import {
    ImageProviderError,
    ProviderAuthError,
    ProviderBadRequestError,
    ProviderContentPolicyError,
    ProviderQuotaError,
    ProviderTimeoutError,
    ProviderUnavailableError,
} from './provider-errors.js';

export {
    CLOUDFLARE_MODEL_ID,
    CLOUDFLARE_PROVIDER_ID,
    MODELSCOPE_MODEL_ID,
    MODELSCOPE_PROVIDER_ID,
    HF_PROVIDER_ID,
};

/**
 * Checks if an error is eligible for automated provider fallback.
 * Strictly permits fallback ONLY on quota exhaustion, temporary server outage,
 * or secondary provider configuration/binding requirements.
 */
function isErrorEligibleForFallback(error) {
    if (!error) return false;

    // Never fallback on client validation or content moderation
    if (
        error instanceof ProviderBadRequestError ||
        error instanceof ProviderContentPolicyError
    ) {
        return false;
    }

    // Explicitly allow fallback when ModelScope requires account binding
    if (error.code === 'ALIBABA_CLOUD_BINDING_REQUIRED') {
        return true;
    }

    // ModelScope auth error or binding requirement allows fallback to primary Cloudflare
    if (error instanceof ProviderAuthError && error.provider === MODELSCOPE_PROVIDER_ID) {
        return true;
    }

    // Do not fallback on general auth errors for other providers
    if (error instanceof ProviderAuthError) {
        return false;
    }

    // Explicitly allow fallback on quota exhaustion, rate limit, timeout, or upstream failure
    if (
        error instanceof ProviderQuotaError ||
        error instanceof ProviderTimeoutError ||
        error instanceof ProviderUnavailableError
    ) {
        return true;
    }

    const message = String(error.message || '').toLowerCase();
    if (message.includes('content policy') || message.includes('nsfw') || message.includes('safety')) {
        return false;
    }

    return (
        message.includes('quota') ||
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('503') ||
        message.includes('504') ||
        message.includes('timed out') ||
        message.includes('timeout') ||
        message.includes('alibaba cloud account') ||
        message.includes('binding')
    );
}

/**
 * Unified image generation dispatcher.
 *
 * @param {Object} params
 * @param {string} params.prompt - Generation prompt
 * @param {'cloudflare'|'modelscope'|'huggingface'} [params.provider='cloudflare'] - Target provider
 * @param {string} [params.model] - Specific model ID
 * @param {number} [params.width=1024] - Width
 * @param {number} [params.height=1024] - Height
 * @param {string} [params.aspectRatio='1:1'] - Aspect ratio string
 * @param {Buffer} [params.referenceImageBuffer=null] - Reference image buffer for image-to-image
 * @param {'crop_to_fill'|'contain_pad'} [params.processingMode='crop_to_fill'] - Aspect ratio processing mode
 * @param {number} [params.steps=4] - Steps (for Cloudflare)
 * @param {number} [params.seed] - Seed
 * @param {boolean} [params.allowFallback=true] - Whether to allow automated fallback
 * @param {boolean} [params.requireCommercialApproval=false] - For ModelScope license check
 * @returns {Promise<import('./normalize-image-result').NormalizedImageResult>}
 */
export async function generateImage({
    prompt,
    provider = CLOUDFLARE_PROVIDER_ID,
    model = null,
    width = 1024,
    height = 1024,
    aspectRatio = '1:1',
    referenceImageBuffer = null,
    processingMode = 'crop_to_fill',
    steps = 4,
    seed = null,
    allowFallback = true,
    requireCommercialApproval = false,
} = {}) {
    const isImageToImage = Boolean(referenceImageBuffer);

    // Image-to-image requests MUST use Hugging Face (neither Cloudflare nor ModelScope hosted API support reference image edit)
    if (isImageToImage) {
        return await generateViaHuggingFace({
            prompt,
            modelId: model || 'stabilityai/stable-diffusion-xl-base-1.0',
            width,
            height,
            aspectRatio,
            referenceImageBuffer,
        });
    }

    // Determine target provider and execute
    const requestedProvider = provider || CLOUDFLARE_PROVIDER_ID;
    const requestedModel = model || (requestedProvider === CLOUDFLARE_PROVIDER_ID ? CLOUDFLARE_MODEL_ID : null);

    try {
        if (requestedProvider === CLOUDFLARE_PROVIDER_ID) {
            return await generateViaCloudflare({
                prompt,
                steps,
                seed,
                targetWidth: width,
                targetHeight: height,
                aspectRatio,
                processingMode,
            });
        }

        if (requestedProvider === MODELSCOPE_PROVIDER_ID) {
            return await generateViaModelScope({
                prompt,
                targetWidth: width,
                targetHeight: height,
                aspectRatio,
                requireCommercialApproval,
            });
        }

        if (requestedProvider === HF_PROVIDER_ID) {
            return await generateViaHuggingFace({
                prompt,
                modelId: requestedModel || 'black-forest-labs/FLUX.1-schnell',
                width,
                height,
                aspectRatio,
                referenceImageBuffer: null,
            });
        }

        throw new ProviderBadRequestError(`Unknown or unsupported image provider: ${requestedProvider}`, {
            provider: requestedProvider,
        });
    } catch (primaryError) {
        // Evaluate if fallback is allowed and appropriate
        const canFallback = allowFallback && isErrorEligibleForFallback(primaryError);

        if (!canFallback) {
            throw primaryError;
        }

        // 1. Cloudflare (Primary) -> ModelScope (Secondary) fallback rule
        if (requestedProvider === CLOUDFLARE_PROVIDER_ID) {
            const hasModelScopeToken = Boolean((process.env.MODELSCOPE_API_TOKEN || '').trim());
            const modelScopePermitted = !requireCommercialApproval || isModelScopeCommercialVerified();

            if (hasModelScopeToken && modelScopePermitted) {
                console.warn(
                    `[ImageProvider] Cloudflare failed (${primaryError.message}). Attempting automated fallback to ModelScope (${MODELSCOPE_MODEL_ID})...`
                );
                try {
                    const fallbackResult = await generateViaModelScope({
                        prompt,
                        targetWidth: width,
                        targetHeight: height,
                        aspectRatio,
                        requireCommercialApproval,
                    });

                    fallbackResult.metadata.fallbackOccurred = true;
                    fallbackResult.metadata.originalProvider = CLOUDFLARE_PROVIDER_ID;
                    fallbackResult.metadata.originalModel = CLOUDFLARE_MODEL_ID;
                    fallbackResult.metadata.fallbackReason = primaryError.message;
                    return fallbackResult;
                } catch (secondaryError) {
                    console.error(
                        `[ImageProvider] ModelScope fallback also failed (${secondaryError.message}). Re-throwing primary error.`
                    );
                }
            }
        }

        // 2. ModelScope (Secondary) -> Cloudflare (Primary) fallback rule
        if (requestedProvider === MODELSCOPE_PROVIDER_ID) {
            const hasCloudflareCreds = Boolean(
                (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim() &&
                (process.env.CLOUDFLARE_API_TOKEN || '').trim()
            );

            if (hasCloudflareCreds) {
                console.warn(
                    `[ImageProvider] ModelScope unavailable (${primaryError.message}). Attempting automated fallback to Cloudflare Workers AI (${CLOUDFLARE_MODEL_ID})...`
                );
                try {
                    const fallbackResult = await generateViaCloudflare({
                        prompt,
                        steps,
                        seed,
                        targetWidth: width,
                        targetHeight: height,
                        aspectRatio,
                        processingMode,
                    });

                    fallbackResult.metadata.fallbackOccurred = true;
                    fallbackResult.metadata.originalProvider = MODELSCOPE_PROVIDER_ID;
                    fallbackResult.metadata.originalModel = MODELSCOPE_MODEL_ID;
                    fallbackResult.metadata.fallbackReason = primaryError.message;
                    return fallbackResult;
                } catch (secondaryError) {
                    console.error(
                        `[ImageProvider] Cloudflare fallback also failed (${secondaryError.message}). Re-throwing primary error.`
                    );
                }
            }
        }

        // If no fallback was possible or fallback failed, throw original error
        throw primaryError;
    }
}
