import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
    generateViaModelScope,
    isModelScopeCommercialVerified,
} from '@/lib/image-providers/modelscope.js';
import {
    ProviderAuthError,
    ProviderBadRequestError,
    ImageProviderError,
} from '@/lib/image-providers/provider-errors.js';

test('3. ModelScope Qwen Image 2.1 Adapter Contract', async (t) => {
    const mockImageBuffer = await sharp({
        create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 80, g: 160, b: 240, alpha: 1 },
        },
    }).png().toBuffer();
    const mockBase64 = mockImageBuffer.toString('base64');

    await t.test('Rejects missing token with ProviderAuthError', async () => {
        const envBackup = {};
        for (const key of Object.keys(process.env)) {
            if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                envBackup[key] = process.env[key];
                delete process.env[key];
            }
        }

        try {
            await assert.rejects(
                () => generateViaModelScope({ prompt: 'Cyberpunk landscape' }),
                (err) => err instanceof ProviderAuthError && err.message.includes('MODELSCOPE_API_TOKEN')
            );
        } finally {
            for (const key of Object.keys(process.env)) {
                if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                    delete process.env[key];
                }
            }
            Object.assign(process.env, envBackup);
        }
    });

    await t.test('Enforces commercial license protection in commercial mode', async () => {
        const origVerified = process.env.MODELSCOPE_COMMERCIAL_VERIFIED;
        const envBackup = {};
        for (const key of Object.keys(process.env)) {
            if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                envBackup[key] = process.env[key];
                delete process.env[key];
            }
        }
        process.env.MODELSCOPE_API_TOKEN = 'ms-token-123';

        try {
            delete process.env.MODELSCOPE_COMMERCIAL_VERIFIED;
            assert.equal(isModelScopeCommercialVerified(), false);

            await assert.rejects(
                () => generateViaModelScope({ prompt: 'test', requireCommercialApproval: true }),
                (err) => err instanceof ProviderBadRequestError && err.code === 'COMMERCIAL_LICENSE_RESTRICTED'
            );
        } finally {
            if (origVerified) process.env.MODELSCOPE_COMMERCIAL_VERIFIED = origVerified;
            else delete process.env.MODELSCOPE_COMMERCIAL_VERIFIED;
            for (const key of Object.keys(process.env)) {
                if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                    delete process.env[key];
                }
            }
            Object.assign(process.env, envBackup);
        }
    });

    await t.test('Multi-token failover: Token #1 fails with Alibaba binding error, automatically falls over to Token #2', async () => {
        const envBackup = {};
        for (const key of Object.keys(process.env)) {
            if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                envBackup[key] = process.env[key];
                delete process.env[key];
            }
        }

        const origFetch = globalThis.fetch;
        process.env.MODELSCOPE_API_TOKEN = 'ms-token-unbound';
        process.env.MODELSCOPE_API_TOKEN_2 = 'ms-token-bound';

        const attempts = [];
        try {
            globalThis.fetch = async (url, options) => {
                const authHeader = options?.headers?.Authorization || '';

                // Task creation endpoint (method POST)
                if ((url.endsWith('/images/generations') || url.endsWith('/tasks')) && options?.method === 'POST') {
                    attempts.push(authHeader);

                    if (authHeader.includes('ms-token-unbound')) {
                        return {
                            ok: false,
                            status: 401,
                            headers: new Headers({ 'content-type': 'application/json' }),
                            json: async () => ({
                                errors: {
                                    message: 'Please bind your Alibaba Cloud account before use https://modelscope.ai/my/settings/account',
                                },
                            }),
                        };
                    }

                    if (authHeader.includes('ms-token-bound')) {
                        return {
                            ok: true,
                            status: 200,
                            headers: new Headers({ 'content-type': 'application/json' }),
                            json: async () => ({ task_id: 'task-failover-success' }),
                        };
                    }
                }

                // Polling endpoint for token 2
                if (url.includes('/tasks/task-failover-success')) {
                    return {
                        ok: true,
                        status: 200,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({
                            task_status: 'SUCCEEDED',
                            output: {
                                results: [{ b64_image: mockBase64 }],
                            },
                        }),
                    };
                }

                throw new Error(`Unexpected URL in failover test: ${url}`);
            };

            const result = await generateViaModelScope({
                prompt: 'Golden hour mountains',
                targetWidth: 1024,
                targetHeight: 1024,
            });

            assert.equal(result.provider, 'modelscope');
            assert.equal(result.metadata.keyIndex, 2, 'Should have succeeded with token slot 2');
            assert.equal(result.metadata.poolSize, 2);
            assert.equal(attempts.length, 2, 'Should have attempted Token #1 then Token #2');
            assert.ok(Buffer.isBuffer(result.buffer));
        } finally {
            globalThis.fetch = origFetch;
            for (const key of Object.keys(process.env)) {
                if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                    delete process.env[key];
                }
            }
            Object.assign(process.env, envBackup);
        }
    });

    await t.test('Async task lifecycle: submits task, polls status, decodes output', async () => {
        const envBackup = {};
        for (const key of Object.keys(process.env)) {
            if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                envBackup[key] = process.env[key];
                delete process.env[key];
            }
        }
        process.env.MODELSCOPE_API_TOKEN = 'ms-token-valid';
        const origFetch = globalThis.fetch;

        let pollCount = 0;
        try {
            globalThis.fetch = async (url, options) => {
                // 1. Task submission (handles both images/generations and legacy tasks endpoints)
                if ((url.endsWith('/images/generations') || url.endsWith('/tasks')) && options?.method === 'POST') {
                    return {
                        ok: true,
                        status: 200,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({ task_id: 'task-abc-123' }),
                    };
                }

                // 2. Task polling
                if (url.includes('/tasks/task-abc-123')) {
                    pollCount++;
                    if (pollCount === 1) {
                        return {
                            ok: true,
                            status: 200,
                            headers: new Headers({ 'content-type': 'application/json' }),
                            json: async () => ({ task_status: 'RUNNING' }),
                        };
                    }
                    return {
                        ok: true,
                        status: 200,
                        headers: new Headers({ 'content-type': 'application/json' }),
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

            const result = await generateViaModelScope({
                prompt: 'Golden hour mountains',
                targetWidth: 1024,
                targetHeight: 1024,
            });

            assert.equal(result.provider, 'modelscope');
            assert.equal(result.model, 'Qwen/Qwen-Image-2.1');
            assert.equal(result.metadata.taskId, 'task-abc-123');
            assert.ok(Buffer.isBuffer(result.buffer));
            assert.equal(pollCount, 2, 'Should have polled until SUCCEEDED');
        } finally {
            globalThis.fetch = origFetch;
            for (const key of Object.keys(process.env)) {
                if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                    delete process.env[key];
                }
            }
            Object.assign(process.env, envBackup);
        }
    });

    await t.test('SSRF Protection: blocks private IPs and untrusted domains on image download', async () => {
        const envBackup = {};
        for (const key of Object.keys(process.env)) {
            if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                envBackup[key] = process.env[key];
                delete process.env[key];
            }
        }
        process.env.MODELSCOPE_API_TOKEN = 'ms-token-valid';
        const origFetch = globalThis.fetch;

        try {
            // Task poll returns an untrusted/SSRF URL
            globalThis.fetch = async (url, options) => {
                if ((url.endsWith('/images/generations') || url.endsWith('/tasks')) && options?.method === 'POST') {
                    return {
                        ok: true,
                        status: 200,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({ task_id: 'task-ssrf-attack' }),
                    };
                }

                if (url.includes('/tasks/task-ssrf-attack')) {
                    return {
                        ok: true,
                        status: 200,
                        headers: new Headers({ 'content-type': 'application/json' }),
                        json: async () => ({
                            task_status: 'SUCCEEDED',
                            output: {
                                results: [{ url: 'https://169.254.169.254/latest/meta-data/' }],
                            },
                        }),
                    };
                }

                throw new Error(`Unexpected URL: ${url}`);
            };

            await assert.rejects(
                () => generateViaModelScope({ prompt: 'test' }),
                (err) => err instanceof ImageProviderError && err.code === 'SSRF_BLOCKED'
            );
        } finally {
            globalThis.fetch = origFetch;
            for (const key of Object.keys(process.env)) {
                if (/^MODELSCOPE_API_TOKEN(_\d+)?$/.test(key)) {
                    delete process.env[key];
                }
            }
            Object.assign(process.env, envBackup);
        }
    });
});
