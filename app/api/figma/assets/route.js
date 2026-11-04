export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { getValidToken } from '@/lib/oauth-manager.js';
import { exportAssets, generateSVGComponent } from '@/lib/figma/asset-extractor.js';
import { classifyError, buildErrorResponse, ERROR_TYPES } from '@/lib/figma/error-handler';

const ASSET_CREDIT_COST = 5;

/**
 * POST /api/figma/assets
 * Export assets (PNG/SVG) from Figma nodes.
 * Requires Firebase Bearer token authentication.
 * Costs 5 credits per export operation.
 *
 * Request body:
 * {
 *   fileKey: string,          - Figma file key
 *   nodeIds: string[],        - Array of node IDs to export
 *   format: 'png' | 'svg',   - Export format (default: 'png')
 *   scales: number[],         - Scale factors for PNG (default: [1, 2, 3])
 *   generateComponents: boolean, - Whether to generate React SVG components (default: false)
 *   componentNames: object    - Map of nodeId → component name (optional)
 * }
 */
export async function POST(request) {
  try {
    // 1. Authenticate via Firebase Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      const token = authHeader.split('Bearer ')[1];
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userEmail = decoded.email;
    const userId = decoded.uid;

    // 2. Parse request body
    const body = await request.json();
    const {
      fileKey,
      nodeIds,
      format = 'png',
      scales = [1, 2, 3],
      generateComponents = false,
      componentNames = {},
    } = body;

    // Validate required fields
    if (!fileKey || typeof fileKey !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: fileKey' },
        { status: 400 }
      );
    }

    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: nodeIds (must be a non-empty array)' },
        { status: 400 }
      );
    }

    if (!['png', 'svg'].includes(format.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "png" or "svg".' },
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
      console.error('[API /figma/assets] User lookup failed:', error);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    // 4. Check sufficient credits BEFORE operation
    if (user.credits < ASSET_CREDIT_COST) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Insufficient credits. Required: ${ASSET_CREDIT_COST}, Available: ${user.credits}`,
          required_credits: ASSET_CREDIT_COST,
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

    // 7. Export assets from Figma
    let assetResults;
    try {
      const scaleParam = format.toLowerCase() === 'png' ? scales : 1;
      assetResults = await exportAssets(figmaToken, fileKey, nodeIds, format, scaleParam);
    } catch (error) {
      console.error('[API /figma/assets] Export failed:', error);
      const errorType = classifyError(error);
      const errorResponse = buildErrorResponse(errorType, {
        message: error.message || 'Failed to export assets from Figma. Please try again.',
      });
      return NextResponse.json(
        { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
        { status: errorResponse.httpStatus }
      );
    }

    // 8. Generate React SVG components if requested
    let components = null;
    if (generateComponents && format.toLowerCase() === 'svg') {
      components = {};
      for (const result of assetResults) {
        if (result.svg && !result.fallback) {
          const name = componentNames[result.nodeId] || `Icon_${result.nodeId.replace(/[^a-zA-Z0-9]/g, '_')}`;
          try {
            components[result.nodeId] = generateSVGComponent(result.svg, name);
          } catch (error) {
            console.warn(`[API /figma/assets] Component generation failed for ${result.nodeId}:`, error.message);
            components[result.nodeId] = null;
          }
        }
      }
    }

    // 9. Deduct credits ONLY on success
    try {
      const newCredits = Math.max(0, user.credits - ASSET_CREDIT_COST);
      await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
        credits: newCredits,
      });
    } catch (error) {
      console.error('[API /figma/assets] Credit deduction failed:', error);
      // Still return the result since export succeeded
    }

    // 10. Log the operation
    try {
      await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
        user_id: user.$id,
        model: 'figma-images-api',
        operation_type: 'figma_assets',
        credits_consumed: ASSET_CREDIT_COST,
        credits_remaining: Math.max(0, user.credits - ASSET_CREDIT_COST),
      });
    } catch (logError) {
      console.error('[API /figma/assets] Usage log failed:', logError);
    }

    // 11. Store generated output
    try {
      await databases.createDocument(DB_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID, ID.unique(), {
        userEmail,
        fileKey,
        nodeId: nodeIds.join(','),
        operationType: 'assets',
        inputPrompt: JSON.stringify({ format, scales, nodeIds, generateComponents }),
        outputCode: components ? JSON.stringify(components) : '',
        outputFormat: format,
        creditsUsed: ASSET_CREDIT_COST,
        createdAt: new Date().toISOString(),
      });
    } catch (storeError) {
      console.error('[API /figma/assets] Output storage failed:', storeError);
    }

    // 12. Build response with fallback notifications
    const fallbacks = assetResults.filter((r) => r.fallback);
    const notifications = fallbacks.map((r) => ({
      nodeId: r.nodeId,
      message: r.fallbackReason,
    }));

    return NextResponse.json({
      success: true,
      assets: assetResults.map((r) => ({
        nodeId: r.nodeId,
        format: r.format,
        scale: r.scale,
        url: r.url,
        svg: r.svg || null,
        fallback: r.fallback,
        expiresAt: r.expiresAt,
      })),
      components: components || null,
      notifications: notifications.length > 0 ? notifications : null,
      credits: {
        consumed: ASSET_CREDIT_COST,
        remaining: Math.max(0, user.credits - ASSET_CREDIT_COST),
      },
    });
  } catch (error) {
    console.error('[API /figma/assets] Unexpected error:', error);
    const errorResponse = buildErrorResponse(ERROR_TYPES.INTERNAL_ERROR);
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message, guidance: errorResponse.guidance },
      { status: errorResponse.httpStatus }
    );
  }
}
