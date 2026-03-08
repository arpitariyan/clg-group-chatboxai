import { NextResponse } from 'next/server'
import { storage, databases, DB_ID, BUCKET_ID, getFileUrl, ID, createAppwriteFile } from '@/services/appwrite-admin'
import { getAuth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import sharp from 'sharp'
import { WEBSITE_IMAGES_COLLECTION_ID } from '@/services/appwrite-collections'

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

        const apiKeys = getA4FApiKeys()
        if (!apiKeys || apiKeys.length === 0) {
            return NextResponse.json(
                { error: 'No API keys configured' },
                { status: 500 }
            )
        }

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

        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
            throw new Error('Failed to download generated image')
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

        const processedImageBuffer = await sharp(imageBuffer)
            .png({ quality: 90, compressionLevel: 9 })
            .toBuffer()

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const fileName = `generated_${timestamp}_${randomStr}.png`

        // Upload to Appwrite Storage
        const inputFile = createAppwriteFile(processedImageBuffer, fileName, 'image/png')
        const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), inputFile)
        const publicUrl = getFileUrl(uploaded.$id)

        // Store image record in database if projectId provided
        if (projectId) {
            try {
                await databases.createDocument(DB_ID, WEBSITE_IMAGES_COLLECTION_ID, ID.unique(), {
                    project_id: projectId,
                    image_url: publicUrl,
                    file_id: uploaded.$id,
                    type: 'generated',
                    prompt: prompt,
                    model: 'provider-4/imagen-4',
                    size: '1024x1024'
                })
            } catch (dbError) {
                console.error('Database error:', dbError)
                // Don't fail the request if database insert fails
            }
        }

        return NextResponse.json({
            success: true,
            url: publicUrl,
            fileId: uploaded.$id,
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
