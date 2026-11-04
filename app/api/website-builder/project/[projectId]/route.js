import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { WEBSITE_CONVERSATIONS_COLLECTION_ID, WEBSITE_PROJECTS_COLLECTION_ID, WEBSITE_VERSIONS_COLLECTION_ID } from '@/services/appwrite-collections';
import {
    ensureProjectOwnership,
    normalizeDoc,
    normalizeWebsiteProject,
    normalizeWebsiteVersion
} from '@/lib/website-builder-server-utils';
import { resolveRequestUser } from '@/lib/server-auth';

export async function GET(request, { params }) {
    try {
        // Next.js 15: params is a Promise
        const { projectId } = await params;
        // Optional auth: derive the viewer from the verified token only — never trust a
        // client-supplied email. Published projects stay public (anonymous → null email);
        // private projects are visible only to their authenticated owner.
        let userEmail = null;
        try {
            const authedUser = await resolveRequestUser(request, false);
            userEmail = authedUser?.email || null;
        } catch (_) {
            userEmail = null;
        }

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

        // Anonymous public visitor viewing a published project:
        // Return only the public presentation shape. Do NOT query or expose
        // private conversation records, prompts, internal logs, historical versions, or user emails.
        if (!isOwner) {
            return NextResponse.json({
                success: true,
                project: {
                    id: project.$id,
                    project_name: project.name || project.project_name || 'Published Website',
                    current_code: project.html_content || project.current_code || '',
                    html_content: project.html_content || project.current_code || '',
                    is_published: true,
                    published_url: project.published_url || '',
                    created_at: project.$createdAt,
                    updated_at: project.$updatedAt,
                    conversations: [],
                    versions: []
                }
            });
        }

        // Authenticated owner/editor view: fetch full version history and conversation log
        let versions = [];
        try {
            const versionsRes = await databases.listDocuments(DB_ID, WEBSITE_VERSIONS_COLLECTION_ID, [
                Query.equal('project_id', projectId),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            versions = (versionsRes.documents || []).map((doc) => normalizeWebsiteVersion(normalizeDoc(doc)));
        } catch (versionsError) {
            console.error('Error fetching versions:', versionsError);
        }

        let conversations = [];
        try {
            const convsRes = await databases.listDocuments(DB_ID, WEBSITE_CONVERSATIONS_COLLECTION_ID, [
                Query.equal('project_id', projectId),
                Query.orderAsc('$createdAt'),
                Query.limit(500)
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
