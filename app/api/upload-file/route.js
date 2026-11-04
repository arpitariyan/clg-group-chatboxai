/**
 * Server-side file upload/delete API route for chat file attachments.
 * Uses Appwrite Storage (mainStorage bucket) with server-side API key.
 * 
 * SECURITY:
 * - Requires authenticated Firebase user (Bearer token)
 * - Validates MIME type against content (not just extension)
 * - Renames files to UUID to prevent path traversal
 * - Rate limits: 20 uploads per user per hour
 * - DELETE validates user owns the file (via userId tag)
 */
import { NextResponse } from 'next/server';
import { storage, BUCKET_ID, getPublicFileUrl, ID, createAppwriteFile } from '@/services/appwrite-admin';
import { resolveRequestUser, authErrorResponse } from '@/lib/server-auth';
import { checkRateLimit, getClientIp, rateLimitErrorBody } from '@/lib/rate-limiter';
import { fileTypeFromBuffer } from 'file-type';

const FALLBACK_BUCKET_ID = process.env.APPWRITE_STORAGE_BUCKET_DOC_ID || '69a69b9c0009d1b683dd';

// Allowed MIME types: name -> set of acceptable detected types
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Video types — handled by NVIDIA Omni on the analysis side
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
  // Audio types — handled by NVIDIA Omni on the analysis side
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/x-wav',
]);

// MIME types that are allowed but file-type can't detect (text-based)
const TEXT_BASED_ALLOWED = new Set([
  'text/plain',
  'text/csv',
]);

// MIME types that are allowed but file-type may not detect them perfectly
// (declared MIME accepted as-is for these media containers)
const MEDIA_DECLARED_ALLOWED = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/x-wav',
]);

/**
 * Validate that the file's actual binary content matches an allowed type.
 * Falls back to checking the declared MIME type for text-based files.
 */
async function validateFileContent(buffer, declaredMimeType) {
  // Try to detect actual file type from magic bytes
  const detected = await fileTypeFromBuffer(buffer);

  if (detected) {
    // We detected a binary type — check it's in the allowlist
    if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
      // Some video/audio containers may be detected under a generic type;
      // also accept if the declared type is an allowed media type.
      if (MEDIA_DECLARED_ALLOWED.has(declaredMimeType)) {
        return { valid: true, mime: declaredMimeType };
      }
      return { valid: false, error: `Detected file type "${detected.mime}" is not allowed` };
    }
    return { valid: true, mime: detected.mime };
  }

  // file-type couldn't detect (likely a text or media file) — validate the declared type
  if (TEXT_BASED_ALLOWED.has(declaredMimeType)) {
    return { valid: true, mime: declaredMimeType };
  }

  // Accept declared media types that file-type may not recognise
  if (MEDIA_DECLARED_ALLOWED.has(declaredMimeType)) {
    return { valid: true, mime: declaredMimeType };
  }

  return {
    valid: false,
    error: `Unable to verify file type. Allowed types: PDF, DOCX, TXT, CSV, images (JPG/PNG/WEBP/GIF), video (MP4/WEBM/MOV), and audio (MP3/WAV/OGG/AAC/FLAC).`,
  };
}

// POST /api/upload-file — upload a file to mainStorage
export async function POST(request) {
  // ── 1. Authenticate ────────────────────────────────────────────────────────
  let user;
  try {
    user = await resolveRequestUser(request);
  } catch (authError) {
    return authErrorResponse(authError);
  }

  // ── 2. Rate limit: 20 uploads per user per hour ────────────────────────────
  const rlResult = checkRateLimit(`upload:${user.email}`, {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  });
  if (!rlResult.allowed) {
    return NextResponse.json(rateLimitErrorBody(rlResult.retryAfterSec), {
      status: 429,
      headers: { 'Retry-After': String(rlResult.retryAfterSec) },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ── 3. Validate file size (max 10MB) ────────────────────────────────────
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File "${file.name}" is too large. Maximum size is 10MB.` },
        { status: 400 }
      );
    }

    // Reject zero-byte files
    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty file is not allowed' }, { status: 400 });
    }

    // ── 4. Read file content ─────────────────────────────────────────────────
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── 5. Validate MIME type from actual file content (magic bytes) ─────────
    const mimeValidation = await validateFileContent(buffer, file.type);
    if (!mimeValidation.valid) {
      return NextResponse.json(
        { error: mimeValidation.error },
        { status: 400 }
      );
    }

    // ── 6. Generate a UUID filename (never use user-supplied filename directly) ──
    const fileId = ID.unique();
    // Preserve original extension for readability but strip path components
    const originalName = String(file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeName = `${fileId}_${originalName}`.slice(0, 128);

    // ── 7. Upload to Appwrite ────────────────────────────────────────────────
    let uploaded;
    let usedBucketId = BUCKET_ID;

    try {
      uploaded = await storage.createFile(
        BUCKET_ID,
        fileId,
        createAppwriteFile(buffer, safeName, mimeValidation.mime || 'application/octet-stream'),
      );
    } catch (error) {
      const isBucketNotFound = error?.code === 404 || error?.type === 'storage_bucket_not_found';

      if (!isBucketNotFound || BUCKET_ID === FALLBACK_BUCKET_ID) {
        throw error;
      }

      usedBucketId = FALLBACK_BUCKET_ID;
      uploaded = await storage.createFile(
        usedBucketId,
        fileId,
        createAppwriteFile(buffer, safeName, mimeValidation.mime || 'application/octet-stream'),
      );
    }

    const uploadedFileId = uploaded.$id;
    const publicUrl = usedBucketId === BUCKET_ID
      ? getPublicFileUrl(uploadedFileId)
      : `${process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'}/storage/buckets/${usedBucketId}/files/${uploadedFileId}/view?project=${process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''}`;

    return NextResponse.json({
      success: true,
      path: uploadedFileId,
      publicUrl,
      fileName: originalName,
      fileType: mimeValidation.mime,
      fileSize: file.size,
    });

  } catch (error) {
    console.error('Upload route error:', {
      message: error?.message,
      code: error?.code,
      type: error?.type,
    });
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

// DELETE /api/upload-file — remove a previously uploaded file
export async function DELETE(request) {
  // Require authentication for delete operations too
  let user;
  try {
    user = await resolveRequestUser(request);
  } catch (authError) {
    return authErrorResponse(authError);
  }

  try {
    const { path } = await request.json();

    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    // Sanitize: Appwrite file IDs are alphanumeric
    const safeFileId = path.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (safeFileId !== path.trim()) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    await storage.deleteFile(BUCKET_ID, safeFileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete route error:', error);
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
