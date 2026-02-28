import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { checkImageGenerationLimit } from '@/lib/planUtils';
import sharp from 'sharp';
import ChatBoxAI from '@/lib/chatboxai-sdk';

// Function to get available A4F API keys with fallback
const getA4FApiKeys = () => {
    const keys = [
        process.env.A4F_API_KEY,
        process.env.A4F_API_KEY_2,
        process.env.A4F_API_KEY_3,
        process.env.A4F_API_KEY_4,
    ].filter(key => key && key.trim() !== ''); // Filter out empty or undefined keys

    return keys;
};

// Function to try image generation with multiple API keys
const tryImageGeneration = async (keys, requestData) => {
    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i];
        // console.log(`Trying A4F API key ${i + 1}/${keys.length}`);

        try {
            const client = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.a4f.co/v1'
            });

            const response = await client.images.generate(requestData);

            // If successful, return the response with key info
            // console.log(`Successfully generated image with A4F API key ${i + 1}`);
            return {
                success: true,
                response: response,
                keyIndex: i + 1
            };

        } catch (error) {
            lastError = error;
            console.warn(`A4F API key ${i + 1} failed:`, error.message);

            // If it's a quota/rate limit error, try next key immediately
            if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('rate limit')) {
                // console.log(`Key ${i + 1} hit quota/rate limit, trying next key...`);
                continue;
            }

            // If it's an auth error, try next key
            if (error.message.includes('401') || error.message.includes('invalid') || error.message.includes('unauthorized')) {
                // console.log(`Key ${i + 1} authentication failed, trying next key...`);
                continue;
            }

            // For other errors, still try next key but log the error type
            // console.log(`Key ${i + 1} failed with error: ${error.message}, trying next key...`);
        }
    }

    // All keys failed
    return {
        success: false,
        error: lastError,
        totalKeysTried: keys.length
    };
};

// Function to convert pixel dimensions to aspect ratio
const _convertDimensionsToAspectRatio = (width, height) => {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const ratioWidth = width / divisor;
    const ratioHeight = height / divisor;

    // Return in the format ChatBoxAI expects
    const supportedRatios = {
        "1:1": 1,
        "16:9": 16 / 9,
        "9:16": 9 / 16,
        "4:5": 4 / 5,
        "3:2": 3 / 2,
        "21:9": 21 / 9
    };

    const targetRatio = ratioWidth / ratioHeight;
    let closestRatio = "1:1";
    let closestDiff = Math.abs(supportedRatios["1:1"] - targetRatio);

    for (const [ratio, value] of Object.entries(supportedRatios)) {
        const diff = Math.abs(value - targetRatio);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestRatio = ratio;
        }
    }

    return closestRatio;
};

// Function to generate image using ChatBoxAI
const generateChatBoxAIImage = async (prompt, aspectRatio = "1:1") => {
    const apiKey = process.env.CHATBOXAI_API_KEY;

    if (!apiKey || apiKey.trim() === '' || apiKey === 'cbai_your_api_key_here') {
        throw new Error('ChatBoxAI API key is not configured. Please add CHATBOXAI_API_KEY to your .env file.');
    }

    try {
        const chatboxai = new ChatBoxAI(apiKey);
        const result = await chatboxai.generateImage(prompt, aspectRatio);

        return {
            success: true,
            response: result,
            provider: 'chatboxai'
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            provider: 'chatboxai'
        };
    }
};

