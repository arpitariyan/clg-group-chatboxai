import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { generateRevision, enhancePrompt } from '@/lib/ai-client';
import { formatConversation } from '@/lib/website-builder-utils';
import {
    createWebsiteConversationMessage,
    createWebsiteVersionDocument,
    deductWebsiteCreditsWithLock,
    ensureProjectOwnership,
    normalizeWebsiteProject,
    refundWebsiteCreditsWithLock,
    updateWebsiteProjectCode
} from '@/lib/website-builder-server-utils';
import {
    WEBSITE_PROJECTS_COLLECTION_ID,
    WEBSITE_CONVERSATIONS_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function POST(request, { params }) {
    try {
        const { projectId } = await params;
        const { message, userEmail } = await request.json();

        if (!message || !message.trim()) {
            return NextResponse.json(
                { error: 'Revision message is required' },
                { status: 400 }
            );
        }

        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 401 }
            );
        }

        // Step 1: Get current project
        let project;
        try {
            project = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
        } catch (projectError) {
            return NextResponse.json(
                { error: 'Project not found', details: projectError.message },
                { status: 404 }
            );
        }

        const normalizedProject = normalizeWebsiteProject(project);

        if (!normalizedProject.current_code) {
            return NextResponse.json(
                { error: 'No current code to revise. Please wait for initial generation.' },
                { status: 400 }
            );
        }

        if (!ensureProjectOwnership(project, userEmail)) {
            return NextResponse.json(
                { error: 'You are not allowed to revise this project' },
                { status: 403 }
            );
        }

        // Check and deduct credits before generating revision
        try {
            const result = await deductWebsiteCreditsWithLock(project.user_email, 1);

            if (!result.success) {
                return NextResponse.json(
                    {
                        error: 'Insufficient credits',
                        message: 'You do not have enough credits to make revisions. Please purchase more credits or wait for your weekly reset.',
                        credits: {
                            weekly: result.weekly_credits,
                            purchased: result.purchased_credits,
                            total: result.total_credits
                        }
                    },
                    { status: 402 }
                );
            }
        } catch (creditError) {
            console.error('Credit check error:', creditError);
            return NextResponse.json(
                { error: 'Failed to process credits', details: creditError.message },
                { status: 500 }
            );
        }

        // Step 2: Get conversation history
        const convRes = await databases.listDocuments(DB_ID, WEBSITE_CONVERSATIONS_COLLECTION_ID, [
            Query.equal('project_id', projectId),
            Query.orderAsc('$createdAt'),
            Query.limit(100)
        ]);
        const formattedHistory = formatConversation(convRes.documents || []);

        // Step 3: Add user message to conversation
        await createWebsiteConversationMessage(projectId, 'user', message);

        // Step 4: Enhance the revision request
        const enhancedRequest = await enhancePrompt(message);

        // Step 5: Add assistant message about enhancement
        await createWebsiteConversationMessage(projectId, 'assistant', `I've enhanced your request to: "${enhancedRequest}"`);

        // Step 6: Add assistant message about starting changes
        await createWebsiteConversationMessage(projectId, 'assistant', 'Now making changes to your website...');

        // Step 7: Generate revision
        const revisedCode = await generateRevision(
            normalizedProject.current_code,
            enhancedRequest,
            formattedHistory
        );

        // Step 8: Create new version
        let version;
        try {
            version = await createWebsiteVersionDocument({
                projectId,
                code: revisedCode
            });
        } catch (versionError) {
            console.error('Error creating version:', versionError);
            await refundWebsiteCreditsWithLock(project.user_email, 1);
            return NextResponse.json(
                { error: 'Failed to save revision', details: versionError.message },
                { status: 500 }
            );
        }

        // Step 9: Update project
        try {
            await updateWebsiteProjectCode(projectId, revisedCode, version.$id);
        } catch (updateError) {
            console.error('Error updating project:', updateError);
            await refundWebsiteCreditsWithLock(project.user_email, 1);
            return NextResponse.json(
                { error: 'Failed to update project after revision', details: updateError.message },
                { status: 500 }
            );
        }

        // Step 10: Add AI success message to conversation
        await createWebsiteConversationMessage(projectId, 'assistant', "I've made the changes to your website! You can now preview it");

        return NextResponse.json({
            success: true,
            versionId: version.$id,
            message: 'Website updated successfully'
        });

    } catch (error) {
        console.error('Error in revision endpoint:', error);
        return NextResponse.json(
            { error: 'Failed to generate revision', details: error.message },
            { status: 500 }
        );
    }
}
