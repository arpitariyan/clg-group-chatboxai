import { NextResponse } from 'next/server';
import { databases, storage, DB_ID, BUCKET_ID, ID, Query, Permission, Role, createAppwriteFile } from '@/services/appwrite-admin';
import { IMAGE_GENERATION_COLLECTION_ID } from '@/services/appwrite-collections';
import { v4 as uuidv4 } from 'uuid';
import { checkImageGenerationLimit } from '@/lib/planUtils-server';
import sharp from 'sharp';
import {
    DEFAULT_MODEL_ID,
    DEFAULT_PROVIDER_ID,
    IMAGE_MODELS,
    getModelById,
    getProviderIdByModelId,
    GENERATION_MODES,
    supportsImageToImage,
    getDefaultImageToImageModelForProvider,
} from '@/lib/hf-image-config';
import { withUser } from '@/lib/request-context';
import { generateImage } from '@/lib/image-providers/index.js';
import {
    ImageProviderError,
    ProviderAuthError,
    ProviderQuotaError,
    ProviderRateLimitError,
    ProviderContentPolicyError,
    ProviderBadRequestError,
    ProviderTimeoutError,
    ProviderUnavailableError,
} from '@/lib/image-providers/provider-errors.js';

const APPWRITE_PUBLIC_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '';

/**
 * Maximum reference image size: 20MB as base64 or 100MB as file from storage.
 */
const MAX_REFERENCE_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

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

function enhancePromptForQuality(prompt, { aspectRatio = '', generationMode = GENERATION_MODES.TEXT_TO_IMAGE } = {}) {
    const normalizedPrompt = String(prompt || '').trim().replace(/\s+/g, ' ');
    if (!normalizedPrompt) return normalizedPrompt;

    const wordCount = normalizedPrompt.split(' ').filter(Boolean).length;
    let qualitySuffix = 'high quality, detailed, clean composition';

    if (wordCount >= 20) {
        qualitySuffix = 'ultra-detailed, refined lighting, sharp focus, rich texture detail';
    } else if (wordCount >= 10) {
        qualitySuffix = 'highly detailed, polished lighting, crisp textures';
    }

    const aspectRatioCue = aspectRatio && aspectRatio !== '1:1'
        ? `balanced composition optimized for ${aspectRatio}`
        : 'balanced composition';

    const editCue = generationMode === GENERATION_MODES.IMAGE_TO_IMAGE
        ? 'preserve the original structure while refining the requested changes'
        : 'strong visual clarity and coherent composition';

    return `${normalizedPrompt}, ${qualitySuffix}, ${aspectRatioCue}, ${editCue}`;
}

/**
 * Fetch reference image from a URL and convert to Buffer.
 */
async function fetchReferenceImageBuffer(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Reference image URL is required for image-to-image mode.');
    }

    try {
        const response = await fetch(imageUrl, { timeout: 10000 });
        if (!response.ok) {
            throw new Error(`Failed to fetch reference image (${response.status}): ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
            throw new Error(`Invalid reference image format. Expected JPEG, PNG, or WebP; got ${contentType}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_REFERENCE_IMAGE_SIZE_BYTES) {
            throw new Error(`Reference image is too large (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB). Max size is 20MB.`);
        }

        return Buffer.from(arrayBuffer);
    } catch (error) {
        if (error.message.includes('Reference image') || error.message.includes('Invalid') || error.message.includes('too large')) {
            throw error;
        }
        throw new Error(`Failed to load reference image: ${error.message}`);
    }
}

/**
 * Decode base64 image string to Buffer.
 */
function decodeBase64ReferenceImage(base64String) {
    if (!base64String || typeof base64String !== 'string') {
        throw new Error('Reference image base64 is required for image-to-image mode.');
    }

    try {
        let base64Data = base64String;
        if (base64Data.includes(',')) {
            const parts = base64Data.split(',');
            base64Data = parts[1];
        }

        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.byteLength > MAX_REFERENCE_IMAGE_SIZE_BYTES) {
            throw new Error(`Reference image is too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Max size is 20MB.`);
        }

        return buffer;
    } catch (error) {
        if (error.message.includes('too large')) {
            throw error;
        }
        throw new Error(`Failed to decode reference image: ${error.message}`);
    }
}

