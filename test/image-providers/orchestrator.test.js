import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { generateImage } from '@/lib/image-providers/index.js';
import {
    ProviderContentPolicyError,
    ProviderBadRequestError,
} from '@/lib/image-providers/provider-errors.js';

test('5. Provider Orchestrator & Fallback Contract', async (t) => {
    const mockImageBuffer = await sharp({
        create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 40, g: 180, b: 120, alpha: 1 },
        },
    }).png().toBuffer();
    const mockBase64 = mockImageBuffer.toString('base64');

    await t.test('Cloudflare quota exhaustion triggers automated fallback to ModelScope', async () => {
        const origAcct = process.env.CLOUDFLARE_ACCOUNT_ID;
        const origToken = process.env.CLOUDFLARE_API_TOKEN;
        const origMsToken = process.env.MODELSCOPE_API_TOKEN;
        const origFetch = globalThis.fetch;

        process.env.CLOUDFLARE_ACCOUNT_ID = 'cf-acct-test';
        process.env.CLOUDFLARE_API_TOKEN = 'cf-token-test';
        process.env.MODELSCOPE_API_TOKEN = 'ms-token-test';

        try {
            globalThis.fetch = async (url, options) => {
                // Cloudflare call fails with 429 quota exhaustion
                if (url.includes('@cf/black-forest-labs/flux-1-schnell')) {
                    return {
                        ok: false,
                        status: 429,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({ message: 'Daily neuron quota reached' }),
                    };
                }

                // ModelScope fallback task submission succeeds
                if ((url.endsWith('/images/generations') || url.endsWith('/tasks')) && options?.method === 'POST') {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ task_id: 'task-fallback-123' }),
                    };
                }

                // ModelScope task poll succeeds immediately
                if (url.includes('/tasks/task-fallback-123')) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({
                            task_status: 'SUCCEEDED',
                            output: {
                                results: [{ b64_image: mockBase64 }],
                            },
                        }),
                    };
                }

                throw new Error(`Unexpected fetch URL: ${url}`);
            };

            const result = await generateImage({
                prompt: 'Cozy cabin in the snow',
                provider: 'cloudflare',
                width: 1024,
                height: 1024,
                allowFallback: true,
            });

            // Must accurately reflect actual provider and fallback metadata
            assert.equal(result.provider, 'modelscope');
            assert.equal(result.model, 'Qwen/Qwen-Image-2.1');
            assert.equal(result.metadata.fallbackOccurred, true);
            assert.equal(result.metadata.originalProvider, 'cloudflare');
            assert.ok(result.metadata.fallbackReason.includes('quota'));
            assert.ok(Buffer.isBuffer(result.buffer));
        } finally {
            globalThis.fetch = origFetch;
            if (origAcct) process.env.CLOUDFLARE_ACCOUNT_ID = origAcct;
            else delete process.env.CLOUDFLARE_ACCOUNT_ID;
            if (origToken) process.env.CLOUDFLARE_API_TOKEN = origToken;
            else delete process.env.CLOUDFLARE_API_TOKEN;
            if (origMsToken) process.env.MODELSCOPE_API_TOKEN = origMsToken;
            else delete process.env.MODELSCOPE_API_TOKEN;
        }
    });

    await t.test('ModelScope binding or auth error triggers automated fallback to Cloudflare', async () => {
        const origAcct = process.env.CLOUDFLARE_ACCOUNT_ID;
        const origToken = process.env.CLOUDFLARE_API_TOKEN;
        const origMsToken = process.env.MODELSCOPE_API_TOKEN;
        const origFetch = globalThis.fetch;

        process.env.CLOUDFLARE_ACCOUNT_ID = 'cf-acct-test';
        process.env.CLOUDFLARE_API_TOKEN = 'cf-token-test';
        process.env.MODELSCOPE_API_TOKEN = 'ms-token-test';

        try {
            globalThis.fetch = async (url) => {
                // ModelScope call fails with binding required
                if (url.includes('modelscope')) {
                    return {
                        ok: false,
                        status: 401,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({
                            errors: {
                                message: 'Please bind your Alibaba Cloud account before use. You can bind it at: https://modelscope.ai/my/settings/account',
                            },
                        }),
                    };
                }

                // Cloudflare fallback succeeds
                if (url.includes('@cf/black-forest-labs/flux-1-schnell')) {
                    return {
                        ok: true,
                        status: 200,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({
                            result: {
                                image: mockBase64,
                            },
                            success: true,
                        }),
                    };
                }

                throw new Error(`Unexpected fetch URL: ${url}`);
            };

            const result = await generateImage({
                prompt: 'Golden desert dunes',
                provider: 'modelscope',
                width: 1024,
                height: 1024,
                allowFallback: true,
            });

            assert.equal(result.provider, 'cloudflare');
            assert.equal(result.model, '@cf/black-forest-labs/flux-1-schnell');
            assert.equal(result.metadata.fallbackOccurred, true);
            assert.equal(result.metadata.originalProvider, 'modelscope');
            assert.ok(Buffer.isBuffer(result.buffer));
        } finally {
            globalThis.fetch = origFetch;
            if (origAcct) process.env.CLOUDFLARE_ACCOUNT_ID = origAcct;
            else delete process.env.CLOUDFLARE_ACCOUNT_ID;
            if (origToken) process.env.CLOUDFLARE_API_TOKEN = origToken;
            else delete process.env.CLOUDFLARE_API_TOKEN;
            if (origMsToken) process.env.MODELSCOPE_API_TOKEN = origMsToken;
            else delete process.env.MODELSCOPE_API_TOKEN;
        }
    });

    await t.test('Never falls back on content policy or bad prompt rejection', async () => {
        const origAcct = process.env.CLOUDFLARE_ACCOUNT_ID;
        const origToken = process.env.CLOUDFLARE_API_TOKEN;
        const origMsToken = process.env.MODELSCOPE_API_TOKEN;
        const origFetch = globalThis.fetch;

        process.env.CLOUDFLARE_ACCOUNT_ID = 'cf-acct-test';
        process.env.CLOUDFLARE_API_TOKEN = 'cf-token-test';
        process.env.MODELSCOPE_API_TOKEN = 'ms-token-test';

        let modelScopeCalled = false;
        try {
            globalThis.fetch = async (url) => {
                if (url.includes('@cf/black-forest-labs/flux-1-schnell')) {
                    return {
                        ok: false,
                        status: 400,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({ message: 'Prompt rejected by content policy safety check' }),
                    };
                }
                if (url.includes('modelscope')) {
                    modelScopeCalled = true;
                }
                return { ok: false, status: 500 };
            };

            await assert.rejects(
                () =>
                    generateImage({
                        prompt: 'violating content',
                        provider: 'cloudflare',
                        allowFallback: true,
                    }),
                (err) => err instanceof ProviderBadRequestError || err.statusCode === 400
            );

            assert.equal(modelScopeCalled, false, 'ModelScope must NOT be called on prompt policy violations');
        } finally {
            globalThis.fetch = origFetch;
            if (origAcct) process.env.CLOUDFLARE_ACCOUNT_ID = origAcct;
            else delete process.env.CLOUDFLARE_ACCOUNT_ID;
            if (origToken) process.env.CLOUDFLARE_API_TOKEN = origToken;
            else delete process.env.CLOUDFLARE_API_TOKEN;
            if (origMsToken) process.env.MODELSCOPE_API_TOKEN = origMsToken;
            else delete process.env.MODELSCOPE_API_TOKEN;
        }
    });

    await t.test('Image-to-image requests strictly route to Hugging Face edit models', async () => {
        const origHfKey = process.env.HF_API_KEY;
        const origFetch = globalThis.fetch;
        process.env.HF_API_KEY = 'hf_mock_123';

        let hfCalled = false;
        try {
            globalThis.fetch = async (url) => {
                if (url.includes('huggingface.co')) {
                    hfCalled = true;
                    return {
                        ok: true,
                        status: 200,
                        arrayBuffer: async () => mockImageBuffer.buffer,
                    };
                }
                return { ok: false, status: 500 };
            };

            // Requesting Cloudflare with reference image: must auto-route to HF
            const result = await generateImage({
                prompt: 'Add sunset glow',
                provider: 'cloudflare',
                referenceImageBuffer: mockImageBuffer,
            });

            assert.equal(hfCalled, true, 'Hugging Face must be invoked for image-to-image');
            assert.equal(result.provider, 'huggingface');
            assert.equal(result.generationType, 'image-to-image');
        } finally {
            globalThis.fetch = origFetch;
            if (origHfKey) process.env.HF_API_KEY = origHfKey;
            else delete process.env.HF_API_KEY;
        }
    });
});
