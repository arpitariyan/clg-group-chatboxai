import { NextResponse } from 'next/server'
import { storage, databases, DB_ID, BUCKET_ID, getPublicFileUrl, ID, createAppwriteFile } from '@/services/appwrite-admin'
import OpenAI from 'openai'
import sharp from 'sharp'
import { WEBSITE_IMAGES_COLLECTION_ID, WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections'
import { withUser } from '@/lib/request-context'
import { ensureProjectOwnership } from '@/lib/website-builder-server-utils'

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

export const POST = withUser(async function POST(request, ctx) {
    try {
        const userEmail = ctx.assertEmail()
        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 401 }
            )
        }

        const { prompt, projectId } = await request.json()
        const trimmedPrompt = (prompt || '').trim()

        if (!trimmedPrompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            )
        }

        if (trimmedPrompt.length > 1000) {
            return NextResponse.json(
                { error: 'Image prompt exceeds maximum allowed limit of 1000 characters' },
                { status: 400 }
            )
        }

        // Verify project ownership before spending image generation quota
        if (projectId) {
            let project
            try {
                project = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId)
            } catch (projectError) {
                return NextResponse.json(
                    { error: 'Project not found', details: projectError?.message },
                    { status: 404 }
                )
            }

            if (!ensureProjectOwnership(project, userEmail)) {
                return NextResponse.json(
                    { error: 'Unauthorized: You do not own this project' },
                    { status: 403 }
                )
            }
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
            prompt: trimmedPrompt,
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

        const imageUrl = result.response.data[0]?.url
        if (!imageUrl || !imageUrl.startsWith('https://')) {
            throw new Error('Invalid or unencrypted image URL returned by provider')
        }

        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
            throw new Error(`Failed to download generated image (${imageResponse.status})`)
        }

        const contentLength = imageResponse.headers.get('content-length')
        if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Generated image exceeds maximum permitted size of 15MB' },
                { status: 502 }
            )
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
        const publicUrl = getPublicFileUrl(uploaded.$id)

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
})
