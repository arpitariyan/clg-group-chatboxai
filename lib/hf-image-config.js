/**
 * Provider-aware image generation model registry.
 * Single source of truth for provider, model, capability, and ratio validation.
 *
 * Primary Provider: Cloudflare Workers AI (FLUX.1 Schnell)
 * Secondary Provider: ModelScope (Qwen/Qwen-Image-2.1)
 * Preserved Provider: Hugging Face (FLUX Schnell, SDXL, SD 1.5, Hyper-SD, Image-to-Image)
 */

/**
 * Generation mode contract for image API requests and DB persistence.
 * - 'text-to-image': Standard generation with no reference image
 * - 'image-to-image': Edit/modify an uploaded reference image with a prompt
 */
export const GENERATION_MODES = {
    TEXT_TO_IMAGE: 'text-to-image',
    IMAGE_TO_IMAGE: 'image-to-image',
};

export const IMAGE_PROVIDERS = [
    { id: 'cloudflare', name: 'Cloudflare Workers AI', isPrimary: true },
    { id: 'modelscope', name: 'ModelScope', isSecondary: true },
    { id: 'huggingface', name: 'Hugging Face', isPreserved: true },
];

export const CLOUDFLARE_IMAGE_MODELS = [
    {
        id: '@cf/black-forest-labs/flux-1-schnell',
        provider: 'cloudflare',
        name: 'FLUX.1 Schnell',
        desc: 'Ultra-fast 4-step generation via Cloudflare Workers AI (Primary)',
        supportsTextToImage: true,
        supportsImageToImage: false,
        isPrimary: true,
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1360, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1360 },
            { label: 'Standard (4:3)', value: '4:3', width: 1152, height: 896 },
            { label: 'Vertical (3:4)', value: '3:4', width: 896, height: 1152 },
            { label: 'Wide (3:2)', value: '3:2', width: 1248, height: 832 },
            { label: 'Tall (2:3)', value: '2:3', width: 832, height: 1248 },
        ],
    },
];

export const MODELSCOPE_IMAGE_MODELS = [
    {
        id: 'Qwen/Qwen-Image-2.1',
        provider: 'modelscope',
        name: 'Qwen Image 2.1',
        desc: 'High-fidelity text-to-image synthesis by Alibaba Qwen (Secondary)',
        supportsTextToImage: true,
        supportsImageToImage: false,
        verificationState: 'available_for_testing',
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1360, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1360 },
            { label: 'Standard (4:3)', value: '4:3', width: 1152, height: 896 },
            { label: 'Vertical (3:4)', value: '3:4', width: 896, height: 1152 },
            { label: 'Wide (3:2)', value: '3:2', width: 1248, height: 832 },
            { label: 'Tall (2:3)', value: '2:3', width: 832, height: 1248 },
        ],
    },
];

export const HF_IMAGE_MODELS = [
    {
        id: 'black-forest-labs/FLUX.1-schnell',
        provider: 'huggingface',
        name: 'FLUX Schnell (HF)',
        desc: 'Extremely fast generation with good prompt accuracy via Hugging Face',
        supportsTextToImage: true,
        supportsImageToImage: false,
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1360, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1360 },
            { label: 'Standard (4:3)', value: '4:3', width: 1152, height: 896 },
            { label: 'Vertical (3:4)', value: '3:4', width: 896, height: 1152 },
            { label: 'Wide (3:2)', value: '3:2', width: 1248, height: 832 },
            { label: 'Tall (2:3)', value: '2:3', width: 832, height: 1248 },
        ],
    },
    {
        id: 'stabilityai/stable-diffusion-xl-base-1.0',
        provider: 'huggingface',
        name: 'Stable Diffusion XL',
        desc: 'High quality, photorealistic images with strong prompt understanding',
        supportsTextToImage: true,
        supportsImageToImage: false,
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1344, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1344 },
            { label: 'Standard (4:3)', value: '4:3', width: 1152, height: 896 },
            { label: 'Wide (3:2)', value: '3:2', width: 1216, height: 832 },
        ],
    },
    {
        id: 'runwayml/stable-diffusion-v1-5',
        provider: 'huggingface',
        name: 'Stable Diffusion v1.5',
        desc: 'Lightweight and fast, very stable for quick generations',
        supportsTextToImage: true,
        supportsImageToImage: false,
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 512, height: 512 },
            { label: 'Landscape (16:9)', value: '16:9', width: 768, height: 432 },
            { label: 'Portrait (9:16)', value: '9:16', width: 432, height: 768 },
            { label: 'Standard (4:3)', value: '4:3', width: 640, height: 480 },
        ],
    },
    {
        id: 'ByteDance/Hyper-SD',
        provider: 'huggingface',
        name: 'Hyper-SD',
        desc: 'Optimized SDXL variant - balanced quality and speed',
        supportsTextToImage: true,
        supportsImageToImage: false,
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1344, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1344 },
            { label: 'Standard (4:3)', value: '4:3', width: 1152, height: 896 },
            { label: 'Wide (3:2)', value: '3:2', width: 1216, height: 832 },
        ],
    },
];

