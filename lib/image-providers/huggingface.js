/**
 * Hugging Face Inference API Image Generation Adapter
 * Preserved Provider — Full Support for Text-to-Image & Image-to-Image
 *
 * Implements multi-key rotation, 503 cold-start retries, endpoint negotiation,
 * reference image resizing, and payload shape fallback variants.
 */

import sharp from 'sharp';
import {
    ProviderAuthError,
    ProviderQuotaError,
    ProviderBadRequestError,
    ProviderUnavailableError,
    ImageProviderError,
} from './provider-errors.js';
import { createNormalizedImageResult } from './normalize-image-result.js';

export const HF_PROVIDER_ID = 'huggingface';
export const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';
export const HF_API_INFERENCE_BASE = 'https://api-inference.huggingface.co/models';
export const HF_MAX_RETRIES = 3;
export const HF_RETRY_DELAY_MS = 20000;
const HF_UNAVAILABLE_MODEL_TTL_MS = 10 * 60 * 1000;

const hfUnavailableImageToImageModels = new Map();

export function markHFImageToImageModelUnavailable(modelId) {
    hfUnavailableImageToImageModels.set(modelId, Date.now() + HF_UNAVAILABLE_MODEL_TTL_MS);
}

export function isHFImageToImageModelTemporarilyUnavailable(modelId) {
    const expiresAt = hfUnavailableImageToImageModels.get(modelId);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
        hfUnavailableImageToImageModels.delete(modelId);
        return false;
    }
    return true;
}

/**
 * Collects and deduplicates all configured Hugging Face API keys across all supported aliases.
 */
export function getHFApiKeysInOrder() {
    const keyCandidates = [
        process.env.HF_API_KEY,
        process.env.HF_API_KEY_2,
        process.env.HF_API_KEY_3,
        process.env.HF_API_KEY_4,
        process.env.HUGGING_FACE_API_KEY,
        process.env.HUGGING_FACE_TOKEN,
        process.env.HF_TOKEN,
        process.env.NEXT_PUBLIC_HF_API_KEY,
    ];

    const clean = keyCandidates
        .map((k) => (typeof k === 'string' ? k.trim() : ''))
        .filter((k) => k.length > 0);

    return [...new Set(clean)];
}

/**
 * Text-to-image generation via Hugging Face.
 */
export async function generateHFImage(prompt, modelId, width, height) {
    const apiKeys = getHFApiKeysInOrder();
    if (apiKeys.length === 0) {
        throw new ProviderAuthError(
            'Hugging Face API key is not configured. Add HF_API_KEY to your .env file.',
            { provider: HF_PROVIDER_ID, model: modelId }
        );
    }

    const url = `${HF_API_BASE}/${modelId}`;
    const keyErrors = [];

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
        const apiKey = apiKeys[keyIndex];

        for (let attempt = 1; attempt <= HF_MAX_RETRIES; attempt++) {
            let response;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: prompt,
                        parameters: { width, height },
                    }),
                });
            } catch (networkError) {
                keyErrors.push(`Key #${keyIndex + 1} network error: ${networkError.message}`);
                break;
            }

            if (response.status === 503) {
                let waitMs = HF_RETRY_DELAY_MS;
                try {
                    const body = await response.json();
                    if (body?.estimated_time) {
                        waitMs = Math.min(body.estimated_time * 1000, HF_RETRY_DELAY_MS);
                    }
                } catch (_) {}
                if (attempt < HF_MAX_RETRIES) {
                    console.warn(`HF model loading (503), key #${keyIndex + 1}, attempt ${attempt}/${HF_MAX_RETRIES}. Waiting ${waitMs}ms...`);
                    await new Promise((r) => setTimeout(r, waitMs));
                    continue;
                }
                keyErrors.push(`Key #${keyIndex + 1} unavailable after ${HF_MAX_RETRIES} attempts (503 model loading).`);
                break;
            }

            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }

            let msg = response.statusText;
            try {
                const body = await response.json();
                msg = body?.error || body?.message || msg;
            } catch (_) {}

            if (response.status === 400) {
                throw new ProviderBadRequestError(`Hugging Face API error 400: ${msg}`, {
                    provider: HF_PROVIDER_ID,
                    model: modelId,
                    statusCode: 400,
                });
            }

            if ([401, 403, 429, 500, 502, 504].includes(response.status)) {
                keyErrors.push(`Key #${keyIndex + 1} failed with ${response.status}: ${msg}`);
                break;
            }

            keyErrors.push(`Key #${keyIndex + 1} failed with ${response.status}: ${msg}`);
            break;
        }
    }

    throw new ImageProviderError(
        `Hugging Face image generation API failed on ${modelId}. Errors: ${keyErrors.join(' | ')}`,
        { provider: HF_PROVIDER_ID, model: modelId }
    );
}

