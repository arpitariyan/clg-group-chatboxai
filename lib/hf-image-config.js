/**
 * Provider-aware image generation model registry.
 * Use this as the single source of truth for provider/model/ratio validation.
 */

export const IMAGE_PROVIDERS = [
    { id: 'huggingface', name: 'Hugging Face' },
    { id: 'leonardo', name: 'Leonardo AI' },
];

export const HF_IMAGE_MODELS = [
    {
        id: 'black-forest-labs/FLUX.1-schnell',
        provider: 'huggingface',
        name: 'FLUX Schnell',
        desc: 'Extremely fast generation with good prompt accuracy (2-4 sec)',
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1360, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1360 },
            { label: 'Wide (3:2)', value: '3:2', width: 1248, height: 832 },
            { label: 'Tall (2:3)', value: '2:3', width: 832, height: 1248 },
        ],
    },
    {
        id: 'stabilityai/stable-diffusion-xl-base-1.0',
        provider: 'huggingface',
        name: 'Stable Diffusion XL',
        desc: 'High quality, photorealistic images with strong prompt understanding',
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
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1344, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1344 },
            { label: 'Standard (4:3)', value: '4:3', width: 1152, height: 896 },
            { label: 'Wide (3:2)', value: '3:2', width: 1216, height: 832 },
        ],
    },
];

export const LEONARDO_IMAGE_MODELS = [
    {
        id: '1dd50843-d653-4516-a8e3-f0238ee453ff',
        provider: 'leonardo',
        name: 'FLUX Schnell Pro',
        desc: 'Leonardo FLUX Schnell with low-latency generation',
        // Common Leonardo FLUX Schnell sizes verified by API probe in this workspace.
        ratios: [
            { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
            { label: 'Landscape (16:9)', value: '16:9', width: 1376, height: 768 },
            { label: 'Portrait (9:16)', value: '9:16', width: 768, height: 1376 },
            { label: 'Wide (3:2)', value: '3:2', width: 1248, height: 832 },
            { label: 'Tall (2:3)', value: '2:3', width: 832, height: 1248 },
        ],
    },
];

export const IMAGE_MODELS = [...HF_IMAGE_MODELS, ...LEONARDO_IMAGE_MODELS];

export const DEFAULT_PROVIDER_ID = 'huggingface';
export const DEFAULT_MODEL_ID = 'black-forest-labs/FLUX.1-schnell';

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
 * Falls back to provider default model, then the first global model.
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
