import { NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { databases, DB_ID } from '@/services/appwrite-admin';
import { WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import {
  deductWebsiteCreditsWithLock,
  ensureProjectOwnership,
  queueByKey,
  refundWebsiteCreditsWithLock,
  updateProjectGenerationState
} from '@/lib/website-builder-server-utils';
import { withUser } from '@/lib/request-context';

const GENERATION_COST = 1;

/**
 * POST /api/website-builder/generate
 * 
 * Triggers agent-based code generation using Appwrite + Inngest.
 * Returns HTTP 202 Accepted immediately - generation runs async.
 * 
 * Request body:
 * {
 *   projectId: string,
 *   prompt: string,
 *   designDescription?: string
 * }
 * 
 * Response (HTTP 202):
 * { success: true, projectId, message: "Generation started", status: "generating" }
 */
export const POST = withUser(async function POST(request, ctx) {
  let refundUserEmail = null;
  let shouldRefundCredit = false;

  try {
    const body = await request.json();
    const {
      projectId,
      prompt,
      enhancedPrompt,
      originalPrompt,
      imageUrl,
      designDescription
    } = body;
    const userEmail = ctx.assertEmail(body.userEmail);

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 401 });
    }

    const effectivePrompt = (enhancedPrompt || originalPrompt || prompt || '').trim();

    if (!projectId || !effectivePrompt) {
      return NextResponse.json(
        { error: 'projectId and prompt are required' },
        { status: 400 }
      );
    }

    return await queueByKey(projectId, async () => {
      // Re-fetch project to guarantee atomic state check after any queued predecessor
      let currentProject;
      try {
        currentProject = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
      } catch (projectError) {
        return NextResponse.json(
          { error: 'Project not found', details: projectError?.message },
          { status: 404 }
        );
      }

      if (!ensureProjectOwnership(currentProject, userEmail)) {
        return NextResponse.json(
          { error: 'Project not found or unauthorized' },
          { status: 403 }
        );
      }

      const updatedAtMs = new Date(currentProject.updated_at || currentProject.$updatedAt || Date.now()).getTime();
      const isStale = (currentProject.status === 'queued' || currentProject.status === 'generating') && (Date.now() - updatedAtMs > 15 * 60 * 1000);

      // Idempotency guard: If project is actively queued or generating, do not double-bill or duplicate Inngest jobs
      if ((currentProject.status === 'queued' || currentProject.status === 'generating') && !isStale) {
        return NextResponse.json(
          {
            success: true,
            projectId,
            message: 'Generation already in progress',
            status: currentProject.status,
            resumed: true,
          },
          { status: 202 }
        );
      }

      const deduction = await deductWebsiteCreditsWithLock(currentProject.user_email, GENERATION_COST);
      if (!deduction.success) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            message: 'You do not have enough credits to generate a new website.',
            credits: {
              weekly: deduction.weekly_credits,
              purchased: deduction.purchased_credits,
              total: deduction.total_credits
            }
          },
          { status: 402 }
        );
      }

      refundUserEmail = currentProject.user_email;
      shouldRefundCredit = true;

      const generationJobId = body.idempotencyKey
        ? String(body.idempotencyKey).trim().slice(0, 80)
        : `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await updateProjectGenerationState(projectId, {
        status: 'queued',
        generation_step: 'Queued'
      });

      // Validate imageUrl strictly so text descriptions are never passed to image extractors
      const isValidImageUrl = typeof imageUrl === 'string' && (
        imageUrl.startsWith('http://') ||
        imageUrl.startsWith('https://') ||
        imageUrl.startsWith('data:image/')
      );
      const sanitizedImageUrl = isValidImageUrl ? imageUrl.trim() : null;
      const sanitizedDesignDescription = typeof designDescription === 'string' ? designDescription.trim() : null;

      try {
        // Emit Inngest event for agent-based generation with durable jobId and timestamp
        await inngest.send({
          name: 'website-builder/generate.requested',
          data: {
            jobId: generationJobId,
            projectId,
            userEmail,
            enhancedPrompt: enhancedPrompt || effectivePrompt,
            originalPrompt: originalPrompt || effectivePrompt,
            imageUrl: sanitizedImageUrl,
            designDescription: sanitizedDesignDescription,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (dispatchError) {
        console.error('[Generate Route] Inngest dispatch failed:', dispatchError);
        // Rollback project status so project is not permanently stranded in 'queued'
        try {
          await updateProjectGenerationState(projectId, {
            status: 'failed',
            generation_step: 'Dispatch failed: could not queue background worker'
          });
        } catch (_) {}
        throw dispatchError;
      }

      shouldRefundCredit = false;

      return NextResponse.json(
        {
          success: true,
          projectId,
          jobId: generationJobId,
          message: 'Generation started',
          status: 'generating',
        },
        { status: 202 }
      );
    });
  } catch (error) {
    if (shouldRefundCredit && refundUserEmail) {
      try {
        await refundWebsiteCreditsWithLock(refundUserEmail, GENERATION_COST);
      } catch (refundError) {
        console.error('[Generate Route] Refund failed:', refundError.message);
      }
    }

    console.error('[Generate Route] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start generation', details: error.message },
      { status: 500 }
    );
  }
});
