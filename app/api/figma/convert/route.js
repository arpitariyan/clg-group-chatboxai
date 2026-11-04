export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { getValidToken } from '@/lib/oauth-manager';
import { getFigmaNodes } from '@/lib/figma/figma-api';
import { parseFigmaNode } from '@/lib/figma/figma-node-parser';
import { convertNodeToCode } from '@/lib/figma/design-converter';
import { classifyError, buildErrorResponse, ERROR_TYPES } from '@/lib/figma/error-handler';

const CREDIT_COSTS = {
  component: 20,
  page: 50,
};

/**
 * POST /api/figma/convert
 * Converts a Figma design node into a React component with Tailwind CSS.
 * Requires Firebase Bearer token authentication.
 * Costs 20 credits for component, 50 credits for full page.
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
    const {
      fileKey,
      nodeId,
      conversionType = 'component',
      componentName,
      includeResponsive = true,
      includeAccessibility = true,
    } = body;

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

    if (!['component', 'page'].includes(conversionType)) {
      return NextResponse.json(
        { error: 'Invalid conversionType. Must be "component" or "page".' },
        { status: 400 }
      );
    }

    const creditCost = CREDIT_COSTS[conversionType];

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
      console.error('[API /figma/convert] User lookup failed:', error);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    // 4. Check sufficient credits BEFORE operation
    if (user.credits < creditCost) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Insufficient credits. Required: ${creditCost}, Available: ${user.credits}`,
          required_credits: creditCost,
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
    let figmaToken;
    try {
      figmaToken = await getValidToken(userId, 'figma');
    } catch (error) {
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType);
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 7. Fetch the Figma node data
    let rawNodeData;
    try {
      const nodesResponse = await getFigmaNodes(figmaToken, fileKey, [nodeId]);
      const nodeData = nodesResponse?.nodes?.[nodeId];
      if (!nodeData || !nodeData.document) {
        return NextResponse.json(
          { error: 'Node not found in the specified Figma file.' },
          { status: 404 }
        );
      }
      rawNodeData = nodeData.document;
    } catch (error) {
      console.error('[API /figma/convert] Figma API fetch failed:', error);
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType);
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 8. Parse the node
    const parsedNode = parseFigmaNode(rawNodeData);
    if (!parsedNode) {
      return NextResponse.json(
        { error: 'Failed to parse the Figma node data.' },
        { status: 500 }
      );
    }

    // 9. Convert to code using AI
    let codeResult;
    try {
      codeResult = await convertNodeToCode(parsedNode, {
        conversionType,
        componentName,
        includeResponsive,
        includeAccessibility,
      });
    } catch (error) {
      console.error('[API /figma/convert] Code generation failed:', error);
      const errorResponse = buildErrorResponse(ERROR_TYPES.AI_FAILURE, {
        message: error.message || 'AI code generation failed. Please try again or select a simpler design element.',
      });
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 10. Deduct credits ONLY on success
    try {
      const newCredits = Math.max(0, user.credits - creditCost);
      await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
        credits: newCredits,
      });
    } catch (error) {
      console.error('[API /figma/convert] Credit deduction failed:', error);
      // Still return the result since generation succeeded
    }

    // 11. Log the operation
    try {
      await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
        user_id: user.$id,
        model: 'gemini-2.0-flash',
        operation_type: `figma_convert_${conversionType}`,
        credits_consumed: creditCost,
        credits_remaining: Math.max(0, user.credits - creditCost),
      });
    } catch (logError) {
      console.error('[API /figma/convert] Usage log failed:', logError);
    }

    // 12. Store generated output
    try {
      await databases.createDocument(DB_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID, ID.unique(), {
        userEmail,
        fileKey,
        nodeId,
        operationType: `convert_${conversionType}`,
        inputPrompt: `Convert ${parsedNode.name} (${parsedNode.type}) to ${conversionType}`,
        outputCode: codeResult.code,
        outputFormat: 'react-tailwind',
        creditsUsed: creditCost,
        createdAt: new Date().toISOString(),
      });
    } catch (storeError) {
      console.error('[API /figma/convert] Output storage failed:', storeError);
    }

    // 13. Return result
    return NextResponse.json({
      success: true,
      result: {
        code: codeResult.code,
        componentName: codeResult.componentName,
        imports: codeResult.imports,
        conversionType: codeResult.conversionType,
        metadata: codeResult.metadata,
      },
      credits: {
        consumed: creditCost,
        remaining: Math.max(0, user.credits - creditCost),
      },
    });
  } catch (error) {
    console.error('[API /figma/convert] Unexpected error:', error);
    const errorResponse = buildErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
      { status: errorResponse.httpStatus }
    );
  }
}
