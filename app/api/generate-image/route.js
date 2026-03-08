import { NextResponse } from 'next/server';
import { databases, storage, DB_ID, BUCKET_ID, ID, Query, Permission, Role, createAppwriteFile } from '@/services/appwrite-admin';
import { IMAGE_GENERATION_COLLECTION_ID } from '@/services/appwrite-collections';
import { v4 as uuidv4 } from 'uuid';
import { checkImageGenerationLimit } from '@/lib/planUtils-server';
import sharp from 'sharp';
import { DEFAULT_MODEL_ID, IMAGE_MODELS, getModelById, getProviderIdByModelId } from '@/lib/hf-image-config';

const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';
const HF_MAX_RETRIES = 3;
const HF_RETRY_DELAY_MS = 20000;

const LEONARDO_API_BASE = (process.env.LEONARDO_API_BASE || process.env.LEONARDO_BASE_URL || 'https://cloud.leonardo.ai/api/rest/v1').trim();
const LEONARDO_MAX_POLL_ATTEMPTS = 40;
const LEONARDO_POLL_INTERVAL_MS = 1500;
const APPWRITE_PUBLIC_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '';

function getPublicFileUrl(fileId) {
    return `${APPWRITE_PUBLIC_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PUBLIC_PROJECT_ID}`;
}

function getProxyFileUrl(fileId, userEmail, libId) {
    const params = new URLSearchParams({ fileId });
    if (userEmail) params.set('userEmail', userEmail);
    if (libId) params.set('libId', libId);
    return `/api/generate-image/file?${params.toString()}`;
}

function normalizeDisplayUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';

    try {
        const parsed = new URL(rawUrl);
        parsed.searchParams.delete('mode');
        return parsed.toString();
    } catch (_) {
        return rawUrl
            .replace(/[?&]mode=admin/g, '')
            .replace('?&', '?')
            .replace(/\?$/, '');
    }
}

function normalizeGenerationDocument(doc) {
    if (!doc) return doc;

    const normalizedLibId = doc.libId || doc.$id;
    const proxyUrl = doc.generatedImagePath
        ? getProxyFileUrl(doc.generatedImagePath, doc.userEmail, normalizedLibId)
        : '';

    return {
        ...doc,
        libId: normalizedLibId,
        publicUrl: proxyUrl || normalizeDisplayUrl(doc.publicUrl) || (doc.generatedImagePath ? getPublicFileUrl(doc.generatedImagePath) : null),
    };
}

function getHFAPIKeysInOrder() {
    const keySlots = [
        [
            // process.env.HF_API_KEY_1,
            // process.env.HUGGINGFACE_API_KEY_1,
            // process.env.HF_API_KEY,
            // process.env.HUGGINGFACE_API_KEY,
            process.env.NEXT_PUBLIC_HF_API_KEY,
        ],
        [
            // process.env.HF_API_KEY_2,
            // process.env.HUGGINGFACE_API_KEY_2,
            process.env.NEXT_PUBLIC_HF_API_KEY_2,
        ],
        [
            // process.env.HF_API_KEY_3,
            // process.env.HUGGINGFACE_API_KEY_3,
            process.env.NEXT_PUBLIC_HF_API_KEY_3,
        ],
        [
            // process.env.HF_API_KEY_4,
            // process.env.HUGGINGFACE_API_KEY_4,
            process.env.NEXT_PUBLIC_HF_API_KEY_4,
        ],
    ];

    const normalized = keySlots
        .map((slot) => slot.find((value) => value && value.trim() !== '')?.trim())
        .filter(Boolean);

    // Prevent trying the same key multiple times when aliases are configured.
    return [...new Set(normalized)];
}

/**
 * Call the Hugging Face Inference API for text-to-image generation.
 * Retries up to HF_MAX_RETRIES times on 503 (model cold-start).
 * Returns a Buffer containing the raw image bytes.
 */
