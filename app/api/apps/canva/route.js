export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { executeCanvaTool } from '@/lib/canva-connect.js';
import { getValidToken, markConnectionUsed } from '@/lib/oauth-manager.js';

/**
 * POST /api/apps/canva
 * Direct Canva tool execution endpoint
 * Supports all 17 Canva Connect API tools with proper parameter handling
 * 
 * Body: { toolId, parameters }
 */
export async function POST(req) {
  try {
    // Authenticate user
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

    const { toolId, parameters = {} } = await req.json();

    if (!toolId) {
      return NextResponse.json({ error: 'toolId is required' }, { status: 400 });
    }

    // Get Canva access token
    let accessToken;
    try {
      accessToken = await getValidToken(userId, 'canva');
    } catch (err) {
      return NextResponse.json(
        { error: 'Canva not connected. Please connect Canva from App Connections.' },
        { status: 401 }
      );
    }

    // Execute the tool
    const result = await executeCanvaTool(toolId, parameters, accessToken);

    // Mark connection as used
    await markConnectionUsed(userId, 'canva').catch(() => {});

    return NextResponse.json({
      status: 'success',
      toolId,
      data: result,
    });
  } catch (error) {
    console.error('[API /apps/canva] Error:', error);

    // Return structured error
    const statusCode = error.message.includes('expired') || error.message.includes('Unauthorized') ? 401
      : error.message.includes('rate limit') ? 429
      : error.message.includes('not found') ? 404
      : 500;

    return NextResponse.json(
      { status: 'failed', error: error.message || 'Canva tool execution failed' },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/apps/canva
 * Check Canva connection status and available tools
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

    // Check if Canva is connected
    let connected = false;
    try {
      await getValidToken(userId, 'canva');
      connected = true;
    } catch {
      connected = false;
    }

    // Return available tools
    const tools = [
      { id: 'canva_search_designs', name: 'Search Designs', category: 'search' },
      { id: 'canva_search', name: 'Search Templates', category: 'search' },
      { id: 'canva_get_design', name: 'Get Design', category: 'access' },
      { id: 'canva_get_design_pages', name: 'Get Design Pages', category: 'access' },
      { id: 'canva_get_design_content', name: 'Get Design Content', category: 'access' },
      { id: 'canva_fetch', name: 'Fetch', category: 'access' },
      { id: 'canva_import_design_from_url', name: 'Import Design', category: 'import' },
      { id: 'canva_get_design_import_from_url_status', name: 'Import Status', category: 'import' },
      { id: 'canva_export_design', name: 'Export Design', category: 'export' },
      { id: 'canva_get_export_formats', name: 'Get Export Formats', category: 'export' },
      { id: 'canva_get_design_export_status', name: 'Export Status', category: 'export' },
      { id: 'canva_create_folder', name: 'Create Folder', category: 'organization' },
      { id: 'canva_move_item_to_folder', name: 'Move to Folder', category: 'organization' },
      { id: 'canva_list_folder_items', name: 'List Folder Items', category: 'organization' },
      { id: 'canva_add_comment_thread_to_design', name: 'Add Comment', category: 'collaboration' },
      { id: 'canva_generate_design', name: 'Generate Design', category: 'generation' },
      { id: 'canva_get_design_generation_job', name: 'Generation Status', category: 'generation' },
    ];

    return NextResponse.json({
      connected,
      tools,
      toolCount: tools.length,
    });
  } catch (error) {
    console.error('[API /apps/canva GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Canva status' },
      { status: 500 }
    );
  }
}
