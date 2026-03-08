import { NextResponse } from 'next/server';
import { databases, DB_ID } from '@/services/appwrite-admin';
import { WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { ensureProjectOwnership, normalizeWebsiteProject } from '@/lib/website-builder-server-utils';

export async function GET(request, { params }) {
    try {
        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const userEmail = searchParams.get('userEmail');

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

        // Get current project to check if it exists and get current publish status
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

        const newPublishStatus = !project.is_published;
        const normalizedProject = normalizeWebsiteProject(project);

        try {
            await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, {
                is_published: newPublishStatus
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
            is_published: newPublishStatus,
            message: newPublishStatus
                ? `"${normalizedProject.project_name}" is now published and visible to everyone!`
                : `"${normalizedProject.project_name}" has been unpublished.`
        });

    } catch (error) {
        console.error('Error in publish endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
