export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { executeCanvaTool } from '@/lib/canva-connect.js';
import { getValidToken } from '@/lib/oauth-manager.js';

/**
 * POST /api/apps/canva/status
 * Poll the status of async Canva operations (generation, export, import)
 * 
 * Body: { jobId, jobType: 'generation' | 'export' | 'import' }
 */
export async function POST(req) {
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

    const { jobId, jobType } = await req.json();

    if (!jobId || !jobType) {
      return NextResponse.json(
        { error: 'jobId and jobType are required' },
        { status: 400 }
      );
    }

    // Map job type to the correct status tool
    const statusToolMap = {
      generation: 'canva_get_design_generation_job',
      export: 'canva_get_design_export_status',
      import: 'canva_get_design_import_from_url_status',
    };

    const statusToolId = statusToolMap[jobType];
    if (!statusToolId) {
      return NextResponse.json(
        { error: `Invalid jobType: ${jobType}. Use: generation, export, or import` },
        { status: 400 }
      );
    }

    // Get Canva access token
    let accessToken;
    try {
      accessToken = await getValidToken(userId, 'canva');
    } catch {
      return NextResponse.json(
        { error: 'Canva not connected. Please connect Canva from App Connections.' },
        { status: 401 }
      );
    }

    const result = await executeCanvaTool(statusToolId, { jobId }, accessToken);

    return NextResponse.json({
      status: 'success',
      jobId,
      jobType,
      data: result,
    });
  } catch (error) {
    console.error('[API /apps/canva/status] Error:', error);
    return NextResponse.json(
      { status: 'failed', error: error.message || 'Status check failed' },
      { status: 500 }
    );
  }
}
