import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuth } from '@clerk/nextjs/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
            )
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Generate unique filename
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const fileExtension = file.name.split('.').pop()
        const fileName = `${timestamp}_${randomStr}.${fileExtension}`
        
        // Organize by project if projectId provided
        const filePath = projectId 
            ? `website-builder-images/${projectId}/${fileName}`
            : `website-builder-images/${userId}/${fileName}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('mainStorage')
            .upload(filePath, buffer, {
                contentType: file.type,
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
                    type: 'uploaded',
                    metadata: {
                        originalName: file.name,
                        size: file.size,
                        contentType: file.type
                    }
                })

            if (dbError) {
                console.error('Database error:', dbError)
                // Don't fail the request if database insert fails
                // The image is already uploaded successfully
            }
        }

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filePath: filePath,
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
