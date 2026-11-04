export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getValidToken } from '@/lib/oauth-manager.js';
import { getFigmaFile, getFigmaNodes } from '@/lib/figma/figma-api';
import { parseFigmaNode } from '@/lib/figma/figma-node-parser';
import { classifyError, buildErrorResponse, ERROR_TYPES } from '@/lib/figma/error-handler';

/**
 * GET /api/figma/file-nodes?fileKey=...&nodeId=...
 * Gets the node tree for a Figma file or a specific frame/node.
 * Requires Firebase Bearer token authentication.
 * Free (0 credits).
 *
 * Query params:
 *   - fileKey (required): The Figma file key
 *   - nodeId (optional): Specific node ID to retrieve. If omitted, returns the full document tree.
 */
export async function GET(request) {
  try {
    // 1. Authenticate via Firebase Bearer token
    const authHeader = request.headers.get('authorization');
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

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('fileKey');
    const nodeId = searchParams.get('nodeId');

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

    // 4. Fetch nodes from Figma API
    let rawData;
    try {
      if (nodeId) {
        // Get specific node(s)
        rawData = await getFigmaNodes(accessToken, fileKey, [nodeId]);
      } else {
        // Get full file document tree
        rawData = await getFigmaFile(accessToken, fileKey);
      }
    } catch (error) {
      console.error('[API /figma/file-nodes] Figma API error:', error);
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType);
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 5. Parse the node tree
    let parsedNodes;
    if (nodeId && rawData.nodes) {
      // getFigmaNodes returns { nodes: { "nodeId": { document: {...} } } }
      const nodeData = rawData.nodes[nodeId];
      if (!nodeData || !nodeData.document) {
        return NextResponse.json(
          { error: 'NODE_NOT_FOUND', message: `Node "${nodeId}" not found in the file.` },
          { status: 404 }
        );
      }
      parsedNodes = parseFigmaNode(nodeData.document);
    } else if (rawData.document) {
      // getFigmaFile returns { document: {...}, ... }
      parsedNodes = parseFigmaNode(rawData.document);
    } else {
      return NextResponse.json(
        { error: 'PARSE_ERROR', message: 'Unable to parse the Figma file structure.' },
        { status: 500 }
      );
    }

    // 6. Return parsed node tree
    return NextResponse.json({
      success: true,
      fileKey,
      nodeId: nodeId || null,
      nodeTree: parsedNodes,
    });
  } catch (error) {
    console.error('[API /figma/file-nodes] Unexpected error:', error);
    const errorResponse = buildErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
      { status: errorResponse.httpStatus }
    );
  }
}
