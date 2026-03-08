import { NextResponse } from 'next/server';
import { databases, DB_ID } from '@/services/appwrite-admin';
import {
    createWebsiteVersionDocument,
    ensureProjectOwnership,
    updateWebsiteProjectCode
} from '@/lib/website-builder-server-utils';
import {
    WEBSITE_PROJECTS_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function POST(request, { params }) {
    try {
        const { projectId } = await params;
        const { code, userEmail } = await request.json();

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        if (!code) {
            return NextResponse.json(
                { error: 'Code is required' },
                { status: 400 }
            );
        }

        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 401 }
            );
        }

        // Get current project to verify it exists
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
                { error: 'You are not allowed to update this project' },
                { status: 403 }
            );
        }

        // Create a new version entry
        let newVersion;
        try {
            newVersion = await createWebsiteVersionDocument({
                projectId,
                code
            });
        } catch (versionError) {
            console.error('Error creating version:', versionError);
            return NextResponse.json(
                { error: 'Failed to create version', details: versionError.message },
                { status: 500 }
            );
        }

        // Update the project with new code and version
        try {
            await updateWebsiteProjectCode(projectId, code, newVersion.$id);
        } catch (updateError) {
            console.error('Error updating project:', updateError);
            return NextResponse.json(
                { error: 'Failed to update project', details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `"${project.project_name}" updated successfully!`,
            version_id: newVersion.$id
        });

    } catch (error) {
        console.error('Error in update endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