/**
 * Image-to-image generation via Hugging Face.
 */
export async function generateHFImageWithReference(
    prompt,
    modelId,
    width,
    height,
    referenceImageBuffer,
    guidanceScale = 2.5,
    numInferenceSteps = 50
) {
    const apiKeys = getHFApiKeysInOrder();
    if (apiKeys.length === 0) {
        throw new ProviderAuthError(
            'Hugging Face API key is not configured. Add HF_API_KEY to your .env file.',
            { provider: HF_PROVIDER_ID, model: modelId }
        );
    }

    if (!referenceImageBuffer || !Buffer.isBuffer(referenceImageBuffer)) {
        throw new ProviderBadRequestError('Reference image buffer is required for image-to-image generation.', {
            provider: HF_PROVIDER_ID,
            model: modelId,
        });
    }

    let processedImageBuffer;
    try {
        processedImageBuffer = await sharp(referenceImageBuffer)
            .resize(width, height, {
                fit: 'cover',
                position: 'center',
            })
            .png()
            .toBuffer();
    } catch (sharpError) {
        throw new ProviderBadRequestError(`Failed to process reference image: ${sharpError.message}`, {
            provider: HF_PROVIDER_ID,
            model: modelId,
        });
    }

    const endpointCandidates = [
        { label: 'router', url: `${HF_API_BASE}/${modelId}` },
        { label: 'api-inference', url: `${HF_API_INFERENCE_BASE}/${modelId}` },
    ];
    const keyErrors = [];

    const isLikelyPayloadShapeError = (message) => {
        const normalized = String(message || '').toLowerCase();
        return (
            normalized.includes('multiple values for argument') ||
            normalized.includes('unexpected keyword argument') ||
            normalized.includes('missing 1 required positional argument') ||
            normalized.includes('got an unexpected keyword')
        );
    };

    const referenceImageBase64 = processedImageBuffer.toString('base64');

    const defaultPayloadVariants = [
        {
            label: 'inputs=image_base64+parameters.prompt',
            body: {
                inputs: referenceImageBase64,
                parameters: {
                    prompt,
                    guidance_scale: guidanceScale,
                    num_inference_steps: numInferenceSteps,
                },
            },
        },
        {
            label: 'inputs.prompt+inputs.image',
            body: {
                inputs: {
                    prompt,
                    image: referenceImageBase64,
                },
                parameters: {
                    guidance_scale: guidanceScale,
                    num_inference_steps: numInferenceSteps,
                },
            },
        },
        {
            label: 'top-level prompt+image',
            body: {
                prompt,
                image: referenceImageBase64,
                guidance_scale: guidanceScale,
                num_inference_steps: numInferenceSteps,
            },
        },
    ];

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
        const apiKey = apiKeys[keyIndex];

        for (const endpoint of endpointCandidates) {
            const payloadVariants = [...defaultPayloadVariants];

            for (let variantIndex = 0; variantIndex < payloadVariants.length; variantIndex++) {
                const payloadVariant = payloadVariants[variantIndex];

                for (let attempt = 1; attempt <= HF_MAX_RETRIES; attempt++) {
                    let response;
                    try {
                        response = await fetch(endpoint.url, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(payloadVariant.body),
                        });
                    } catch (networkError) {
                        keyErrors.push(`Key #${keyIndex + 1} on ${endpoint.label} network error: ${networkError.message}`);
                        break;
                    }

                    if (response.status === 503) {
                        let waitMs = HF_RETRY_DELAY_MS;
                        try {
                            const body = await response.json();
                            if (body?.estimated_time) {
                                waitMs = Math.min(body.estimated_time * 1000, HF_RETRY_DELAY_MS);
                            }
                        } catch (_) {}
                        if (attempt < HF_MAX_RETRIES) {
                            console.warn(`HF image-to-image model loading (503), key #${keyIndex + 1}, attempt ${attempt}/${HF_MAX_RETRIES}. Waiting ${waitMs}ms...`);
                            await new Promise((r) => setTimeout(r, waitMs));
                            continue;
                        }
                        keyErrors.push(`Key #${keyIndex + 1} unavailable after ${HF_MAX_RETRIES} attempts on ${endpoint.label} (503 loading).`);
                        break;
                    }

                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        return Buffer.from(arrayBuffer);
                    }

                    let msg = response.statusText;
                    try {
                        const body = await response.json();
                        msg = body?.error || body?.message || msg;
                    } catch (_) {}

                    if (response.status === 400 && isLikelyPayloadShapeError(msg) && variantIndex < payloadVariants.length - 1) {
                        console.info(`HF image-to-image payload mismatch for ${modelId} (${endpoint.label}, ${payloadVariant.label}). Trying next variant...`);
                        continue;
                    }

                    if (response.status === 400) {
                        throw new ProviderBadRequestError(`Hugging Face API error 400: ${msg}`, {
                            provider: HF_PROVIDER_ID,
                            model: modelId,
                            statusCode: 400,
                        });
                    }

                    if ([401, 403, 429, 500, 502, 504].includes(response.status)) {
                        keyErrors.push(`Key #${keyIndex + 1} failed on ${endpoint.label} with ${response.status}: ${msg}`);
                        break;
                    }

                    keyErrors.push(`Key #${keyIndex + 1} failed on ${endpoint.label} with ${response.status}: ${msg}`);
                    break;
                }
            }
        }
    }

    throw new ImageProviderError(
        `Hugging Face image-to-image failed on ${modelId}. Errors: ${keyErrors.join(' | ')}`,
        { provider: HF_PROVIDER_ID, model: modelId }
    );
}

