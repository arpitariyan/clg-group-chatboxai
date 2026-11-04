import { NextResponse } from 'next/server';
import {
  createWebsiteConversationMessage,
  createWebsiteProjectDocument,
  normalizeDoc,
  normalizeWebsiteProject
} from '@/lib/website-builder-server-utils';
import { withUser } from '@/lib/request-context';

/**
 * POST /api/website-builder/create
 * 
 * Creates a new website project.
 * Returns the project immediately, generation happens async via Inngest.
 * 
 * Request body:
 * { prompt: string }
 * 
 * Response:
 * {
 *   success: true,
 *   projectId: string,
 *   projectName: string,
 *   message: string
 * }
 */
export const POST = withUser(async function POST(request, ctx) {
  try {
    const body = await request.json();
    const { prompt } = body;
    const userEmail = ctx.assertEmail(body.userEmail);

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 401 });
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const normalizedPrompt = prompt.trim();
    const projectName = normalizedPrompt.slice(0, 60) || 'My Website';

    const createdProject = await createWebsiteProjectDocument({
      userEmail,
      projectName,
      originalPrompt: normalizedPrompt,
      enhancedPrompt: normalizedPrompt,
    });

    const project = normalizeWebsiteProject(normalizeDoc(createdProject));

    // Save user prompt in conversation history for better revision context later.
    try {
      await createWebsiteConversationMessage(project.id, 'user', normalizedPrompt);
    } catch (convErr) {
      console.warn('[Create Route] Initial conversation message save failed:', convErr.message);
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      projectName: project.project_name,
      message: 'Project created. Ready for generation.',
    });
  } catch (error) {
    console.error('[Create Route] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error.message },
      { status: 500 }
    );
  }
});
