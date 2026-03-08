import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { WEBSITE_CONVERSATIONS_COLLECTION_ID, WEBSITE_PROJECTS_COLLECTION_ID, WEBSITE_VERSIONS_COLLECTION_ID } from '@/services/appwrite-collections';
import {
    ensureProjectOwnership,
    normalizeDoc,
    normalizeWebsiteProject,
    normalizeWebsiteVersion
} from '@/lib/website-builder-server-utils';

export async function GET(request, { params }) {
    try {
        // Next.js 15: params is a Promise
        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const userEmail = searchParams.get('userEmail');

        // Get project with all related data
        let project;
        try {
            project = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
        } catch (projectError) {
            return NextResponse.json(
                { error: 'Project not found', details: projectError?.message },
                { status: 404 }
            );
        }

        const isOwner = ensureProjectOwnership(project, userEmail);
        if (!project.is_published && !isOwner) {
            return NextResponse.json(
                { error: 'Access denied for this private project' },
                { status: 403 }
            );
        }

        // Get all versions
        let versions = [];
        try {
            const versionsRes = await databases.listDocuments(DB_ID, WEBSITE_VERSIONS_COLLECTION_ID, [
                Query.equal('project_id', projectId),
                Query.orderDesc('$createdAt')
            ]);
            versions = (versionsRes.documents || []).map((doc) => normalizeWebsiteVersion(normalizeDoc(doc)));
        } catch (versionsError) {
            console.error('Error fetching versions:', versionsError);
        }

        // Get conversation history
        let conversations = [];
        try {
            const convsRes = await databases.listDocuments(DB_ID, WEBSITE_CONVERSATIONS_COLLECTION_ID, [
                Query.equal('project_id', projectId),
                Query.orderAsc('$createdAt')
            ]);
            conversations = (convsRes.documents || []).map(normalizeDoc);
        } catch (convError) {
            console.error('Error fetching conversations:', convError);
        }

        const normalizedProject = normalizeWebsiteProject(normalizeDoc(project));

        return NextResponse.json({
            success: true,
            project: {
                ...normalizedProject,
                conversations: conversations || [],
                versions: versions || []
            }
        });

    } catch (error) {
        console.error('Error in project endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
