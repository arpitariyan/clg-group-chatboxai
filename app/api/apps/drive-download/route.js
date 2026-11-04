export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getValidToken } from '@/lib/oauth-manager.js';

/**
 * GET /api/apps/drive-download?fileId=...&fileName=...
 * Proxies a Google Drive file download through the server
 * so the user's OAuth token is used without exposing it to the client.
 */
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId;
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const fileName = searchParams.get('fileName') || 'download';
    const mimeType = searchParams.get('mimeType') || '';

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    // Get the user's Google Drive access token
    let accessToken;
    try {
      accessToken = await getValidToken(userId, 'google_drive');
    } catch (err) {
      return NextResponse.json(
        { error: 'Google Drive not connected. Please connect it first.' },
        { status: 403 }
      );
    }

    // Determine if this is a Google Workspace file (needs export) or a regular file (direct download)
    const isGoogleFile = mimeType.startsWith('application/vnd.google-apps.');

    let downloadUrl;
    let exportMimeType;

    if (isGoogleFile) {
      // Google Docs/Sheets/Slides need to be exported
      if (mimeType.includes('document')) {
        exportMimeType = 'application/pdf';
      } else if (mimeType.includes('spreadsheet')) {
        exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (mimeType.includes('presentation')) {
        exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      } else if (mimeType.includes('drawing')) {
        exportMimeType = 'image/png';
      } else {
        exportMimeType = 'application/pdf';
      }
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
    } else {
      // Regular files — direct download
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    }

    // Fetch the file from Google Drive
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `Failed to download file: ${response.status}` },
        { status: response.status }
      );
    }

    // Determine the file extension for the download name
    let downloadName = fileName;
    if (isGoogleFile) {
      if (exportMimeType.includes('pdf') && !downloadName.endsWith('.pdf')) {
        downloadName += '.pdf';
      } else if (exportMimeType.includes('spreadsheetml') && !downloadName.endsWith('.xlsx')) {
        downloadName += '.xlsx';
      } else if (exportMimeType.includes('presentationml') && !downloadName.endsWith('.pptx')) {
        downloadName += '.pptx';
      } else if (exportMimeType.includes('image/png') && !downloadName.endsWith('.png')) {
        downloadName += '.png';
      }
    }

    // Stream the file back to the client
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const fileBuffer = await response.arrayBuffer();

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`,
        'Content-Length': String(fileBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('[Drive Download] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Download failed' },
      { status: 500 }
    );
  }
}