/**
 * Standardized entry point for Hugging Face image generation.
 */
export async function generateViaHuggingFace({
    prompt,
    modelId = 'black-forest-labs/FLUX.1-schnell',
    width = 1024,
    height = 1024,
    aspectRatio = '1:1',
    referenceImageBuffer = null,
    guidanceScale = 2.5,
    numInferenceSteps = 50,
} = {}) {
    let rawBuffer;
    let generationType = 'text-to-image';

    if (referenceImageBuffer) {
        generationType = 'image-to-image';
        rawBuffer = await generateHFImageWithReference(
            prompt,
            modelId,
            width,
            height,
            referenceImageBuffer,
            guidanceScale,
            numInferenceSteps
        );
    } else {
        rawBuffer = await generateHFImage(prompt, modelId, width, height);
    }

    // Convert to clean PNG
    const processedBuffer = await sharp(rawBuffer).png({ quality: 95 }).toBuffer();

    return createNormalizedImageResult({
        buffer: processedBuffer,
        mimeType: 'image/png',
        provider: HF_PROVIDER_ID,
        model: modelId,
        width,
        height,
        aspectRatio,
        generationType,
        metadata: {
            guidanceScale: referenceImageBuffer ? guidanceScale : null,
            numInferenceSteps: referenceImageBuffer ? numInferenceSteps : null,
        },
    });
}