async function generateHFImage(prompt, modelId, width, height) {
    const apiKeys = getHFAPIKeysInOrder();
    if (apiKeys.length === 0) {
        throw new Error('Hugging Face API key is not configured. Add HF_API_KEY_1 (and optional HF_API_KEY_2/3/4) to your .env file.');
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

            // Invalid prompt/content/safety errors should fail fast (no key fallback needed).
            if (response.status === 400) {
                throw new Error(`Hugging Face API error ${response.status}: ${msg}`);
            }

            // Key/auth/quota/server style errors: move to next configured key.
            if ([401, 403, 429, 500, 502, 504].includes(response.status)) {
                keyErrors.push(`Key #${keyIndex + 1} failed with ${response.status}: ${msg}`);
                break;
            }

            keyErrors.push(`Key #${keyIndex + 1} failed with ${response.status}: ${msg}`);
            break;
        }
    }

    throw new Error(`All configured Hugging Face API keys failed. ${keyErrors.join(' | ')}`);
}

function getLeonardoApiKeysInOrder() {
    const keySlots = [
        [
            // process.env.LEONARDO_API_KEY_1,
            // process.env.LEONARDOAI_API_KEY_1,
            process.env.LEONARDO_API_KEY,
            // process.env.LEONARDOAI_API_KEY,
            // process.env.LEONARDO_KEY,
            // process.env.NEXT_PUBLIC_LEONARDO_API_KEY,
        ],
        [
            process.env.LEONARDO_API_KEY_2,
            // process.env.LEONARDOAI_API_KEY_2,
            // process.env.NEXT_PUBLIC_LEONARDO_API_KEY_2,
        ],
        [
            process.env.LEONARDO_API_KEY_3,
            // process.env.LEONARDOAI_API_KEY_3,
            // process.env.NEXT_PUBLIC_LEONARDO_API_KEY_3,
        ],
        [
            process.env.LEONARDO_API_KEY_4,
            // process.env.LEONARDOAI_API_KEY_4,
            // process.env.NEXT_PUBLIC_LEONARDO_API_KEY_4,
        ],
    ];

    const normalized = keySlots
        .map((slot) => slot.find((value) => value && value.trim() !== '')?.trim())
        .filter(Boolean);

    // Prevent duplicate attempts when aliases reference the same key.
    return [...new Set(normalized)];
}

function extractLeonardoGenerationId(payload) {
    return payload?.sdGenerationJob?.generationId
        || payload?.generationId
        || payload?.id
        || payload?.data?.generationId
        || payload?.data?.id
        || null;
}

function extractLeonardoStatus(payload) {
    return payload?.status
        || payload?.sdGenerationJob?.status
        || payload?.generations_by_pk?.status
        || payload?.generation?.status
        || null;
}

function extractLeonardoImageUrl(payload) {
    return payload?.generated_images?.[0]?.url
        || payload?.generation?.generated_images?.[0]?.url
        || payload?.generations_by_pk?.generated_images?.[0]?.url
        || payload?.data?.generated_images?.[0]?.url
        || payload?.data?.generation?.generated_images?.[0]?.url
        || payload?.generatedImages?.[0]?.url
        || payload?.images?.[0]?.url
        || payload?.imageUrl
        || payload?.url
        || null;
}

function mapLeonardoError(status, bodyText) {
    if (status === 401 || status === 403) {
        return `Leonardo authentication failed (${status}). ${bodyText}`;
    }
    if (status === 429) {
        return `Leonardo rate limit reached (429). ${bodyText}`;
    }
    if (status === 400) {
        return `Leonardo request validation failed (400). ${bodyText}`;
    }
    return `Leonardo API error ${status}. ${bodyText}`;
}

function isLeonardoFallbackStatus(status) {
    return [401, 403, 429, 500, 502, 503, 504].includes(status);
}

function normalizeLeonardoDimensions(width, height) {
    // Backward compatibility: an earlier config exposed 1376x786, but Leonardo expects 1376x768.
    if (width === 1376 && height === 786) {
        return { width: 1376, height: 768 };
    }

    // Backward compatibility: older UI values used FLUX HF-oriented 9:16 dimensions.
    if (width === 768 && height === 1360) {
        return { width: 768, height: 1376 };
    }

    return { width, height };
}

