import { NextResponse } from 'next/server';
import { generateProjectName } from '@/lib/website-builder-utils';
import {
    createWebsiteConversationMessage,
    createWebsiteProjectDocument,
    deductWebsiteCreditsWithLock,
    normalizeWebsiteProject,
    refundWebsiteCreditsWithLock
} from '@/lib/website-builder-server-utils';

const REQUIRED_WEBSITE_BUILDER_ENV = [
    'OPENROUTER_API_KEY',
    'APPWRITE_DATABASE_ID',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'APPWRITE_WEBSITE_PROJECTS_COLLECTION_ID',
    'APPWRITE_WEBSITE_VERSIONS_COLLECTION_ID',
    'APPWRITE_WEBSITE_CONVERSATIONS_COLLECTION_ID',
    'APPWRITE_WEBSITE_USER_CREDITS_COLLECTION_ID'
];

function getMissingWebsiteBuilderEnv() {
    return REQUIRED_WEBSITE_BUILDER_ENV.filter((key) => {
        const value = process.env[key];
        return !value || !String(value).trim();
    });
}

export async function POST(request) {
    try {
        const missingEnv = getMissingWebsiteBuilderEnv();
        if (missingEnv.length > 0) {
            return NextResponse.json(
                {
                    error: 'Website Builder is not configured on the server',
                    details: `Missing environment variables: ${missingEnv.join(', ')}`,
                    missingEnv
                },
                { status: 500 }
            );
        }

        const { prompt, userEmail } = await request.json();

        if (!prompt || !prompt.trim()) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 401 }
            );
        }

        // Check and deduct credits before creating project
        try {
            const result = await deductWebsiteCreditsWithLock(userEmail, 1);

            if (!result.success) {
                return NextResponse.json(
                    {
                        error: 'Insufficient credits',
                        message: 'You do not have enough credits to create a new website. Please purchase more credits or wait for your weekly reset.',
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

        // Generate project name from prompt
        const projectName = generateProjectName(prompt);

        // Step 1: Create project record quickly so user is navigated immediately.
        // Prompt enhancement and generation happen after page opens.
        let project;
        try {
            project = await createWebsiteProjectDocument({
                userEmail,
                projectName,
                originalPrompt: prompt,
                enhancedPrompt: prompt
            });
        } catch (projectError) {
            console.error('Error creating project:', projectError);
            await refundWebsiteCreditsWithLock(userEmail, 1);
            return NextResponse.json(
                { error: 'Failed to create project', details: projectError.message },
                { status: 500 }
            );
        }

        // Step 2: Add conversation messages (best-effort, should not block project creation)
        await createWebsiteConversationMessage(project.$id, 'user', prompt);
        await createWebsiteConversationMessage(project.$id, 'assistant', 'Project created. Analyzing your prompt...');
        await createWebsiteConversationMessage(project.$id, 'assistant', 'Now generating your website...');

        const normalized = normalizeWebsiteProject(project);

        return NextResponse.json({
            success: true,
            projectId: normalized.id,
            libId: normalized.id,
            projectName: projectName,
            message: 'Project created successfully. Opening builder now...',
            generated: false,
            generationTimeout: false,
            project: normalized
        });

    } catch (error) {
        console.error('Error in create endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
