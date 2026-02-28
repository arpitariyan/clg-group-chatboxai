import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import sharp from 'sharp'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Get available A4F API keys with fallback
const getA4FApiKeys = () => {
    const keys = [
        process.env.A4F_API_KEY,
        process.env.A4F_API_KEY_2,
        process.env.A4F_API_KEY_3,
        process.env.A4F_API_KEY_4,
    ].filter(key => key && key.trim() !== '')
    return keys
}

// Try image generation with multiple API keys
const tryImageGeneration = async (keys, requestData) => {
    let lastError = null

    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i]

        try {
            const client = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.a4f.co/v1'
            })

            const response = await client.images.generate(requestData)
            return {
                success: true,
                response: response,
                keyIndex: i + 1
            }
        } catch (error) {
            lastError = error
            console.warn(`A4F API key ${i + 1} failed:`, error.message)

            if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('rate limit')) {
                continue
            }
        }
    }

    return {
        success: false,
        error: lastError
    }
}

export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { prompt, projectId } = await request.json()

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            )
        }

        // Get A4F API keys
        const apiKeys = getA4FApiKeys()
        if (!apiKeys || apiKeys.length === 0) {
            return NextResponse.json(
                { error: 'No API keys configured' },
                { status: 500 }
            )
        }

        // Generate image using a4f with imagen-4 model
        const requestData = {
            model: 'provider-4/imagen-4',
            prompt: prompt,
            n: 1,
            size: '1024x1024'
        }

        const result = await tryImageGeneration(apiKeys, requestData)

        if (!result.success) {
            return NextResponse.json(
                { error: 'Failed to generate image with all available API keys' },
                { status: 500 }
            )
        }

        const imageUrl = result.response.data[0].url

        // Download the image
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
            throw new Error('Failed to download generated image')
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

        // Process image with sharp (optimize)
        const processedImageBuffer = await sharp(imageBuffer)
            .png({ quality: 90, compressionLevel: 9 })
            .toBuffer()

        // Generate unique filename
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const fileName = `generated_${timestamp}_${randomStr}.png`
        
        const filePath = projectId 
            ? `website-builder-images/${projectId}/${fileName}`
            : `website-builder-images/${userId}/${fileName}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('mainStorage')
            .upload(filePath, processedImageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json(
                { error: 'Failed to upload image' },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('mainStorage')
            .getPublicUrl(filePath)

        // Store image record in database if projectId provided
        if (projectId) {
            const { error: dbError } = await supabase
                .from('website_images')
                .insert({
                    project_id: projectId,
                    image_url: publicUrl,
                    file_path: filePath,
                    type: 'generated',
                    metadata: {
                        prompt: prompt,
                        model: 'provider-4/imagen-4',
                        size: '1024x1024'
                    }
                })

            if (dbError) {
                console.error('Database error:', dbError)
                // Don't fail the request if database insert fails
            }
        }

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filePath: filePath,
            fileName: fileName,
            prompt: prompt
        })

    } catch (error) {
        console.error('Image generation error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
