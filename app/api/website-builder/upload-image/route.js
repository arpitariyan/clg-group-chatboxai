import { NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { storage, databases, DB_ID, BUCKET_ID, getFileUrl, ID, createAppwriteFile } from '@/services/appwrite-admin'
import { WEBSITE_IMAGES_COLLECTION_ID } from '@/services/appwrite-collections'

export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file')
        const projectId = formData.get('projectId')

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed types: JPG, PNG, WEBP, GIF' },
                { status: 400 }
            )
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const fileExtension = file.name.split('.').pop()
        const fileName = `${timestamp}_${randomStr}.${fileExtension}`

        // Upload to Appwrite Storage
        const inputFile = createAppwriteFile(buffer, fileName, file.type || 'application/octet-stream')
        const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), inputFile)
        const publicUrl = getFileUrl(uploaded.$id)

        // Store image record in database if projectId provided
        if (projectId) {
            try {
                await databases.createDocument(DB_ID, WEBSITE_IMAGES_COLLECTION_ID, ID.unique(), {
                    project_id: projectId,
                    image_url: publicUrl,
                    file_id: uploaded.$id,
                    type: 'uploaded',
                    original_name: file.name,
                    size: file.size,
                    content_type: file.type
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
            fileName: fileName
        })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