/**
 * HF models that support image-to-image (inpainting/editing) in addition to text-to-image.
 * These models accept a reference image + prompt and apply edits while preserving source structure.
 */
export const HF_IMAGE_TO_IMAGE_MODELS = [
    {
        id: 'stabilityai/stable-diffusion-xl-base-1.0',
        provider: 'huggingface',
        name: 'SDXL with Image Edit',
        desc: 'High quality image-to-image editing with robust HF endpoint availability',
        supportsImageToImage: true,
        supportsTextToImage: true,
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1344, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1344 },
            { label: 'Wide (3:2)', value: '3:2', width: 1216, height: 832 },
            { label: 'Tall (2:3)', value: '2:3', width: 832, height: 1216 },
        ],
        guidanceScale: 7.5,
        numInferenceSteps: 50,
    },
];

export const IMAGE_MODELS = [
    ...CLOUDFLARE_IMAGE_MODELS,
    ...MODELSCOPE_IMAGE_MODELS,
    ...HF_IMAGE_MODELS,
    ...HF_IMAGE_TO_IMAGE_MODELS,
];

export const DEFAULT_PROVIDER_ID = 'cloudflare';
export const DEFAULT_MODEL_ID = '@cf/black-forest-labs/flux-1-schnell';

export function getProviderById(providerId) {
    return IMAGE_PROVIDERS.find((provider) => provider.id === providerId) || IMAGE_PROVIDERS[0];
}

export function getModelsByProvider(providerId) {
    return IMAGE_MODELS.filter((model) => model.provider === providerId);
}

export function getProviderIdByModelId(modelId) {
    return IMAGE_MODELS.find((model) => model.id === modelId)?.provider || DEFAULT_PROVIDER_ID;
}

export function getDefaultModelForProvider(providerId = DEFAULT_PROVIDER_ID) {
    const providerModels = getModelsByProvider(providerId);
    if (providerModels.length > 0) {
        return providerModels[0];
    }
    return IMAGE_MODELS[0];
}

/**
 * Returns the model config for the given ID.
 * Falls back to provider default model, then the global default model.
 */
export function getModelById(modelId, providerId = null) {
    const exact = IMAGE_MODELS.find((model) => model.id === modelId);
    if (exact) {
        return exact;
    }
    if (providerId) {
        return getDefaultModelForProvider(providerId);
    }
    return IMAGE_MODELS[0];
}

/**
 * Check if a model supports image-to-image (editing) mode.
 * Returns true only if the model explicitly declares supportsImageToImage capability.
 */
export function supportsImageToImage(modelId) {
    return IMAGE_MODELS.some((m) => m.id === modelId && m.supportsImageToImage === true);
}

/**
 * Get all image-to-image capable models for a given provider.
 * If no provider specified, returns all edit-capable models.
 */
export function getImageToImageModels(providerId = null) {
    const editModels = IMAGE_MODELS.filter((m) => m.supportsImageToImage === true);
    if (!providerId) {
        return editModels;
    }
    return editModels.filter((m) => m.provider === providerId);
}

/**
 * Return full capability metadata for a model, including generation modes, guidance scales, and inference steps.
 */
export function getModelCapabilities(modelId) {
    const model = IMAGE_MODELS.find((m) => m.id === modelId);
    if (!model) {
        return null;
    }
    return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        supportsTextToImage: model.supportsTextToImage !== false,
        supportsImageToImage: model.supportsImageToImage === true,
        guidanceScale: model.guidanceScale || null,
        numInferenceSteps: model.numInferenceSteps || null,
        ratios: model.ratios || [],
    };
}

/**
 * Get the default image-to-image model for a provider.
 * If the provider has no edit models (e.g. Cloudflare or ModelScope), falls back to Hugging Face.
 */
export function getDefaultImageToImageModelForProvider(providerId = 'huggingface') {
    const editModels = getImageToImageModels(providerId);
    if (editModels.length > 0) {
        return editModels[0];
    }
    const hfEditModels = HF_IMAGE_TO_IMAGE_MODELS;
    return hfEditModels.length > 0 ? hfEditModels[0] : null;
}
