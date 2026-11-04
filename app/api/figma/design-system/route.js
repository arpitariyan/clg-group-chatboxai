export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { getValidToken } from '@/lib/oauth-manager.js';
import { extractDesignSystem } from '@/lib/figma/design-system-extractor';
import { formatTokensAsCSS, formatTokensAsTailwind, formatTokensAsJSON } from '@/lib/figma/token-formatter';
import { classifyError, buildErrorResponse, ERROR_TYPES } from '@/lib/figma/error-handler';

const DESIGN_SYSTEM_CREDIT_COST = 30;

/**
 * POST /api/figma/design-system
 * Extracts design system tokens from a Figma file.
 * Requires Firebase Bearer token authentication.
 * Costs 30 credits per file analyzed.
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
    const { fileKey, format = 'all' } = body;

    if (!fileKey || typeof fileKey !== 'string' || fileKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: fileKey' },
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
      console.error('[API /figma/design-system] User lookup failed:', error);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    // 4. Check sufficient credits BEFORE operation
    if (user.credits < DESIGN_SYSTEM_CREDIT_COST) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Insufficient credits. Required: ${DESIGN_SYSTEM_CREDIT_COST}, Available: ${user.credits}`,
          required_credits: DESIGN_SYSTEM_CREDIT_COST,
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
    let figmaAccessToken;
    try {
      figmaAccessToken = await getValidToken(userId, 'figma');
    } catch (error) {
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType);
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 7. Extract design system
    let designSystem;
    try {
      designSystem = await extractDesignSystem(figmaAccessToken, fileKey.trim());
    } catch (error) {
      console.error('[API /figma/design-system] Extraction failed:', error);
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType, {
        message: error.message || 'Failed to extract design system. Please try again.',
      });
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 8. Format tokens based on requested format
    const formattedOutput = {};
    const tokens = designSystem.tokens;

    if (format === 'all' || format === 'css') {
      formattedOutput.css = formatTokensAsCSS(tokens);
    }
    if (format === 'all' || format === 'tailwind') {
      formattedOutput.tailwind = formatTokensAsTailwind(tokens);
    }
    if (format === 'all' || format === 'json') {
      formattedOutput.json = formatTokensAsJSON(tokens);
    }

    // 9. Deduct credits ONLY on success
    try {
      const newCredits = Math.max(0, user.credits - DESIGN_SYSTEM_CREDIT_COST);
      await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
        credits: newCredits,
      });
    } catch (error) {
      console.error('[API /figma/design-system] Credit deduction failed:', error);
      // Still return the result since extraction succeeded
    }

    // 10. Log the operation
    try {
      await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
        user_id: user.$id,
        model: 'figma-api',
        operation_type: 'figma_design_system',
        credits_consumed: DESIGN_SYSTEM_CREDIT_COST,
        credits_remaining: Math.max(0, user.credits - DESIGN_SYSTEM_CREDIT_COST),
      });
    } catch (logError) {
      console.error('[API /figma/design-system] Usage log failed:', logError);
    }

    // 11. Store generated output
    try {
      await databases.createDocument(DB_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID, ID.unique(), {
        userEmail,
        fileKey: fileKey.trim(),
        nodeId: '',
        operationType: 'design_system',
        inputPrompt: `Extract design system from file: ${fileKey}`,
        outputCode: formattedOutput.css || formattedOutput.json || '',
        outputFormat: format,
        creditsUsed: DESIGN_SYSTEM_CREDIT_COST,
        createdAt: new Date().toISOString(),
      });
    } catch (storeError) {
      console.error('[API /figma/design-system] Output storage failed:', storeError);
    }

    // 12. Return result
    return NextResponse.json({
      success: true,
      designSystem: {
        tokens: designSystem.tokens,
        categories: designSystem.categories,
        metadata: designSystem.metadata,
        formatted: formattedOutput,
      },
      credits: {
        consumed: DESIGN_SYSTEM_CREDIT_COST,
        remaining: Math.max(0, user.credits - DESIGN_SYSTEM_CREDIT_COST),
      },
    });
  } catch (error) {
    console.error('[API /figma/design-system] Unexpected error:', error);
    const errorResponse = buildErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
      { status: errorResponse.httpStatus }
    );
  }
}
