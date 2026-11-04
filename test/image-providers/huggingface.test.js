import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
    generateViaHuggingFace,
    getHFApiKeysInOrder,
} from '@/lib/image-providers/huggingface.js';
import {
    ProviderAuthError,
} from '@/lib/image-providers/provider-errors.js';

test('4. Hugging Face Adapter Preservation Contract', async (t) => {
    const mockImageBuffer = await sharp({
        create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 120, g: 80, b: 200, alpha: 1 },
        },
    }).png().toBuffer();

    await t.test('Collects and deduplicates keys across aliases', () => {
        const origKeys = {
            HF_API_KEY: process.env.HF_API_KEY,
            HF_API_KEY_2: process.env.HF_API_KEY_2,
            HUGGING_FACE_TOKEN: process.env.HUGGING_FACE_TOKEN,
        };

        try {
            process.env.HF_API_KEY = 'hf_key_1';
            process.env.HF_API_KEY_2 = 'hf_key_2';
            process.env.HUGGING_FACE_TOKEN = 'hf_key_1'; // duplicate

            const keys = getHFApiKeysInOrder();
            assert.ok(keys.includes('hf_key_1'));
            assert.ok(keys.includes('hf_key_2'));
            assert.equal(keys.filter((k) => k === 'hf_key_1').length, 1, 'Should deduplicate identical keys');
        } finally {
            Object.entries(origKeys).forEach(([k, v]) => {
                if (v !== undefined) process.env[k] = v;
                else delete process.env[k];
            });
        }
    });

    await t.test('Rejects when no Hugging Face API keys are configured', async () => {
        const origKey = process.env.HF_API_KEY;
        const origKey2 = process.env.HF_API_KEY_2;
        const origKey3 = process.env.HF_API_KEY_3;
        const origKey4 = process.env.HF_API_KEY_4;
        const origHfToken = process.env.HF_TOKEN;
        const origHfToken2 = process.env.HUGGING_FACE_TOKEN;

        try {
            delete process.env.HF_API_KEY;
            delete process.env.HF_API_KEY_2;
            delete process.env.HF_API_KEY_3;
            delete process.env.HF_API_KEY_4;
            delete process.env.HF_TOKEN;
            delete process.env.HUGGING_FACE_TOKEN;
            delete process.env.HUGGING_FACE_API_KEY;
            delete process.env.NEXT_PUBLIC_HF_API_KEY;

            await assert.rejects(
                () => generateViaHuggingFace({ prompt: 'test' }),
                (err) => err instanceof ProviderAuthError
            );
        } finally {
            if (origKey) process.env.HF_API_KEY = origKey;
            if (origKey2) process.env.HF_API_KEY_2 = origKey2;
            if (origKey3) process.env.HF_API_KEY_3 = origKey3;
            if (origKey4) process.env.HF_API_KEY_4 = origKey4;
            if (origHfToken) process.env.HF_TOKEN = origHfToken;
            if (origHfToken2) process.env.HUGGING_FACE_TOKEN = origHfToken2;
        }
    });

    await t.test('Successfully generates text-to-image with valid key and preserves metadata', async () => {
        const origKey = process.env.HF_API_KEY;
        const origFetch = globalThis.fetch;
        process.env.HF_API_KEY = 'hf_mock_token_123';

        try {
            globalThis.fetch = async (url, options) => {
                assert.ok(url.includes('black-forest-labs/FLUX.1-schnell'));
                assert.equal(options.headers.Authorization, 'Bearer hf_mock_token_123');

                return {
                    ok: true,
                    status: 200,
                    arrayBuffer: async () => mockImageBuffer.buffer,
                };
            };

            const result = await generateViaHuggingFace({
                prompt: 'Serene forest at dusk',
                modelId: 'black-forest-labs/FLUX.1-schnell',
                width: 1024,
                height: 1024,
            });

            assert.equal(result.provider, 'huggingface');
            assert.equal(result.model, 'black-forest-labs/FLUX.1-schnell');
            assert.equal(result.generationType, 'text-to-image');
            assert.ok(Buffer.isBuffer(result.buffer));
        } finally {
            globalThis.fetch = origFetch;
            if (origKey) process.env.HF_API_KEY = origKey;
            else delete process.env.HF_API_KEY;
        }
    });

    await t.test('Image-to-image generation resizes reference image and preserves edit mode', async () => {
        const origKey = process.env.HF_API_KEY;
        const origFetch = globalThis.fetch;
        process.env.HF_API_KEY = 'hf_mock_token_123';

        try {
            globalThis.fetch = async (url, options) => {
                assert.ok(url.includes('stabilityai/stable-diffusion-xl-base-1.0'));
                return {
                    ok: true,
                    status: 200,
                    arrayBuffer: async () => mockImageBuffer.buffer,
                };
            };

            const result = await generateViaHuggingFace({
                prompt: 'Turn the scene to night with stars',
                modelId: 'stabilityai/stable-diffusion-xl-base-1.0',
                width: 1024,
                height: 1024,
                referenceImageBuffer: mockImageBuffer,
            });

            assert.equal(result.provider, 'huggingface');
            assert.equal(result.generationType, 'image-to-image');
            assert.ok(Buffer.isBuffer(result.buffer));
        } finally {
            globalThis.fetch = origFetch;
            if (origKey) process.env.HF_API_KEY = origKey;
            else delete process.env.HF_API_KEY;
        }
    });
});
