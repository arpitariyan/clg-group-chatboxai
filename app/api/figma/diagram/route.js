export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { generateDiagram } from '@/lib/figma/diagram-generator';
import { buildErrorResponse, ERROR_TYPES } from '@/lib/figma/error-handler';

const DIAGRAM_CREDIT_COST = 15;

/**
 * POST /api/figma/diagram
 * Generates a diagram from a text prompt.
 * Requires Firebase Bearer token authentication.
 * Costs 15 credits per diagram.
 */
export async function POST(request) {
  try {
    // 1. Authenticate via Firebase Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userEmail;
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await adminAuth.verifyIdToken(token);
      userEmail = decoded.email;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { prompt, diagramType = 'auto', style = {} } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
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
      console.error('[API /figma/diagram] User lookup failed:', error);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    // 4. Check sufficient credits BEFORE operation
    if (user.credits < DIAGRAM_CREDIT_COST) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Insufficient credits. Required: ${DIAGRAM_CREDIT_COST}, Available: ${user.credits}`,
          required_credits: DIAGRAM_CREDIT_COST,
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

    // 6. Generate the diagram
    let diagramResult;
    try {
      diagramResult = await generateDiagram(prompt.trim(), diagramType, style);
    } catch (error) {
      console.error('[API /figma/diagram] Generation failed:', error);
      const errorResponse = buildErrorResponse(ERROR_TYPES.AI_FAILURE, {
        message: error.message || 'AI diagram generation failed. Please try again or simplify your prompt.',
      });
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 7. Deduct credits ONLY on success
    try {
      const newCredits = Math.max(0, user.credits - DIAGRAM_CREDIT_COST);
      await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
        credits: newCredits,
      });
    } catch (error) {
      console.error('[API /figma/diagram] Credit deduction failed:', error);
      // Still return the result since generation succeeded
    }

    // 8. Log the operation
    try {
      await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
        user_id: user.$id,
        model: 'gemini-2.0-flash',
        operation_type: 'figma_diagram',
        credits_consumed: DIAGRAM_CREDIT_COST,
        credits_remaining: Math.max(0, user.credits - DIAGRAM_CREDIT_COST),
      });
    } catch (logError) {
      console.error('[API /figma/diagram] Usage log failed:', logError);
    }

    // 9. Store generated output
    try {
      await databases.createDocument(DB_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID, ID.unique(), {
        userEmail,
        fileKey: '',
        nodeId: '',
        operationType: 'diagram',
        inputPrompt: prompt.trim(),
        outputCode: diagramResult.svg,
        outputFormat: 'svg',
        creditsUsed: DIAGRAM_CREDIT_COST,
        createdAt: new Date().toISOString(),
      });
    } catch (storeError) {
      console.error('[API /figma/diagram] Output storage failed:', storeError);
    }

    // 10. Return result
    return NextResponse.json({
      success: true,
      diagram: {
        type: diagramResult.diagramType,
        nodes: diagramResult.nodes,
        edges: diagramResult.edges,
        svg: diagramResult.svg,
        metadata: diagramResult.metadata,
      },
      credits: {
        consumed: DIAGRAM_CREDIT_COST,
        remaining: Math.max(0, user.credits - DIAGRAM_CREDIT_COST),
      },
    });
  } catch (error) {
    console.error('[API /figma/diagram] Unexpected error:', error);
    const errorResponse = buildErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
      { status: errorResponse.httpStatus }
    );
  }
}
