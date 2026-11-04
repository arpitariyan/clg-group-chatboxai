export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getValidToken } from '@/lib/oauth-manager.js';
import { getFigmaFile } from '@/lib/figma/figma-api';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { FIGMA_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { classifyError, buildErrorResponse, ERROR_TYPES } from '@/lib/figma/error-handler';

/**
 * GET /api/figma/metadata?fileKey=...
 * Gets file metadata including name, version, pages, and components.
 * Requires Firebase Bearer token authentication.
 * Free (0 credits).
 *
 * Query params:
 *   - fileKey (required): The Figma file key
 */
export async function GET(request) {
  try {
    // 1. Authenticate via Firebase Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId, userEmail;
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
      userEmail = decoded.email;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('fileKey');

    if (!fileKey) {
      return NextResponse.json(
        { error: 'Missing required parameter: fileKey' },
        { status: 400 }
      );
    }

    // 3. Get valid Figma access token
    let accessToken;
    try {
      accessToken = await getValidToken(userId, 'figma');
    } catch (err) {
      const errorType = classifyError(err);
      const errorResponse = buildErrorResponse(errorType);
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 4. Fetch file from Figma API
    let fileData;
    try {
      fileData = await getFigmaFile(accessToken, fileKey);
    } catch (error) {
      console.error('[API /figma/metadata] Figma API error:', error);
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType);
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 5. Extract metadata
    const pages = (fileData.document?.children || []).map((page) => ({
      id: page.id,
      name: page.name,
      childCount: page.children?.length || 0,
    }));

    const components = Object.entries(fileData.components || {}).map(([id, comp]) => ({
      id,
      name: comp.name,
      description: comp.description || '',
      key: comp.key || '',
    }));

    const metadata = {
      name: fileData.name || '',
      lastModified: fileData.lastModified || '',
      version: fileData.version || '',
      thumbnailUrl: fileData.thumbnailUrl || '',
      pages,
      components,
      styles: Object.keys(fileData.styles || {}).length,
    };

    // 6. Store/update in our database for recent files tracking
    try {
      const pageStructure = JSON.stringify(pages);
      const existing = await databases.listDocuments(DB_ID, FIGMA_PROJECTS_COLLECTION_ID, [
        Query.equal('userEmail', userEmail),
        Query.equal('fileKey', fileKey),
        Query.limit(1),
      ]);

      if (existing.documents.length > 0) {
        await databases.updateDocument(DB_ID, FIGMA_PROJECTS_COLLECTION_ID, existing.documents[0].$id, {
          fileName: metadata.name,
          lastModified: metadata.lastModified,
          thumbnailUrl: metadata.thumbnailUrl,
          lastAccessedAt: new Date().toISOString(),
          pageStructure,
        });
      } else {
        await databases.createDocument(DB_ID, FIGMA_PROJECTS_COLLECTION_ID, ID.unique(), {
          userEmail,
          fileKey,
          fileName: metadata.name,
          lastModified: metadata.lastModified,
          thumbnailUrl: metadata.thumbnailUrl,
          lastAccessedAt: new Date().toISOString(),
          pageStructure,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (storeError) {
      // Non-critical — don't fail the request
      console.warn('[API /figma/metadata] Failed to store file metadata:', storeError.message);
    }

    // 7. Return metadata
    return NextResponse.json({
      success: true,
      fileKey,
      metadata,
    });
  } catch (error) {
    console.error('[API /figma/metadata] Unexpected error:', error);
    const errorResponse = buildErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
      { status: errorResponse.httpStatus }
    );
  }
}
