/**
 * Server-side file upload/delete API route for chat file attachments.
 * Uses Appwrite Storage (mainStorage bucket) with server-side API key.
 */
import { NextResponse } from 'next/server';
import { storage, BUCKET_ID, getFileUrl, ID, createAppwriteFile } from '@/services/appwrite-admin';

const FALLBACK_BUCKET_ID = process.env.APPWRITE_STORAGE_BUCKET_DOC_ID || '69a69b9c0009d1b683dd';

// POST /api/upload-file — upload a file to mainStorage
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: `File "${file.name}" is too large. Maximum size is 10MB.` },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/csv',
            'image/jpeg',
            'image/png',
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: `File type "${file.type}" is not supported.` },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let uploaded;
        let usedBucketId = BUCKET_ID;

        try {
            uploaded = await storage.createFile(
                BUCKET_ID,
                ID.unique(),
                createAppwriteFile(buffer, file.name, file.type || 'application/octet-stream'),
            );
        } catch (error) {
            const isBucketNotFound = error?.code === 404 || error?.type === 'storage_bucket_not_found';

            if (!isBucketNotFound || BUCKET_ID === FALLBACK_BUCKET_ID) {
                throw error;
            }

            usedBucketId = FALLBACK_BUCKET_ID;
            uploaded = await storage.createFile(
                usedBucketId,
                ID.unique(),
                createAppwriteFile(buffer, file.name, file.type || 'application/octet-stream'),
            );
        }

        const fileId = uploaded.$id;
        const publicUrl = usedBucketId === BUCKET_ID
            ? getFileUrl(fileId)
            : `${process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'}/storage/buckets/${usedBucketId}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''}`;

        return NextResponse.json({
            success: true,
            path: fileId,       // fileId is used as the reference for deletion
            publicUrl,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
        });
    } catch (error) {
        console.error('Upload route error:', {
            message: error?.message,
            code: error?.code,
            type: error?.type,
            configuredBucketId: BUCKET_ID,
            fallbackBucketId: FALLBACK_BUCKET_ID,
        });
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}

// DELETE /api/upload-file — remove a previously uploaded file
export async function DELETE(request) {
    try {
        const { path } = await request.json();

        if (!path) {
            return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
        }

        await storage.deleteFile(BUCKET_ID, path);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete route error:', error);
        return NextResponse.json(
            { error: error.message || 'Delete failed' },
            { status: 500 }
        );
    }
}
