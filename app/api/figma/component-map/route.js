export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getValidToken } from '@/lib/oauth-manager';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  USAGE_LOGS_COLLECTION_ID,
  FIGMA_COMPONENT_MAPPINGS_COLLECTION_ID,
  FIGMA_GENERATED_OUTPUTS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { getFigmaNodes } from '@/lib/figma/figma-api';
import { parseFigmaNode } from '@/lib/figma/figma-node-parser';
import { indexComponentLibrary, matchFigmaComponent, generateUsageCode } from '@/lib/figma/component-mapper';
import { convertNodeToCode } from '@/lib/figma/design-converter';

const COMPONENT_MAP_CREDIT_COST = 10;

/**
 * POST /api/figma/component-map
 * Maps a Figma component to an existing component in the user's codebase.
 * Falls back to design-converter when no match is found.
 * Requires Firebase Bearer token authentication.
 * Costs 10 credits per operation.
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
    const { fileKey, nodeId, componentLibraryPath, confirmMapping } = body;

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

    if (!componentLibraryPath || typeof componentLibraryPath !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: componentLibraryPath' },
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
      console.error('[API /figma/component-map] User lookup failed:', error);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    // 4. Check sufficient credits BEFORE operation
    if (user.credits < COMPONENT_MAP_CREDIT_COST) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Insufficient credits. Required: ${COMPONENT_MAP_CREDIT_COST}, Available: ${user.credits}`,
          required_credits: COMPONENT_MAP_CREDIT_COST,
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

    // 6. Check for existing confirmed mapping
    try {
      const existingMappings = await databases.listDocuments(
        DB_ID,
        FIGMA_COMPONENT_MAPPINGS_COLLECTION_ID,
        [
          Query.equal('userEmail', userEmail),
          Query.equal('figmaComponentId', nodeId),
          Query.equal('confirmed', true),
          Query.limit(1),
        ]
      );

      if (existingMappings.documents.length > 0) {
        const existing = existingMappings.documents[0];
        return NextResponse.json({
          success: true,
          source: 'cached_mapping',
          match: {
            figmaComponentName: existing.figmaComponentName,
            localComponentPath: existing.localComponentPath,
            localComponentName: existing.localComponentName,
            propsMapping: JSON.parse(existing.propsMapping || '{}'),
            confidence: existing.confidence,
            confirmed: true,
          },
          credits: {
            consumed: 0,
            remaining: user.credits,
          },
        });
      }
    } catch {
      // If lookup fails, proceed with fresh mapping
    }

    // 7. Get valid Figma access token
    let figmaToken;
    try {
      figmaToken = await getValidToken(userId, 'figma');
    } catch (error) {
      const isReauth = error.message?.includes('Re-authorization') || error.message?.includes('re-authorization');
      return NextResponse.json(
        {
          error: isReauth ? 'FIGMA_REAUTH_REQUIRED' : 'FIGMA_TOKEN_ERROR',
          message: isReauth
            ? 'Your Figma connection has expired. Please reconnect your Figma account.'
            : 'Failed to access Figma. Please check your connection.',
        },
        { status: isReauth ? 401 : 500 }
      );
    }

    // 8. Fetch the Figma node data
    let rawNodeData, figmaComponentName;
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
      figmaComponentName = rawNodeData.name || 'Unknown';
    } catch (error) {
      console.error('[API /figma/component-map] Figma API fetch failed:', error);
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Figma file or node not found. Check the file key and node ID.' },
          { status: 404 }
        );
      }
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Figma API rate limit reached. Please try again in a moment.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch design data from Figma.' },
        { status: 500 }
      );
    }

    // 9. Parse the Figma node
    const parsedNode = parseFigmaNode(rawNodeData);
    if (!parsedNode) {
      return NextResponse.json(
        { error: 'Failed to parse the Figma node data.' },
        { status: 500 }
      );
    }

    // 10. Index the component library
    let componentIndex;
    try {
      componentIndex = await indexComponentLibrary(componentLibraryPath);
    } catch (error) {
      console.error('[API /figma/component-map] Library indexing failed:', error);
      return NextResponse.json(
        {
          error: 'INDEXING_FAILED',
          message: error.message || 'Failed to index the component library directory.',
        },
        { status: 400 }
      );
    }

    // 11. Match Figma component against the index
    const figmaComponent = {
      name: figmaComponentName,
      type: parsedNode.type,
      properties: parsedNode.componentProperties || {},
    };

    const matchResult = matchFigmaComponent(figmaComponent, componentIndex);

    // 12. Handle match result
    let result;
    if (matchResult.bestMatch && matchResult.confidence >= 70) {
      // Good match found - generate usage code
      const figmaProps = parsedNode.componentProperties || {};
      const usageCode = generateUsageCode(matchResult.bestMatch, figmaProps);

      result = {
        source: 'component_library',
        match: {
          componentName: matchResult.bestMatch.name,
          componentPath: matchResult.bestMatch.filePath,
          importPath: matchResult.bestMatch.importPath,
          confidence: matchResult.confidence,
          props: matchResult.bestMatch.props,
          usageCode,
        },
        alternatives: matchResult.alternatives,
        figmaComponent: {
          name: figmaComponentName,
          id: nodeId,
          type: parsedNode.type,
        },
      };

      // If confirmMapping flag is set, store the mapping
      if (confirmMapping) {
        try {
          await databases.createDocument(
            DB_ID,
            FIGMA_COMPONENT_MAPPINGS_COLLECTION_ID,
            ID.unique(),
            {
              userEmail,
              figmaComponentName,
              figmaComponentId: nodeId,
              localComponentPath: matchResult.bestMatch.filePath,
              localComponentName: matchResult.bestMatch.name,
              propsMapping: JSON.stringify(
                mapPropsForStorage(parsedNode.componentProperties, matchResult.bestMatch.props)
              ),
              confidence: matchResult.confidence,
              confirmed: true,
              createdAt: new Date().toISOString(),
            }
          );
        } catch (storeError) {
          console.error('[API /figma/component-map] Mapping storage failed:', storeError);
          // Non-fatal: still return the result
        }
      }
    } else {
      // No match found - fall back to design-converter
      let fallbackCode;
      try {
        const codeResult = await convertNodeToCode(parsedNode, {
          conversionType: 'component',
          componentName: undefined,
        });
        fallbackCode = codeResult;
      } catch (error) {
        console.error('[API /figma/component-map] Fallback conversion failed:', error);
        fallbackCode = null;
      }

      result = {
        source: 'design_converter',
        match: null,
        confidence: matchResult.confidence,
        alternatives: matchResult.alternatives,
        figmaComponent: {
          name: figmaComponentName,
          id: nodeId,
          type: parsedNode.type,
        },
        generatedCode: fallbackCode
          ? {
              code: fallbackCode.code,
              componentName: fallbackCode.componentName,
              imports: fallbackCode.imports,
            }
          : null,
      };
    }

    // 13. Deduct credits ONLY on success
    try {
      const newCredits = Math.max(0, user.credits - COMPONENT_MAP_CREDIT_COST);
      await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
        credits: newCredits,
      });
    } catch (error) {
      console.error('[API /figma/component-map] Credit deduction failed:', error);
      // Still return the result since operation succeeded
    }

    // 14. Log the operation
    try {
      await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
        user_id: user.$id,
        model: 'component-mapper',
        operation_type: 'figma_component_map',
        credits_consumed: COMPONENT_MAP_CREDIT_COST,
        credits_remaining: Math.max(0, user.credits - COMPONENT_MAP_CREDIT_COST),
      });
    } catch (logError) {
      console.error('[API /figma/component-map] Usage log failed:', logError);
    }

    // 15. Store generated output
    try {
      await databases.createDocument(DB_ID, FIGMA_GENERATED_OUTPUTS_COLLECTION_ID, ID.unique(), {
        userEmail,
        fileKey,
        nodeId,
        operationType: 'component_map',
        inputPrompt: `Map Figma component "${figmaComponentName}" to library at ${componentLibraryPath}`,
        outputCode: result.match?.usageCode || result.generatedCode?.code || '',
        outputFormat: result.source === 'component_library' ? 'mapping' : 'react-tailwind',
        creditsUsed: COMPONENT_MAP_CREDIT_COST,
        createdAt: new Date().toISOString(),
      });
    } catch (storeError) {
      console.error('[API /figma/component-map] Output storage failed:', storeError);
    }

    // 16. Return result
    return NextResponse.json({
      success: true,
      ...result,
      credits: {
        consumed: COMPONENT_MAP_CREDIT_COST,
        remaining: Math.max(0, user.credits - COMPONENT_MAP_CREDIT_COST),
      },
    });
  } catch (error) {
    console.error('[API /figma/component-map] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * Build a props mapping object for storage.
 * Maps Figma component properties to local component props.
 */
function mapPropsForStorage(figmaProps, componentProps) {
  if (!figmaProps || !componentProps) return {};

  const mapping = {};
  const entries = Object.entries(figmaProps || {});

  for (const [figmaKey, figmaValue] of entries) {
    const normalizedKey = figmaKey.toLowerCase().replace(/[-_\s]+/g, '');
    const matchedProp = componentProps.find((p) => {
      const normalizedPropName = p.name.toLowerCase().replace(/[-_\s]+/g, '');
      return normalizedPropName === normalizedKey ||
        normalizedPropName.includes(normalizedKey) ||
        normalizedKey.includes(normalizedPropName);
    });

    mapping[figmaKey] = {
      localProp: matchedProp ? matchedProp.name : figmaKey,
      figmaValue: figmaValue,
      mapped: !!matchedProp,
    };
  }

  return mapping;
}
