import { NextResponse } from 'next/server';
import { databases, DB_ID } from '@/services/appwrite-admin';
import { WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import {
  ensureProjectOwnership,
  normalizeDoc,
  normalizeWebsiteProject
} from '@/lib/website-builder-server-utils';
import { withUser } from '@/lib/request-context';

/**
 * GET /api/website-builder/status?projectId=...
 * 
 * Polls generation status from the Appwrite website project document.
 * 
 * Query params:
 * - projectId: string (required)
 * 
 * Response:
 * {
 *   status: 'generating' | 'success' | 'error',
 *   projectName: string,
 *   sandboxUrl?: string,
 *   latestMessage?: { role, content, createdAt }
 * }
 */
export const GET = withUser(async function GET(request, ctx) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userEmail = ctx.assertEmail(searchParams.get('userEmail'));

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 401 });
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let projectDoc;
    try {
      projectDoc = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
    } catch (projectError) {
      return NextResponse.json(
        { error: 'Project not found', details: projectError?.message },
        { status: 404 }
      );
    }

    if (!ensureProjectOwnership(projectDoc, userEmail)) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 403 }
      );
    }

    const project = normalizeWebsiteProject(normalizeDoc(projectDoc));
    const hasCode = Boolean(project.current_code && project.current_code.trim());

    const status = project.status || (hasCode ? 'success' : 'pending');
    const generationStep = project.generation_step || '';

    const progressByStep = {
      queued: 5,
      started: 10,
      detecting: 15,
      enhancing: 25,
      extracting: 35,
      prd: 45,
      planning: 50,
      executing: 55,
      building: 65,
      'api limits': 70,
      pausing: 70,
      refining: 75,
      validating: 80,
      saving: 90,
      deploying: 95,
      complete: 100,
      success: 100,
    };

    const stepKey = generationStep.toLowerCase();
    let progress = 0;

    for (const [key, value] of Object.entries(progressByStep)) {
      if (stepKey.includes(key)) {
        progress = Math.max(progress, value);
      }
    }

    // Dynamic interpolation if step contains task index, e.g. (2/5)
    const taskMatch = generationStep.match(/(\d+)\s*\/\s*(\d+)/);
    if (taskMatch) {
      const current = parseInt(taskMatch[1], 10);
      const total = parseInt(taskMatch[2], 10);
      if (total > 0 && current <= total) {
        progress = Math.max(progress, Math.round(55 + (current / total) * 22));
      }
    }

    if (status === 'generating') {
      progress = Math.max(progress, 10);
    } else if (status === 'queued') {
      progress = Math.max(progress, 5);
    } else if (status === 'success') {
      progress = 100;
    } else if (status === 'error' && progress === 0) {
      progress = 100;
    }

    const updatedAt = new Date(project.updated_at || projectDoc.$updatedAt || Date.now()).getTime();
    const isStale = (status === 'queued' || status === 'generating') && (Date.now() - updatedAt > 15 * 60 * 1000);

    if (isStale) {
      return NextResponse.json({
        status: 'error',
        stage: 'failed',
        generation_step: 'Generation timed out or worker stalled',
        progress: 100,
        error_message: 'The generation job timed out. You may safely retry.',
        projectName: project.project_name,
        sandboxUrl: null,
        hasCode,
        has_code: hasCode,
        is_stale: true,
      });
    }

    // Explicit lifecycle stage (prevents premature 'preview_ready' when code not saved)
    let stage = 'queued';
    if (status === 'success') {
      stage = project.is_published ? 'published' : 'preview_ready';
    } else if (status === 'generating') {
      stage = hasCode ? 'code_saved' : 'generating';
    } else if (status === 'error') {
      stage = 'failed';
    }

    const errorMessage = status === 'error' ? (generationStep || 'Generation failed') : null;

    return NextResponse.json({
      status,
      stage,
      generation_step: generationStep,
      progress,
      error_message: errorMessage,
      projectName: project.project_name,
      sandboxUrl: project.sandbox_url || null,
      hasCode,
      has_code: hasCode,
    });
  } catch (error) {
    console.error('[Status Route] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status', details: error.message },
      { status: 500 }
    );
  }
});