function isLeonardoDimensionInApiRange(width, height) {
    const valid = (value) => Number.isInteger(value) && value >= 32 && value <= 1536 && value % 8 === 0;
    return valid(width) && valid(height);
}

async function parseResponsePayload(response) {
    if (response.headers.get('content-type')?.includes('application/json')) {
        return response.json();
    }
    const text = await response.text();
    return { message: text };
}

async function generateLeonardoImageWithKey(apiKey, prompt, modelId, width, height) {
    const createResponse = await fetch(`${LEONARDO_API_BASE}/generations`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            modelId,
            prompt,
            width,
            height,
            num_images: 1,
            contrast: 3.5,
            enhancePrompt: false,
        }),
    });

    const createPayload = await parseResponsePayload(createResponse);
    if (!createResponse.ok) {
        const bodyText = createPayload?.error || createPayload?.message || createResponse.statusText;
        const error = new Error(mapLeonardoError(createResponse.status, bodyText));
        error.status = createResponse.status;
        throw error;
    }

    const generationId = extractLeonardoGenerationId(createPayload);
    if (!generationId) {
        throw new Error('Leonardo did not return a generation id.');
    }

    let finalImageUrl = extractLeonardoImageUrl(createPayload);

    if (!finalImageUrl) {
        for (let attempt = 1; attempt <= LEONARDO_MAX_POLL_ATTEMPTS; attempt++) {
            const pollResponse = await fetch(`${LEONARDO_API_BASE}/generations/${generationId}`, {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
            });

            const pollPayload = await parseResponsePayload(pollResponse);
            if (!pollResponse.ok) {
                const bodyText = pollPayload?.error || pollPayload?.message || pollResponse.statusText;
                const error = new Error(mapLeonardoError(pollResponse.status, bodyText));
                error.status = pollResponse.status;
                throw error;
            }

            finalImageUrl = extractLeonardoImageUrl(pollPayload);
            const status = (extractLeonardoStatus(pollPayload) || '').toString().toUpperCase();

            if (finalImageUrl) {
                break;
            }

            if (status.includes('FAIL') || status.includes('ERROR') || status.includes('CANCEL')) {
                throw new Error(`Leonardo generation failed with status: ${status || 'UNKNOWN'}`);
            }

            if (attempt < LEONARDO_MAX_POLL_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, LEONARDO_POLL_INTERVAL_MS));
            }
        }
    }

    if (!finalImageUrl) {
        throw new Error('Leonardo generation timed out before an image URL was available.');
    }

    const imageResponse = await fetch(finalImageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to download generated Leonardo image (${imageResponse.status}).`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function generateLeonardoImage(prompt, modelId, width, height) {
    const apiKeys = getLeonardoApiKeysInOrder();
    if (apiKeys.length === 0) {
        throw new Error('Leonardo API key is not configured. Add LEONARDO_API_KEY_1 (or LEONARDO_API_KEY) and optional LEONARDO_API_KEY_2/3/4 to your .env.local.');
    }

    const keyErrors = [];

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
        const apiKey = apiKeys[keyIndex];
        try {
            return await generateLeonardoImageWithKey(apiKey, prompt, modelId, width, height);
        } catch (error) {
            const status = error?.status;
            const message = error?.message || 'Unknown Leonardo error';

            // Request/prompt validation errors should fail fast without trying other keys.
            if (status === 400) {
                throw error;
            }

            // Switch to the next key only for key/quota/upstream issues.
            if (status && isLeonardoFallbackStatus(status)) {
                keyErrors.push(`Key #${keyIndex + 1} failed with ${status}: ${message}`);
                continue;
            }

            // Network-level failures can be key or transient-route related; attempt next key.
            if (error instanceof TypeError) {
                keyErrors.push(`Key #${keyIndex + 1} network error: ${message}`);
                continue;
            }

            // Non-key runtime failures should surface immediately.
            throw error;
        }
    }

    throw new Error(`All configured Leonardo API keys failed. ${keyErrors.join(' | ')}`);
}

