import test from 'node:test';
import assert from 'node:assert/strict';
import {
    IMAGE_PROVIDERS,
    CLOUDFLARE_IMAGE_MODELS,
    MODELSCOPE_IMAGE_MODELS,
    HF_IMAGE_MODELS,
    HF_IMAGE_TO_IMAGE_MODELS,
    IMAGE_MODELS,
    DEFAULT_PROVIDER_ID,
    DEFAULT_MODEL_ID,
    getProviderById,
    getModelsByProvider,
    getProviderIdByModelId,
    getDefaultModelForProvider,
    getModelById,
    supportsImageToImage,
    getImageToImageModels,
    getModelCapabilities,
    getDefaultImageToImageModelForProvider,
} from '@/lib/hf-image-config';

test('1. Centralized Provider Registry Contract', async (t) => {
    await t.test('Cloudflare is primary and Leonardo is completely absent', () => {
        const providerIds = IMAGE_PROVIDERS.map((p) => p.id);
        assert.ok(providerIds.includes('cloudflare'), 'Cloudflare provider must be present');
        assert.ok(providerIds.includes('modelscope'), 'ModelScope provider must be present');
        assert.ok(providerIds.includes('huggingface'), 'Hugging Face provider must be present');
        assert.ok(!providerIds.includes('leonardo'), 'Leonardo provider must be completely absent');

        assert.equal(DEFAULT_PROVIDER_ID, 'cloudflare', 'Default provider must be cloudflare');
        assert.equal(DEFAULT_MODEL_ID, '@cf/black-forest-labs/flux-1-schnell', 'Default model must be Cloudflare FLUX Schnell');
    });

    await t.test('Cloudflare FLUX Schnell model configuration and capabilities', () => {
        const cfModel = CLOUDFLARE_IMAGE_MODELS.find((m) => m.id === '@cf/black-forest-labs/flux-1-schnell');
        assert.ok(cfModel, 'Cloudflare model must exist');
        assert.equal(cfModel.provider, 'cloudflare');
        assert.equal(cfModel.supportsTextToImage, true);
        assert.equal(cfModel.supportsImageToImage, false, 'Cloudflare must not claim image-to-image support');
        assert.ok(cfModel.ratios.length >= 5, 'Must provide full suite of common aspect ratios');
    });

    await t.test('ModelScope Qwen Image 2.1 configuration and license status', () => {
        const msModel = MODELSCOPE_IMAGE_MODELS.find((m) => m.id === 'Qwen/Qwen-Image-2.1');
        assert.ok(msModel, 'ModelScope model must exist');
        assert.equal(msModel.provider, 'modelscope');
        assert.equal(msModel.verificationState, 'available_for_testing');
        assert.equal(msModel.supportsImageToImage, false);
    });

    await t.test('Hugging Face models remain preserved and operational', () => {
        assert.ok(HF_IMAGE_MODELS.length >= 4, 'Must retain all existing HF models');
        const hfModelIds = HF_IMAGE_MODELS.map((m) => m.id);
        assert.ok(hfModelIds.includes('black-forest-labs/FLUX.1-schnell'));
        assert.ok(hfModelIds.includes('stabilityai/stable-diffusion-xl-base-1.0'));
        assert.ok(hfModelIds.includes('runwayml/stable-diffusion-v1-5'));
        assert.ok(hfModelIds.includes('ByteDance/Hyper-SD'));

        // Image-to-image models
        assert.ok(HF_IMAGE_TO_IMAGE_MODELS.length > 0);
        const editModel = HF_IMAGE_TO_IMAGE_MODELS[0];
        assert.equal(editModel.supportsImageToImage, true);
    });

    await t.test('Helper functions resolve models and capabilities accurately', () => {
        const defaultCf = getDefaultModelForProvider('cloudflare');
        assert.equal(defaultCf.id, '@cf/black-forest-labs/flux-1-schnell');

        const defaultMs = getDefaultModelForProvider('modelscope');
        assert.equal(defaultMs.id, 'Qwen/Qwen-Image-2.1');

        const defaultHf = getDefaultModelForProvider('huggingface');
        assert.equal(defaultHf.id, 'black-forest-labs/FLUX.1-schnell');

        assert.equal(getProviderIdByModelId('@cf/black-forest-labs/flux-1-schnell'), 'cloudflare');
        assert.equal(getProviderIdByModelId('Qwen/Qwen-Image-2.1'), 'modelscope');
        assert.equal(getProviderIdByModelId('ByteDance/Hyper-SD'), 'huggingface');

        assert.equal(supportsImageToImage('@cf/black-forest-labs/flux-1-schnell'), false);
        assert.equal(supportsImageToImage('stabilityai/stable-diffusion-xl-base-1.0'), true);

        const editModels = getImageToImageModels();
        assert.ok(editModels.every((m) => m.supportsImageToImage === true));

        const fallbackEdit = getDefaultImageToImageModelForProvider('cloudflare');
        assert.ok(fallbackEdit, 'Should fall back to HF edit model when provider has no native edit model');
        assert.equal(fallbackEdit.provider, 'huggingface');
    });
});
