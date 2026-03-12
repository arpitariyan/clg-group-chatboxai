import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { generateRevision, enhancePrompt } from '@/lib/ai-client';
import { formatConversation, validateHTML } from '@/lib/website-builder-utils';
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
    let shouldRefundCredit = false;
    let refundUserEmail = '';
    let currentProjectId = '';

    try {
        const { projectId } = await params;
        currentProjectId = projectId;
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

            shouldRefundCredit = true;
            refundUserEmail = project.user_email;
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

        const validation = validateHTML(revisedCode);
        if (!validation.isValid) {
            console.error('Generated invalid revision HTML:', validation.errors);
        }

        // Step 8: Create new version
        const version = await createWebsiteVersionDocument({
            projectId,
            code: revisedCode
        });

        // Step 9: Update project
        await updateWebsiteProjectCode(projectId, revisedCode, version.$id);

        const updatedProjectDoc = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
        const updatedProject = normalizeWebsiteProject(updatedProjectDoc);

        // Step 10: Add AI success message to conversation
        await createWebsiteConversationMessage(projectId, 'assistant', "I've made the changes to your website! You can now preview it");

        shouldRefundCredit = false;

        return NextResponse.json({
            success: true,
            versionId: version.$id,
            message: 'Website updated successfully',
            project: updatedProject,
            validation: {
                isValid: validation.isValid,
                errors: validation.errors
            }
        });

    } catch (error) {
        console.error('Error in revision endpoint:', error);

        if (shouldRefundCredit && refundUserEmail) {
            try {
                await refundWebsiteCreditsWithLock(refundUserEmail, 1);
            } catch (refundError) {
                console.error('Failed to refund revision credit:', refundError);
            }
        }

        if (currentProjectId) {
            try {
                await createWebsiteConversationMessage(
                    currentProjectId,
                    'assistant',
                    `Sorry, I encountered an error updating your website: ${error.message}`
                );
            } catch (conversationError) {
                console.error('Failed to save revision error message:', conversationError);
            }
        }

        return NextResponse.json(
            { error: 'Failed to generate revision', details: error.message },
            { status: 500 }
        );
    }
}
