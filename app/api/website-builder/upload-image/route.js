import { NextResponse } from 'next/server'
import { storage, databases, DB_ID, BUCKET_ID, getPublicFileUrl, ID, createAppwriteFile } from '@/services/appwrite-admin'
import { WEBSITE_IMAGES_COLLECTION_ID, WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections'
import { withUser } from '@/lib/request-context'
import { ensureProjectOwnership } from '@/lib/website-builder-server-utils'

export const POST = withUser(async function POST(request, ctx) {
    try {
        const userEmail = ctx.assertEmail()
        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
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

        // If projectId is provided, verify project existence and user ownership
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

        // Validate actual file binary signatures (magic bytes) to prevent disguised uploads
        const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
        const isJpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        const isGif = buffer.length > 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46
        const isWebp = buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'

        if (!isPng && !isJpg && !isGif && !isWebp) {
            return NextResponse.json(
                { error: 'Invalid file contents: file binary signature does not match supported image format' },
                { status: 400 }
            )
        }

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const rawExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
        const fileExtension = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'png'
        const fileName = `${timestamp}_${randomStr}.${fileExtension}`

        // Upload to Appwrite Storage
        const inputFile = createAppwriteFile(buffer, fileName, file.type || 'application/octet-stream')
        const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), inputFile)
        const publicUrl = getPublicFileUrl(uploaded.$id)

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
})
