export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getValidToken } from '@/lib/oauth-manager.js';
import { getFigmaUserInfo, getFigmaTeamProjects } from '@/lib/figma/figma-api';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { FIGMA_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { classifyError, buildErrorResponse, ERROR_TYPES } from '@/lib/figma/error-handler';

/**
 * GET /api/figma/files
 * Lists the user's recent Figma files from their teams/projects.
 * Requires Firebase Bearer token authentication.
 * Free (0 credits).
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

    // 2. Get valid Figma access token
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

    // 3. Get user info to find their teams
    let userInfo;
    try {
      userInfo = await getFigmaUserInfo(accessToken);
    } catch (error) {
      console.error('[API /figma/files] Failed to get user info:', error);
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType);
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 4. Get projects from user's teams
    const files = [];
    const teamIds = userInfo.team_ids || [];

    for (const teamId of teamIds.slice(0, 5)) {
      try {
        const projectsResponse = await getFigmaTeamProjects(accessToken, teamId);
        if (projectsResponse?.projects) {
          for (const project of projectsResponse.projects) {
            files.push({
              projectId: project.id,
              projectName: project.name,
              teamId,
            });
          }
        }
      } catch (error) {
        // Skip teams that fail (user may not have access to all teams)
        const errorType = classifyError(error);
        if (errorType === ERROR_TYPES.RATE_LIMITED) {
          const errorResponse = buildErrorResponse(ERROR_TYPES.RATE_LIMITED);
          return NextResponse.json(
            { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
            { status: errorResponse.httpStatus }
          );
        }
        console.warn(`[API /figma/files] Failed to get projects for team ${teamId}:`, error.message);
      }
    }

    // 5. Also fetch recently accessed files from our database
    let recentFiles = [];
    try {
      const res = await databases.listDocuments(DB_ID, FIGMA_PROJECTS_COLLECTION_ID, [
        Query.equal('userEmail', userEmail),
        Query.orderDesc('lastAccessedAt'),
        Query.limit(20),
      ]);
      recentFiles = res.documents.map((doc) => ({
        fileKey: doc.fileKey,
        fileName: doc.fileName,
        lastModified: doc.lastModified,
        thumbnailUrl: doc.thumbnailUrl,
        lastAccessedAt: doc.lastAccessedAt,
        pageStructure: doc.pageStructure ? JSON.parse(doc.pageStructure) : null,
      }));
    } catch {
      // Non-critical — continue without recent files
    }

    // 6. Return combined results
    return NextResponse.json({
      success: true,
      user: {
        id: userInfo.id,
        handle: userInfo.handle,
        email: userInfo.email,
        imgUrl: userInfo.img_url,
      },
      projects: files,
      recentFiles,
    });
  } catch (error) {
    console.error('[API /figma/files] Unexpected error:', error);
    const errorResponse = buildErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
      { status: errorResponse.httpStatus }
    );
  }
}
