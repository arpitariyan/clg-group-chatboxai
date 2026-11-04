import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
    generateViaCloudflare,
    applyAspectRatioProcessing,
    CLOUDFLARE_DEFAULT_STEPS,
    CLOUDFLARE_MAX_STEPS,
} from '@/lib/image-providers/cloudflare.js';
import {
    ProviderAuthError,
    ProviderBadRequestError,
    ProviderQuotaError,
    ProviderUnavailableError,
} from '@/lib/image-providers/provider-errors.js';

test('2. Cloudflare Workers AI Adapter Contract', async (t) => {
    // Generate a valid 1024x1024 mock image for test simulation
    const mockImageBuffer = await sharp({
        create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 50, g: 100, b: 200, alpha: 1 },
        },
    }).png().toBuffer();
    const mockBase64 = mockImageBuffer.toString('base64');

    await t.test('Rejects missing prompt or empty prompt with ProviderBadRequestError', async () => {
        await assert.rejects(
            () => generateViaCloudflare({ prompt: '' }),
            (err) => err instanceof ProviderBadRequestError
        );
        await assert.rejects(
            () => generateViaCloudflare({ prompt: '   ' }),
            (err) => err instanceof ProviderBadRequestError
        );
        await assert.rejects(
            () => generateViaCloudflare({ prompt: null }),
            (err) => err instanceof ProviderBadRequestError
        );
    });

    await t.test('Rejects missing Cloudflare credentials with ProviderAuthError', async () => {
        const envBackup = {};
        for (const key of Object.keys(process.env)) {
            if (/^(CLOUDFLARE|CF)_(ACCOUNT_ID|API_TOKEN)(_\d+)?$/.test(key)) {
                envBackup[key] = process.env[key];
                delete process.env[key];
            }
        }

        try {
            await assert.rejects(
                () => generateViaCloudflare({ prompt: 'A futuristic city' }),
                (err) => err instanceof ProviderAuthError && (err.message.includes('CLOUDFLARE_ACCOUNT_ID') || err.message.includes('CF_ACCOUNT_ID'))
            );

            process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
            await assert.rejects(
                () => generateViaCloudflare({ prompt: 'A futuristic city' }),
                (err) => err instanceof ProviderAuthError && (err.message.includes('CLOUDFLARE_API_TOKEN') || err.message.includes('CF_API_TOKEN'))
            );
        } finally {
            for (const key of Object.keys(process.env)) {
                if (/^(CLOUDFLARE|CF)_(ACCOUNT_ID|API_TOKEN)(_\d+)?$/.test(key)) {
                    delete process.env[key];
                }
            }
            Object.assign(process.env, envBackup);
        }
    });

    await t.test('Multi-key failover: Key #1 fails with 429 quota exhaustion, automatically falls over to Key #2', async () => {
        const envBackup = {};
        for (const key of Object.keys(process.env)) {
            if (/^(CLOUDFLARE|CF)_(ACCOUNT_ID|API_TOKEN)(_\d+)?$/.test(key)) {
                envBackup[key] = process.env[key];
                delete process.env[key];
            }
        }

        const origFetch = globalThis.fetch;
        process.env.CLOUDFLARE_ACCOUNT_ID = 'acct-key-1';
        process.env.CLOUDFLARE_API_TOKEN = 'token-key-1';
        process.env.CLOUDFLARE_ACCOUNT_ID_2 = 'acct-key-2';
        process.env.CLOUDFLARE_API_TOKEN_2 = 'token-key-2';

        const attempts = [];
        try {
            globalThis.fetch = async (url, options) => {
                const authHeader = options?.headers?.Authorization || '';
                attempts.push(authHeader);

                if (authHeader.includes('token-key-1')) {
                    return {
                        ok: false,
                        status: 429,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({
                            success: false,
                            errors: [{ code: 10015, message: 'Daily free neuron quota reached' }],
                        }),
                    };
                }

                if (authHeader.includes('token-key-2')) {
                    return {
                        ok: true,
                        status: 200,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({
                            result: { image: mockBase64 },
                            success: true,
                            errors: [],
                        }),
                    };
                }

                throw new Error(`Unexpected token in test: ${authHeader}`);
            };

            const result = await generateViaCloudflare({
                prompt: 'A tranquil cybernetic garden',
                targetWidth: 1024,
                targetHeight: 1024,
            });

            assert.equal(result.provider, 'cloudflare');
            assert.equal(result.metadata.keyIndex, 2, 'Should indicate success with 2nd credential slot (slot 2)');
            assert.equal(result.metadata.poolSize, 2);
            assert.equal(attempts.length, 2, 'Should have attempted Key #1 then Key #2');
            assert.ok(Buffer.isBuffer(result.buffer));
        } finally {
            globalThis.fetch = origFetch;
            for (const key of Object.keys(process.env)) {
                if (/^(CLOUDFLARE|CF)_(ACCOUNT_ID|API_TOKEN)(_\d+)?$/.test(key)) {
                    delete process.env[key];
                }
            }
            Object.assign(process.env, envBackup);
        }
    });

    await t.test('Aspect ratio processing produces deterministic dimensions', async () => {
        // Landscape 16:9 (1360x768)
        const landscape = await applyAspectRatioProcessing(mockImageBuffer, 1360, 768, 'crop_to_fill');
        assert.equal(landscape.width, 1360);
        assert.equal(landscape.height, 768);
        const metaLand = await sharp(landscape.buffer).metadata();
        assert.equal(metaLand.width, 1360);
        assert.equal(metaLand.height, 768);

        // Portrait 9:16 (768x1360)
        const portrait = await applyAspectRatioProcessing(mockImageBuffer, 768, 1360, 'crop_to_fill');
        assert.equal(portrait.width, 768);
        assert.equal(portrait.height, 1360);
        const metaPort = await sharp(portrait.buffer).metadata();
        assert.equal(metaPort.width, 768);
        assert.equal(metaPort.height, 1360);

        // Contain pad mode
        const contain = await applyAspectRatioProcessing(mockImageBuffer, 1360, 768, 'contain_pad');
        assert.equal(contain.processingMode, 'contain_pad');
        const metaContain = await sharp(contain.buffer).metadata();
        assert.equal(metaContain.width, 1360);
        assert.equal(metaContain.height, 768);
    });

    await t.test('Decodes Base64 response successfully and returns normalized structure', async () => {
        const origAcct = process.env.CLOUDFLARE_ACCOUNT_ID;
        const origToken = process.env.CLOUDFLARE_API_TOKEN;
        const origFetch = globalThis.fetch;

        process.env.CLOUDFLARE_ACCOUNT_ID = 'mock-account-123';
        process.env.CLOUDFLARE_API_TOKEN = 'mock-token-xyz';

        try {
            globalThis.fetch = async (url, options) => {
                assert.ok(url.includes('@cf/black-forest-labs/flux-1-schnell'));
                assert.equal(options.headers.Authorization, 'Bearer mock-token-xyz');
                const reqBody = JSON.parse(options.body);
                assert.equal(reqBody.prompt, 'Mountain sunrise');
                assert.equal(reqBody.steps, 4);

                return {
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: async () => ({
                        result: { image: mockBase64 },
                        success: true,
                        errors: [],
                    }),
                };
            };

            const result = await generateViaCloudflare({
                prompt: 'Mountain sunrise',
                steps: 4,
                targetWidth: 1024,
                targetHeight: 1024,
            });

            assert.equal(result.provider, 'cloudflare');
            assert.equal(result.model, '@cf/black-forest-labs/flux-1-schnell');
            assert.equal(result.width, 1024);
            assert.equal(result.height, 1024);
            assert.ok(Buffer.isBuffer(result.buffer));
            assert.equal(result.generationType, 'text-to-image');
        } finally {
            globalThis.fetch = origFetch;
            if (origAcct) process.env.CLOUDFLARE_ACCOUNT_ID = origAcct;
            else delete process.env.CLOUDFLARE_ACCOUNT_ID;
            if (origToken) process.env.CLOUDFLARE_API_TOKEN = origToken;
            else delete process.env.CLOUDFLARE_API_TOKEN;
        }
    });

    await t.test('Correctly maps Cloudflare error codes (401, 429, 500)', async () => {
        const origAcct = process.env.CLOUDFLARE_ACCOUNT_ID;
        const origToken = process.env.CLOUDFLARE_API_TOKEN;
        const origFetch = globalThis.fetch;

        process.env.CLOUDFLARE_ACCOUNT_ID = 'mock-account-123';
        process.env.CLOUDFLARE_API_TOKEN = 'mock-token-xyz';

        try {
            // 401 Auth error
            globalThis.fetch = async () => ({
                ok: false,
                status: 401,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: async () => ({ errors: [{ code: 10000, message: 'Authentication error' }] }),
            });
            await assert.rejects(
                () => generateViaCloudflare({ prompt: 'test' }),
                (err) => err instanceof ProviderAuthError && err.statusCode === 401
            );

            // 429 Rate limit / Quota error
            globalThis.fetch = async () => ({
                ok: false,
                status: 429,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: async () => ({ message: 'Rate limit exceeded' }),
            });
            await assert.rejects(
                () => generateViaCloudflare({ prompt: 'test' }),
                (err) => err instanceof ProviderQuotaError && err.statusCode === 429
            );

            // 500 Upstream failure
            globalThis.fetch = async () => ({
                ok: false,
                status: 500,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: async () => ({ message: 'Workers AI internal error' }),
            });
            await assert.rejects(
                () => generateViaCloudflare({ prompt: 'test' }),
                (err) => err instanceof ProviderUnavailableError && err.statusCode === 500
            );
        } finally {
            globalThis.fetch = origFetch;
            if (origAcct) process.env.CLOUDFLARE_ACCOUNT_ID = origAcct;
            else delete process.env.CLOUDFLARE_ACCOUNT_ID;
            if (origToken) process.env.CLOUDFLARE_API_TOKEN = origToken;
            else delete process.env.CLOUDFLARE_API_TOKEN;
        }
    });
});
