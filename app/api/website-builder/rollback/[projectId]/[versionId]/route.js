import { NextResponse } from 'next/server';
import { databases, DB_ID } from '@/services/appwrite-admin';
import {
    ensureProjectOwnership,
    normalizeWebsiteVersion,
    updateWebsiteProjectCode
} from '@/lib/website-builder-server-utils';
import {
    WEBSITE_PROJECTS_COLLECTION_ID,
    WEBSITE_VERSIONS_COLLECTION_ID
} from '@/services/appwrite-collections';

export async function GET(request, { params }) {
    try {
        const { projectId, versionId } = await params;
        const { searchParams } = new URL(request.url);
        const userEmail = searchParams.get('userEmail');

        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 401 }
            );
        }

        let project;
        try {
            project = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
        } catch (projectError) {
            return NextResponse.json(
                { error: 'Project not found', details: projectError.message },
                { status: 404 }
            );
        }

        if (!ensureProjectOwnership(project, userEmail)) {
            return NextResponse.json(
                { error: 'You are not allowed to rollback this project' },
                { status: 403 }
            );
        }

        // Get the version
        let version;
        try {
            version = await databases.getDocument(DB_ID, WEBSITE_VERSIONS_COLLECTION_ID, versionId);
        } catch (versionError) {
            return NextResponse.json(
                { error: 'Version not found', details: versionError.message },
                { status: 404 }
            );
        }

        if (version.project_id !== projectId) {
            return NextResponse.json(
                { error: 'Version does not belong to this project' },
                { status: 404 }
            );
        }

        const normalizedVersion = normalizeWebsiteVersion(version);

        // Update project to use this version
        try {
            await updateWebsiteProjectCode(projectId, normalizedVersion.code, versionId);
        } catch (updateError) {
            console.error('Error rolling back:', updateError);
            return NextResponse.json(
                { error: 'Failed to rollback', details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully rolled back to previous version'
        });

    } catch (error) {
        console.error('Error in rollback endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
