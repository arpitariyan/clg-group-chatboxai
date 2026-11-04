import { NextResponse } from 'next/server';
import { databases, DB_ID } from '@/services/appwrite-admin';
import { WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { ensureProjectOwnership, normalizeWebsiteProject } from '@/lib/website-builder-server-utils';
import { withUser } from '@/lib/request-context';

async function handlePublishMutation(request, ctx) {
    const { projectId } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const userEmail = ctx.assertEmail(searchParams.get('userEmail'));

    if (!projectId) {
        return NextResponse.json(
            { error: 'Project ID is required' },
            { status: 400 }
        );
    }

    if (!userEmail) {
        return NextResponse.json(
            { error: 'User email is required' },
            { status: 401 }
        );
    }

    // Get current project to verify existence and check ownership
    let project;
    try {
        project = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
    } catch (fetchError) {
        console.error('Error fetching project:', fetchError);
        return NextResponse.json(
            { error: 'Project not found', details: fetchError.message },
            { status: 404 }
        );
    }

    if (!ensureProjectOwnership(project, userEmail)) {
        return NextResponse.json(
            { error: 'You are not allowed to publish this project' },
            { status: 403 }
        );
    }

    let desiredPublishedState = null;

    // Try reading explicit desired state from JSON body (POST) or query param
    if (request.method === 'POST') {
        try {
            const body = await request.json().catch(() => ({}));
            if (typeof body?.isPublished === 'boolean') {
                desiredPublishedState = body.isPublished;
            }
        } catch (_) {}
    }

    if (desiredPublishedState === null && searchParams.has('isPublished')) {
        desiredPublishedState = searchParams.get('isPublished') === 'true';
    }

    // Fallback: Toggle current state
    if (desiredPublishedState === null) {
        desiredPublishedState = !project.is_published;
    }

    const normalizedProject = normalizeWebsiteProject(project);

    // Idempotent: If already at desired state, return success without extra DB write
    if (Boolean(project.is_published) === Boolean(desiredPublishedState)) {
        return NextResponse.json({
            success: true,
            is_published: desiredPublishedState,
            message: desiredPublishedState
                ? `"${normalizedProject.project_name}" is published.`
                : `"${normalizedProject.project_name}" is unpublished.`
        });
    }

    try {
        await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, {
            is_published: desiredPublishedState
        });
    } catch (updateError) {
        console.error('Error updating publish status:', updateError);
        return NextResponse.json(
            { error: 'Failed to update publish status', details: updateError.message },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        is_published: desiredPublishedState,
        message: desiredPublishedState
            ? `"${normalizedProject.project_name}" is now published and visible to everyone!`
            : `"${normalizedProject.project_name}" has been unpublished.`
    });
}

export const POST = withUser(async function POST(request, ctx) {
    try {
        return await handlePublishMutation(request, ctx);
    } catch (error) {
        console.error('Error in publish POST endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
});

/**
 * GET /api/website-builder/publish/[projectId]
 * Strictly read-only query for project publication status. Does NOT mutate state.
 */
export const GET = withUser(async function GET(request, ctx) {
    try {
        const { projectId } = await ctx.params;
        const { searchParams } = new URL(request.url);
        const userEmail = ctx.assertEmail(searchParams.get('userEmail'));

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        let project;
        try {
            project = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
        } catch (fetchError) {
            return NextResponse.json(
                { error: 'Project not found', details: fetchError.message },
                { status: 404 }
            );
        }

        const isOwner = userEmail ? ensureProjectOwnership(project, userEmail) : false;
        if (!project.is_published && !isOwner) {
            return NextResponse.json(
                { error: 'Access denied for this private project' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            projectId,
            is_published: Boolean(project.is_published)
        });
    } catch (error) {
        console.error('Error in publish GET endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
});