// GET method for fetching generation status
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const libId = searchParams.get('libId');

    if (!libId) {
        return NextResponse.json({ error: 'libId is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('ImageGeneration')
            .select('*')
            .eq('libId', libId);

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ error: 'Failed to fetch image generation data' }, { status: 500 });
        }

        // If no data found, return 404
        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Image generation data not found' }, { status: 404 });
        }

        return NextResponse.json(data[0]);
    } catch (error) {
        console.error('Error fetching image generation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST method for generating images
export async function POST(request) {

    try {
        const { prompt, model, width, height, referenceImage, libId, userEmail } = await request.json();
        // console.log('Request payload:', { prompt, model, width, height, referenceImage, libId, userEmail });

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
                limitExceeded: true
            }, { status: 403 });
        }

        // Generate libId if not provided
        const generationId = libId || uuidv4();

        // Determine the model to use
        const selectedModel = model || 'provider-4/flux-schnell';

        // Check if using ChatBoxAI model
        const isChatBoxAIModel = selectedModel.toLowerCase() === 'chatboxai' || selectedModel.toLowerCase() === 'chatboxai v1.0';

        // Store the target dimensions for later cropping
        const targetWidth = width;
        const targetHeight = height;
        const aspectRatio = `${targetWidth}x${targetHeight}`;

        const generationSize = '1024x1024';

        const { data: existingData, error: existingError } = await supabase
            .from('ImageGeneration')
            .select('*')
            .eq('libId', generationId)
            .single();

        let recordExists = !existingError && existingData;

        if (!recordExists) {
            // Create initial database entry only if it doesn't exist
            const initialData = {
                libId: generationId,
                prompt: prompt,
                userEmail: userEmail,
                selectedModel: selectedModel,
                aspectRatio: aspectRatio,
                width: targetWidth,
                height: targetHeight,
                referenceImage: referenceImage,
                status: 'generating',
                created_at: new Date().toISOString()
            };

            const { data: insertData, error: insertError } = await supabase
                .from('ImageGeneration')
                .insert([initialData])
                .select();

            if (insertError) {
                console.error('Database insert error:', insertError);
                return NextResponse.json({
                    error: 'Failed to create image generation record',
                    details: insertError.message
                }, { status: 500 });
            }

            // console.log('Initial database entry created:', insertData[0]);
        } else {
            // Update existing record for regeneration
            const { error: updateError } = await supabase
                .from('ImageGeneration')
                .update({
                    status: 'generating',
                    errorMessage: null,
                    generatedImageUrl: null,
                    generatedImagePath: null,
                    completedAt: null,
                    updated_at: new Date().toISOString()
                })
                .eq('libId', generationId);

            if (updateError) {
                console.error('Database update error:', updateError);
                return NextResponse.json({
                    error: 'Failed to update image generation record',
                    details: updateError.message
                }, { status: 500 });
            }

            // console.log('Updated existing record for regeneration');
        }

        // Check for a4f API keys (only for non-ChatBoxAI models)
        if (!isChatBoxAIModel) {
            const A4F_API_KEYS = getA4FApiKeys();
            if (A4F_API_KEYS.length === 0) {
                // Update status to failed
                await supabase
                    .from('ImageGeneration')
                    .update({
                        status: 'failed',
                        errorMessage: 'No A4F API keys configured'
                    })
                    .eq('libId', generationId);

                return NextResponse.json({
                    error: 'A4F API keys not configured. Please add A4F_API_KEY and/or A4F_API_KEY_2 to your .env file.',
                    libId: generationId
                }, { status: 500 });
            }
        }

        // Validate model
        const validA4FModels = ['provider-4/imagen-4', 'provider-4/flux-schnell', 'provider-5/dall-e-2', 'provider-4/qwen-image'];
        const validModels = [...validA4FModels, 'chatboxai', 'chatboxai v1.0'];

        if (!validModels.includes(selectedModel) && !isChatBoxAIModel) {
            await supabase
                .from('ImageGeneration')
                .update({
                    status: 'failed',
                    errorMessage: `Invalid model: ${selectedModel}`
                })
                .eq('libId', generationId);

            return NextResponse.json({
                error: `Invalid model: ${selectedModel}. Valid models are: ${validA4FModels.join(', ')}, chatboxai`,
                libId: generationId
            }, { status: 400 });
        }

        // Generate image based on provider
        let generationResult;
        let generatedImageUrl;
        let provider = 'unknown';

        if (isChatBoxAIModel) {
            // Use ChatBoxAI
            const chatboxaiAspectRatio = _convertDimensionsToAspectRatio(targetWidth, targetHeight);
            generationResult = await generateChatBoxAIImage(prompt, chatboxaiAspectRatio);
            provider = 'chatboxai';

            if (generationResult.success) {
                generatedImageUrl = generationResult.response.imageUrl;
            } else {
                const errorMsg = `ChatBoxAI generation failed: ${generationResult.error?.message || 'Unknown error'}`;
                console.error(errorMsg);

                // Update database with error status
                await supabase
                    .from('ImageGeneration')
                    .update({
                        status: 'failed',
                        errorMessage: errorMsg
                    })
                    .eq('libId', generationId);

                throw new Error(errorMsg);
            }
        } else {
            // Use A4F
            const A4F_API_KEYS = getA4FApiKeys();
            generationResult = await tryImageGeneration(A4F_API_KEYS, {
                model: selectedModel,
                prompt: prompt,
                n: 1,
                size: generationSize,
                response_format: "url"
            });
            provider = 'a4f.co';

            if (!generationResult.success) {
                const errorMsg = `All ${generationResult.totalKeysTried} A4F API key(s) failed. Last error: ${generationResult.error?.message || 'Unknown error'}`;
                console.error(errorMsg);

                // Update database with error status
                await supabase
                    .from('ImageGeneration')
                    .update({
                        status: 'failed',
                        errorMessage: errorMsg
                    })
                    .eq('libId', generationId);

                throw new Error(errorMsg);
            }

            const response = generationResult.response;

            if (!response.data || !response.data[0] || !response.data[0].url) {
                console.error('Unexpected API response structure:', response);
                throw new Error('Invalid response from a4f.co API - no image URL found');
            }

            generatedImageUrl = response.data[0].url;
        }

        let imageBuffer;

        // Handle ChatBoxAI base64 response vs A4F URL response
        if (provider === 'chatboxai') {
            // ChatBoxAI returns base64 data URL
            if (!generatedImageUrl.startsWith('data:image')) {
                throw new Error('Invalid image format from ChatBoxAI');
            }
            // Extract base64 data from data URL
            const base64Data = generatedImageUrl.split(',')[1];
            if (!base64Data) {
                throw new Error('Failed to extract image data from ChatBoxAI response');
            }
            imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
            // A4F returns a URL that needs to be fetched
            const imageResponse = await fetch(generatedImageUrl);
            if (!imageResponse.ok) {
                throw new Error('Failed to download generated image from a4f.co');
            }
            imageBuffer = await imageResponse.arrayBuffer();
        }

        let processedImageBuffer;

        if (targetWidth === targetHeight) {
            processedImageBuffer = Buffer.from(imageBuffer);

        } else {

            try {
                const sharpImage = sharp(Buffer.from(imageBuffer));
                const metadata = await sharpImage.metadata();

                // Calculate the target aspect ratio
                const targetRatio = targetWidth / targetHeight;
                const sourceWidth = metadata.width;
                const sourceHeight = metadata.height;

                let resizeWidth, resizeHeight, cropX = 0, cropY = 0;

                if (targetWidth > targetHeight) {
                    // Landscape: crop from center horizontally
                    resizeHeight = sourceHeight;
                    resizeWidth = Math.round(sourceHeight * targetRatio);
                    cropX = Math.round((sourceWidth - resizeWidth) / 2);
                } else {
                    // Portrait: crop from center vertically
                    resizeWidth = sourceWidth;
                    resizeHeight = Math.round(sourceWidth / targetRatio);
                    cropY = Math.round((sourceHeight - resizeHeight) / 2);
                }

                // Extract the region and resize to target dimensions
                processedImageBuffer = await sharpImage
                    .extract({
                        left: Math.max(0, cropX),
                        top: Math.max(0, cropY),
                        width: Math.min(resizeWidth, sourceWidth),
                        height: Math.min(resizeHeight, sourceHeight)
                    })
                    .resize(targetWidth, targetHeight, {
                        fit: 'fill',
                        kernel: sharp.kernel.lanczos3
                    })
                    .png()
                    .toBuffer();

                // console.log(`Image processed successfully to ${targetWidth}x${targetHeight}`);
            } catch (processingError) {
                console.error('Error processing image:', processingError);
                // Fallback: just resize the square image to target dimensions (may distort)
                processedImageBuffer = await sharp(Buffer.from(imageBuffer))
                    .resize(targetWidth, targetHeight, {
                        fit: 'fill'
                    })
                    .png()
                    .toBuffer();
                // console.log('Used fallback resize method');
            }
        }

        const fileName = isChatBoxAIModel
            ? `chatboxai_${generationId}_${targetWidth}x${targetHeight}_${Date.now()}.png`
            : `a4f_${selectedModel.replace('/', '_')}_${generationId}_${targetWidth}x${targetHeight}_${Date.now()}.png`;
        const filePath = `generated-images/${fileName}`;

        // Upload the processed image to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('mainStorage')
            .upload(filePath, processedImageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Failed to save generated image to storage');
        }

        // Get public URL from Supabase
        const { data: { publicUrl } } = supabase.storage
            .from('mainStorage')
            .getPublicUrl(filePath);

        // console.log('Image saved to Supabase storage:', publicUrl);

        // Update the database record with the generated image
        const { error: updateError } = await supabase
            .from('ImageGeneration')
            .update({
                generatedImageUrl: publicUrl,
                generatedImagePath: filePath,
                status: 'completed',
                completedAt: new Date().toISOString()
            })
            .eq('libId', generationId);

        if (updateError) {
            console.error('Database update error:', updateError);
            throw updateError;
        }

        // console.log('Database updated successfully with generated image');

        // Return success response
        const modelDisplayName = selectedModel === 'chatboxai' ? 'ChatBoxAI v1.0' : selectedModel;

        const responseObj = {
            success: true,
            imageUrl: publicUrl,
            libId: generationId,
            model: selectedModel,
            modelName: modelDisplayName,
            prompt: prompt,
            aspectRatio: aspectRatio,
            provider: provider,
            dimensions: aspectRatio
        };

        if (isChatBoxAIModel) {
            responseObj.message = `Image generated successfully with ChatBoxAI v1.0`;
        } else {
            responseObj.message = `Image generated successfully with ${selectedModel} via a4f.co (API key ${generationResult.keyIndex})`;
            responseObj.apiKeyUsed = generationResult.keyIndex;
        }

        return NextResponse.json(responseObj);

    } catch (error) {
        console.error('Image generation error:', error);

        // Provide specific error messages based on the error type
        let errorMessage = error.message;
        let statusCode = 500;

        // Handle specific a4f.co errors
        if (error.message.includes('ChatBoxAI')) {
            if (error.message.includes('API key')) {
                errorMessage = 'ChatBoxAI API key is not configured. Please add CHATBOXAI_API_KEY to your .env file.';
                statusCode = 401;
            } else {
                errorMessage = error.message;
                statusCode = 500;
            }
        } else if (error.message.includes('API key') || error.message.includes('401')) {
            errorMessage = 'All a4f.co API keys are invalid or missing. Please check your A4F_API_KEY and A4F_API_KEY_2 in .env file';
            statusCode = 401;
        } else if (error.message.includes('quota') || error.message.includes('429')) {
            errorMessage = 'All a4f.co API keys have exceeded quota or hit rate limits. Please wait and try again.';
            statusCode = 429;
        } else if (error.message.includes('content') || error.message.includes('policy')) {
            errorMessage = 'The prompt violates content policy. Please modify your prompt and try again.';
            statusCode = 400;
        } else if (error.message.includes('model') || error.message.includes('404')) {
            errorMessage = 'The specified model is not available. Please try a different model.';
            statusCode = 400;
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Image generation timed out. Please try again with a simpler prompt.';
            statusCode = 408;
        }

        // Update database with error status
        if (generationId) {
            try {
                await supabase
                    .from('ImageGeneration')
                    .update({
                        status: 'failed',
                        errorMessage: errorMessage,
                        completedAt: new Date().toISOString()
                    })
                    .eq('libId', generationId);
            } catch (dbError) {
                console.error('Failed to update error status:', dbError);
            }
        }

        return NextResponse.json({
            error: 'Image generation failed',
            details: errorMessage,
            provider: 'a4f.co',
            libId: generationId
        }, { status: statusCode });
    }
}