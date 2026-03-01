/**
 * Server-side file upload/delete API route for chat file attachments.
 * Uses supabaseAdmin (service role key) to bypass RLS on the mainStorage bucket,
 * replacing the previous client-side supabase.storage calls in DisplayResult.jsx.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

// POST /api/upload-file — upload a file to mainStorage
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const userId = formData.get('userId') || 'anonymous';

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

        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `uploads/${userId}/${fileName}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('mainStorage')
            .upload(filePath, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json(
                { error: `Failed to upload ${file.name}: ${uploadError.message}` },
                { status: 500 }
            );
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('mainStorage')
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            path: filePath,
            publicUrl,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
        });
    } catch (error) {
        console.error('Upload route error:', error);
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

        // Security: only allow deletion inside the uploads/ prefix
        if (!path.startsWith('uploads/')) {
            return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
        }

        const { error } = await supabaseAdmin.storage
            .from('mainStorage')
            .remove([path]);

        if (error) {
            console.error('Storage delete error:', error);
            return NextResponse.json(
                { error: `Failed to delete file: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete route error:', error);
        return NextResponse.json(
            { error: error.message || 'Delete failed' },
            { status: 500 }
        );
    }
}
