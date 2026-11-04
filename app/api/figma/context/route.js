export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getValidToken } from '@/lib/oauth-manager.js';
import { getFigmaNodes } from '@/lib/figma/figma-api';
import { analyzeDesignContext } from '@/lib/figma/design-context-analyzer';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID } from '@/services/appwrite-collections';
import { classifyError, buildErrorResponse, ERROR_TYPES } from '@/lib/figma/error-handler';

const CONTEXT_CREDIT_COST = 10;

/**
 * POST /api/figma/context
 * Performs design context analysis on a Figma node.
 * Extracts layout, responsive, variant, interactive state, text, and image context.
 * Requires Firebase Bearer token authentication.
 * Costs 10 credits.
 *
 * Request body:
 *   - fileKey (required): The Figma file key
 *   - nodeId (required): The node ID to analyze
 */
export async function POST(request) {
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

    // 2. Parse request body
    const body = await request.json();
    const { fileKey, nodeId } = body;

    if (!fileKey || typeof fileKey !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: fileKey' },
        { status: 400 }
      );
    }

    if (!nodeId || typeof nodeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: nodeId' },
        { status: 400 }
      );
    }

    // 3. Get user and check credits
    let user;
    try {
      const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('email', userEmail),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      user = res.documents[0];
    } catch (error) {
      console.error('[API /figma/context] User lookup failed:', error);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    // 4. Check sufficient credits BEFORE operation
    if (user.credits < CONTEXT_CREDIT_COST) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Insufficient credits. Required: ${CONTEXT_CREDIT_COST}, Available: ${user.credits}`,
          required_credits: CONTEXT_CREDIT_COST,
          available_credits: user.credits,
        },
        { status: 402 }
      );
    }

    // 5. Check free plan daily limit (5 operations per day)
    if (user.plan === 'free') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const logsRes = await databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
          Query.equal('user_id', user.$id),
          Query.startsWith('operation_type', 'figma_'),
          Query.limit(100),
        ]);
        const todayOps = logsRes.documents.filter(
          (doc) => doc.$createdAt && doc.$createdAt.startsWith(today)
        );
        if (todayOps.length >= 5) {
          return NextResponse.json(
            {
              error: 'DAILY_LIMIT_REACHED',
              message: 'Free plan is limited to 5 Figma operations per day. Upgrade for unlimited access.',
            },
            { status: 429 }
          );
        }
      } catch {
        // If log check fails, allow the operation to proceed
      }
    }

    // 6. Get valid Figma access token
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

    // 7. Fetch the node from Figma API
    let nodeData;
    try {
      const response = await getFigmaNodes(accessToken, fileKey, [nodeId]);
      const nodeEntry = response.nodes?.[nodeId];
      if (!nodeEntry || !nodeEntry.document) {
        return NextResponse.json(
          { error: 'NODE_NOT_FOUND', message: `Node "${nodeId}" not found in file "${fileKey}".` },
          { status: 404 }
        );
      }
      nodeData = nodeEntry.document;
    } catch (error) {
      console.error('[API /figma/context] Figma API error:', error);
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType);
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 8. Analyze design context
    let contextResult;
    try {
      contextResult = analyzeDesignContext(nodeData);
    } catch (error) {
      console.error('[API /figma/context] Analysis failed:', error);
      return NextResponse.json(
        { error: 'ANALYSIS_FAILED', message: 'Failed to analyze design context. The node may contain unsupported elements.' },
        { status: 500 }
      );
    }

    // 9. Deduct credits ONLY on success
    try {
      const newCredits = Math.max(0, user.credits - CONTEXT_CREDIT_COST);
      await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
        credits: newCredits,
      });
    } catch (error) {
      console.error('[API /figma/context] Credit deduction failed:', error);
      // Still return the result since analysis succeeded
    }

    // 10. Log the operation
    try {
      await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
        user_id: user.$id,
        model: 'figma-context-analyzer',
        operation_type: 'figma_context',
        credits_consumed: CONTEXT_CREDIT_COST,
        credits_remaining: Math.max(0, user.credits - CONTEXT_CREDIT_COST),
      });
    } catch (logError) {
      console.error('[API /figma/context] Usage log failed:', logError);
    }

    // 11. Return result
    return NextResponse.json({
      success: true,
      fileKey,
      nodeId,
      context: contextResult,
      credits: {
        consumed: CONTEXT_CREDIT_COST,
        remaining: Math.max(0, user.credits - CONTEXT_CREDIT_COST),
      },
    });
  } catch (error) {
    console.error('[API /figma/context] Unexpected error:', error);
    const errorResponse = buildErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
      { status: errorResponse.httpStatus }
    );
  }
}