/**
 * Parse and normalize reference image from request.
 */
async function parseReferenceImage(referenceImageUrl, referenceImageBase64) {
    if (!referenceImageUrl && !referenceImageBase64) {
        return null;
    }

    if (referenceImageBase64) {
        return decodeBase64ReferenceImage(referenceImageBase64);
    }

    if (referenceImageUrl) {
        return fetchReferenceImageBuffer(referenceImageUrl);
    }

    return null;
}

/**
 * Determine the generation mode based on whether a reference image is present.
 */
function determineGenerationMode(referenceImageBuffer, selectedModel, selectedProvider) {
    const isEditMode = referenceImageBuffer !== null && referenceImageBuffer !== undefined;

    if (!isEditMode) {
        return {
            mode: GENERATION_MODES.TEXT_TO_IMAGE,
            shouldAutoSwitchModel: false,
            recommendedModelId: null,
        };
    }

    if (supportsImageToImage(selectedModel)) {
        return {
            mode: GENERATION_MODES.IMAGE_TO_IMAGE,
            shouldAutoSwitchModel: false,
            recommendedModelId: null,
        };
    }

    const recommendedModel = getDefaultImageToImageModelForProvider(selectedProvider) || getDefaultImageToImageModelForProvider('huggingface');
    if (!recommendedModel) {
        throw new Error(
            `Reference image provided but selected model "${selectedModel}" does not support image editing. ` +
            `No alternative edit-capable model is available.`
        );
    }

    return {
        mode: GENERATION_MODES.IMAGE_TO_IMAGE,
        shouldAutoSwitchModel: true,
        recommendedModelId: recommendedModel.id,
    };
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

// GET method for fetching generation status and history
export const GET = withUser(async function GET(request, ctx) {
    const { searchParams } = new URL(request.url);
    const libId = searchParams.get('libId');
    const userEmail = ctx.assertEmail(searchParams.get('userEmail'));

    if (!libId) {
        return NextResponse.json({ error: 'libId is required' }, { status: 400 });
    }

    try {
        let documents = [];
        try {
            const queries = [
                Query.equal('libId', libId),
                Query.equal('userEmail', userEmail),
                Query.orderDesc('$createdAt'),
                Query.limit(200),
            ];
            const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, queries);
            documents = res.documents || [];
        } catch (queryErr) {
            console.warn('Primary image generation query failed, falling back:', queryErr?.message);
            try {
                const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
                    Query.equal('libId', libId),
                    Query.equal('userEmail', userEmail),
                    Query.limit(200),
                ]);
                documents = res.documents || [];
            } catch (fallback1Err) {
                console.warn('Second query failed, querying by libId only:', fallback1Err?.message);
                const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
                    Query.equal('libId', libId),
                    Query.limit(200),
                ]);
                documents = (res.documents || []).filter(doc => !doc.userEmail || doc.userEmail === userEmail);
            }
        }

        documents.sort((a, b) => {
            const timeA = new Date(a.$createdAt || a.created_at || 0).getTime();
            const timeB = new Date(b.$createdAt || b.created_at || 0).getTime();
            return timeB - timeA;
        });

        const normalizedGenerations = documents.map(normalizeGenerationDocument);

        return NextResponse.json({
            success: true,
            libId,
            generations: normalizedGenerations,
        });
    } catch (error) {
        console.error('Error fetching image generation:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}, { requireVerified: false });

// POST method for generating images
export const POST = withUser(async function POST(request, ctx) {
    let generationId;
    let docId;
    let selectedProvider = DEFAULT_PROVIDER_ID;

    try {
        const body = await request.json();
        const {
            prompt,
            model,
            width,
            height,
            referenceImage,
            referenceImageBase64,
            generationType: requestedGenerationType,
            libId,
            provider,
            processingMode = 'crop_to_fill',
        } = body;
        const userEmail = ctx.assertEmail(body.userEmail);

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!userEmail) {
            return NextResponse.json({ error: 'User email is required' }, { status: 400 });
        }

        // Parse and normalize reference image from either URL or base64 payload
        let referenceImageBuffer = null;
        try {
            referenceImageBuffer = await parseReferenceImage(referenceImage, referenceImageBase64);
        } catch (parseError) {
            return NextResponse.json({
                error: 'Invalid reference image',
                details: parseError.message,
            }, { status: 400 });
        }

        // Check user plan limit
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
        selectedProvider = provider || providerFromModel || DEFAULT_PROVIDER_ID;

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

        // Normalize dimension numbers
        const requestedWidth = width !== undefined && width !== null ? Number(width) : null;
        const requestedHeight = height !== undefined && height !== null ? Number(height) : null;

        if ((requestedWidth !== null && !Number.isFinite(requestedWidth)) || (requestedHeight !== null && !Number.isFinite(requestedHeight))) {
            return NextResponse.json({
                error: `Invalid dimensions received. width=${width}, height=${height}`,
                libId: generationId,
            }, { status: 400 });
        }

        let targetWidth = Number.isFinite(requestedWidth) ? Math.trunc(requestedWidth) : modelConfig.ratios[0].width;
        let targetHeight = Number.isFinite(requestedHeight) ? Math.trunc(requestedHeight) : modelConfig.ratios[0].height;

        const matchedRatio = modelConfig.ratios.find((r) => r.width === targetWidth && r.height === targetHeight);
        if (!matchedRatio) {
            // Default to first supported ratio if completely unsupported
            targetWidth = modelConfig.ratios[0].width;
            targetHeight = modelConfig.ratios[0].height;
        }

        const aspectRatio = matchedRatio?.value || `${targetWidth}x${targetHeight}`;

        // Determine generation mode and handle auto-switch for reference image edit
        let generationMode = GENERATION_MODES.TEXT_TO_IMAGE;
        let finalSelectedModel = selectedModel;
        let finalSelectedModelConfig = modelConfig;
        let finalProvider = selectedProvider;
        let fallbackReason = null;
        const requestedMode = requestedGenerationType || (referenceImageBuffer ? GENERATION_MODES.IMAGE_TO_IMAGE : GENERATION_MODES.TEXT_TO_IMAGE);

        try {
            const modeInfo = determineGenerationMode(referenceImageBuffer, selectedModel, selectedProvider);
            generationMode = modeInfo.mode;

            if (modeInfo.shouldAutoSwitchModel && modeInfo.recommendedModelId) {
                console.log(`Auto-switching model from ${selectedModel} to ${modeInfo.recommendedModelId} for image-to-image mode.`);
                finalSelectedModel = modeInfo.recommendedModelId;
                finalSelectedModelConfig = getModelById(finalSelectedModel);
                finalProvider = finalSelectedModelConfig?.provider || 'huggingface';
            }
        } catch (modeError) {
            return NextResponse.json({
                error: 'Cannot determine generation mode',
                details: modeError.message,
            }, { status: 400 });
        }

        // Image-to-image is only supported on Hugging Face models
        if (generationMode === GENERATION_MODES.IMAGE_TO_IMAGE && finalProvider !== 'huggingface') {
            const hfEditModel = getDefaultImageToImageModelForProvider('huggingface');
            if (!hfEditModel) {
                return NextResponse.json({
                    error: 'Image-to-image unavailable',
                    details: 'No Hugging Face image-to-image model is configured.',
                    libId: generationId,
                }, { status: 400 });
            }

            console.log(`Auto-routing image-to-image request from provider ${finalProvider} to Hugging Face model ${hfEditModel.id}.`);
            finalSelectedModel = hfEditModel.id;
            finalSelectedModelConfig = hfEditModel;
            finalProvider = 'huggingface';
        }

        const enhancedPrompt = enhancePromptForQuality(prompt, {
            aspectRatio,
            generationMode,
        });

        // Create initial Appwrite record
        try {
            const insertDoc = await databases.createDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, ID.unique(), {
                libId: generationId,
                prompt,
                userEmail,
                model: finalSelectedModel,
                width: targetWidth,
                height: targetHeight,
                status: 'generating',
                created_at: new Date().toISOString(),
            });
            docId = insertDoc.$id;
        } catch (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json({
                error: 'Failed to create image generation record',
                details: dbError.message,
            }, { status: 500 });
        }

        // Execute generation via image provider adapter
        const generationResult = await generateImage({
            prompt: enhancedPrompt,
            provider: finalProvider,
            model: finalSelectedModel,
            width: targetWidth,
            height: targetHeight,
            aspectRatio,
            referenceImageBuffer,
            processingMode,
        });

        const imageBuffer = generationResult.buffer;
        finalProvider = generationResult.provider;
        finalSelectedModel = generationResult.model;
        if (generationResult.metadata?.fallbackOccurred) {
            fallbackReason = generationResult.metadata.fallbackReason;
        }

        // Convert to PNG via Sharp
        let processedImageBuffer;
        try {
            processedImageBuffer = await sharp(imageBuffer).png().toBuffer();
        } catch (sharpError) {
            console.error('Sharp processing error:', sharpError);
            processedImageBuffer = imageBuffer;
        }

        // Upload to Appwrite Storage
        const safeName = finalSelectedModel.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${finalProvider}_${safeName}_${generationId}_${targetWidth}x${targetHeight}_${Date.now()}.png`;
        const uploadFile = createAppwriteFile(processedImageBuffer, fileName, 'image/png');

        let uploaded;
        try {
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
            console.error('Failed to mark generation as completed in DB:', updateErr);
        }

        const providerDisplayName =
            finalProvider === 'cloudflare'
                ? 'Cloudflare Workers AI'
                : finalProvider === 'modelscope'
                ? 'ModelScope'
                : 'Hugging Face';

        return NextResponse.json({
            success: true,
            imageUrl: publicUrl,
            displayUrl: getProxyFileUrl(fileId, userEmail, generationId),
            libId: generationId,
            model: finalSelectedModel,
            modelName: finalSelectedModelConfig?.name || finalSelectedModel,
            prompt,
            aspectRatio,
            provider: finalProvider,
            dimensions: aspectRatio,
            requestedGenerationType: requestedMode,
            generationType: generationResult.generationType,
            hasReferenceImage: Boolean(referenceImageBuffer),
            modelWasSwitched: finalSelectedModel !== selectedModel,
            fallbackReason,
            generation: completedDoc,
            message: `Image generated successfully with ${finalSelectedModelConfig?.name || finalSelectedModel} via ${providerDisplayName}${
                fallbackReason ? ` (fallback: ${fallbackReason})` : ''
            }${finalSelectedModel !== selectedModel ? ' (model switched for edit mode)' : ''}`,
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

        if (error instanceof ProviderAuthError || error.message.includes('API key') || error.message.includes('authentication')) {
            statusCode = 401;
            errorMessage = 'Image provider authentication failed. Please check provider credentials.';
        } else if (error instanceof ProviderQuotaError || error instanceof ProviderRateLimitError || error.message.includes('429')) {
            statusCode = 429;
            errorMessage = 'Daily quota or rate limit reached for the image provider. Please try again later.';
        } else if (error instanceof ProviderContentPolicyError || error.message.includes('content policy') || error.message.includes('NSFW')) {
            statusCode = 400;
            errorMessage = 'The prompt may violate image generation content policies. Please modify your prompt and try again.';
        } else if (error instanceof ProviderBadRequestError) {
            statusCode = 400;
        } else if (error instanceof ProviderTimeoutError || error instanceof ProviderUnavailableError || error.message.includes('503')) {
            statusCode = 503;
            errorMessage = 'Image generation service is temporarily unavailable. Please retry shortly.';
        }

        return NextResponse.json({
            error: 'Image generation failed',
            details: errorMessage,
            provider: selectedProvider,
            libId: generationId,
        }, { status: statusCode });
    }
}, { requireVerified: false });