// GET method for fetching generation status
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const libId = searchParams.get('libId');
    const userEmail = searchParams.get('userEmail');

    if (!libId) {
        return NextResponse.json({ error: 'libId is required' }, { status: 400 });
    }

    try {
        const queries = [
            Query.equal('libId', libId),
            Query.orderDesc('$createdAt'),
            Query.limit(200),
        ];

        if (userEmail) {
            queries.unshift(Query.equal('userEmail', userEmail));
        }

        const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, queries);
        const normalizedGenerations = (res.documents || []).map(normalizeGenerationDocument);

        return NextResponse.json({
            success: true,
            libId,
            generations: normalizedGenerations,
        });
    } catch (error) {
        console.error('Error fetching image generation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST method for generating images
export async function POST(request) {
    // Declared outside try so they are accessible in the catch block
    let generationId;
    let docId;
    let selectedProvider = 'huggingface';

    try {
        const { prompt, model, width, height, referenceImage, libId, userEmail, provider } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!userEmail) {
            return NextResponse.json({ error: 'User email is required' }, { status: 400 });
        }

        // Check user's plan and daily image generation limit
        const limitCheck = await checkImageGenerationLimit(userEmail);
        if (!limitCheck.canGenerate) {
            return NextResponse.json({
                error: 'Image generation limit exceeded',
                details: limitCheck.message,
                dailyCount: limitCheck.dailyCount,
                dailyLimit: limitCheck.dailyLimit,
                plan: limitCheck.plan,
                limitExceeded: true,
            }, { status: 403 });
        }

        generationId = libId || uuidv4();
        const selectedModel = model || DEFAULT_MODEL_ID;

        const providerFromModel = getProviderIdByModelId(selectedModel);
        selectedProvider = provider || providerFromModel;

        const modelConfig = getModelById(selectedModel, selectedProvider);
        if (!modelConfig || modelConfig.id !== selectedModel) {
            return NextResponse.json({
                error: `Invalid model: ${selectedModel}. Valid models: ${IMAGE_MODELS.map((m) => m.id).join(', ')}`,
                libId: generationId,
            }, { status: 400 });
        }

        if (provider && modelConfig.provider !== provider) {
            return NextResponse.json({
                error: `Model ${selectedModel} does not belong to provider ${provider}.`,
                libId: generationId,
            }, { status: 400 });
        }

        selectedProvider = modelConfig.provider;

        // Normalize dimension types because some stored values can arrive as strings.
        const requestedWidth = width !== undefined && width !== null ? Number(width) : null;
        const requestedHeight = height !== undefined && height !== null ? Number(height) : null;

        if ((requestedWidth !== null && !Number.isFinite(requestedWidth)) || (requestedHeight !== null && !Number.isFinite(requestedHeight))) {
            return NextResponse.json({
                error: `Invalid dimensions received. width=${width}, height=${height}`,
                libId: generationId,
            }, { status: 400 });
        }

        // Validate dimensions against this model's supported ratios
        let targetWidth = Number.isFinite(requestedWidth) ? Math.trunc(requestedWidth) : modelConfig.ratios[0].width;
        let targetHeight = Number.isFinite(requestedHeight) ? Math.trunc(requestedHeight) : modelConfig.ratios[0].height;

        if (selectedProvider === 'leonardo') {
            const normalized = normalizeLeonardoDimensions(targetWidth, targetHeight);
            targetWidth = normalized.width;
            targetHeight = normalized.height;
        }

        const matchedRatio = modelConfig.ratios.find((r) => r.width === targetWidth && r.height === targetHeight);
        const allowLeonardoCustomDimension = selectedProvider === 'leonardo' && isLeonardoDimensionInApiRange(targetWidth, targetHeight);

        if (!matchedRatio && !allowLeonardoCustomDimension) {
            return NextResponse.json({
                error: `Unsupported dimensions ${targetWidth}x${targetHeight} for ${modelConfig.name}. Supported: ${modelConfig.ratios.map((r) => `${r.width}x${r.height}`).join(', ')}`,
                libId: generationId,
            }, { status: 400 });
        }

        const aspectRatio = matchedRatio?.value || `${targetWidth}x${targetHeight}`;

        // referenceImage is intentionally kept for future image-guidance support.
        void referenceImage;

        // Create a new Appwrite record for each generation within the same conversation libId
        try {
            const insertDoc = await databases.createDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, ID.unique(), {
                libId: generationId,
                prompt,
                userEmail,
                model: selectedModel,
                width: targetWidth,
                height: targetHeight,
                status: 'generating',
                created_at: new Date().toISOString(),
            });
            docId = insertDoc.$id;
        } catch (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json({
                error: 'Failed to create/update image generation record',
                details: dbError.message,
            }, { status: 500 });
        }

        let imageBuffer;
        if (selectedProvider === 'leonardo') {
            imageBuffer = await generateLeonardoImage(prompt, selectedModel, targetWidth, targetHeight);
        } else {
            imageBuffer = await generateHFImage(prompt, selectedModel, targetWidth, targetHeight);
        }

        // Convert to PNG (handles any format provider might return)
        let processedImageBuffer;
        try {
            processedImageBuffer = await sharp(imageBuffer).png().toBuffer();
        } catch (sharpError) {
            console.error('Sharp processing error:', sharpError);
            processedImageBuffer = imageBuffer;
        }

        // Upload to Appwrite Storage
        const safeName = selectedModel.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${selectedProvider}_${safeName}_${generationId}_${targetWidth}x${targetHeight}_${Date.now()}.png`;
        const uploadFile = createAppwriteFile(processedImageBuffer, fileName, 'image/png');

        let uploaded;
        try {
            // Permission.read(Role.any()) makes the file publicly readable in the browser
            uploaded = await storage.createFile(BUCKET_ID, ID.unique(), uploadFile, [
                Permission.read(Role.any()),
            ]);
        } catch (uploadError) {
            console.error('Storage upload error:', uploadError);
            if (docId) {
                await databases.updateDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, docId, {
                    status: 'failed',
                }).catch(console.error);
            }
            throw new Error('Failed to save generated image to storage');
        }

        const fileId = uploaded.$id;
        // Store user-facing URL (never admin-mode) and return a proxy display URL for clients.
        const publicUrl = getPublicFileUrl(fileId);

        // Mark record as completed
        let completedDoc = null;
        try {
            completedDoc = await databases.updateDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, docId, {
                publicUrl,
                generatedImagePath: fileId,
                status: 'completed',
            });
        } catch (updateErr) {
            // Log but don't fail - image is already saved in storage
            console.error('Failed to mark generation as completed in DB:', updateErr);
        }

        return NextResponse.json({
            success: true,
            imageUrl: publicUrl,
            displayUrl: getProxyFileUrl(fileId, userEmail, generationId),
            libId: generationId,
            model: selectedModel,
            modelName: modelConfig.name,
            prompt,
            aspectRatio,
            provider: selectedProvider,
            dimensions: aspectRatio,
            generation: completedDoc,
            message: `Image generated successfully with ${modelConfig.name} via ${selectedProvider === 'leonardo' ? 'Leonardo AI' : 'Hugging Face'}`,
        });
    } catch (error) {
        console.error('Image generation error:', error);

        if (generationId && docId) {
            await databases.updateDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, docId, {
                status: 'failed',
            }).catch((dbErr) => console.error('Failed to update error status:', dbErr));
        }

        let statusCode = 500;
        let errorMessage = error.message;

        if (error.message.includes('API key') || error.message.includes('configured') || error.message.includes('authentication')) {
            statusCode = 401;
        } else if (error.message.includes('loading') || error.message.includes('unavailable') || error.message.includes('timed out')) {
            statusCode = 503;
        } else if (error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('Rate limit')) {
            statusCode = 429;
            errorMessage = 'Rate limit reached. Please wait a moment and try again.';
        } else if (error.message.includes('NSFW') || error.message.includes('content policy') || error.message.includes('safety')) {
            statusCode = 400;
            errorMessage = 'The prompt may violate content policy. Please modify your prompt and try again.';
        }

        return NextResponse.json({
            error: 'Image generation failed',
            details: errorMessage,
            provider: selectedProvider,
            libId: generationId,
        }, { status: statusCode });
    }
}
