import { NextResponse } from 'next/server';
import { databases, DB_ID } from '@/services/appwrite-admin';
import {
    createWebsiteVersionDocument,
    ensureProjectOwnership,
    updateWebsiteProjectCode,
    ensureTemplateFilesInCode,
    normalizeWebsiteProject,
    queueByKey
} from '@/lib/website-builder-server-utils';
import {
    WEBSITE_PROJECTS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { withUser } from '@/lib/request-context';

export const POST = withUser(async function POST(request, ctx) {
    try {
        const { projectId } = await ctx.params;
        const body = await request.json();
        const { code } = body;
        const userEmail = ctx.assertEmail(body.userEmail);

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

        const normalizedProject = normalizeWebsiteProject(project);
        const safeCode = ensureTemplateFilesInCode(code, normalizedProject.project_name);

        const result = await queueByKey(projectId, async () => {
            // Create a new version entry
            const newVersion = await createWebsiteVersionDocument({
                projectId,
                code: safeCode
            });

            // Update the project with new code and version
            await updateWebsiteProjectCode(projectId, safeCode, newVersion.$id);

            return {
                newVersion
            };
        });

        return NextResponse.json({
            success: true,
            message: `"${project.project_name}" updated successfully!`,
            version_id: result.newVersion.$id
        });

    } catch (error) {
        console.error('Error in update endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
});
