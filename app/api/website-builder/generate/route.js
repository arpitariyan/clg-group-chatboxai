import { NextResponse } from 'next/server';
import { databases, DB_ID } from '@/services/appwrite-admin';
import { WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { enhancePrompt, generateWebsite } from '@/lib/ai-client';
import { validateHTML } from '@/lib/website-builder-utils';
import {
    createWebsiteConversationMessage,
    createWebsiteVersionDocument,
    ensureProjectOwnership,
    normalizeWebsiteProject,
    updateWebsiteProjectCode
} from '@/lib/website-builder-server-utils';

const REQUIRED_WEBSITE_BUILDER_ENV = [
    'OPENROUTER_API_KEY',
    'APPWRITE_DATABASE_ID',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'APPWRITE_WEBSITE_PROJECTS_COLLECTION_ID',
    'APPWRITE_WEBSITE_VERSIONS_COLLECTION_ID',
    'APPWRITE_WEBSITE_CONVERSATIONS_COLLECTION_ID'
];

function getMissingWebsiteBuilderEnv() {
    return REQUIRED_WEBSITE_BUILDER_ENV.filter((key) => {
        const value = process.env[key];
        return !value || !String(value).trim();
    });
}

async function persistEnhancedPrompt(projectId, enhancedPrompt) {
    if (!enhancedPrompt) return;

    try {
        await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, {
            enhanced_prompt: enhancedPrompt
        });
        return;
    } catch {
        // Fallback schema compatibility.
    }

    try {
        await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, {
            description: enhancedPrompt
        });
    } catch {
        // Ignore if neither schema supports storing enhanced prompt.
    }
}

export async function POST(request) {
    let requestBody = null;
    try {
        const missingEnv = getMissingWebsiteBuilderEnv();
        if (missingEnv.length > 0) {
            return NextResponse.json(
                {
                    error: 'Website generation is not configured on the server',
                    details: `Missing environment variables: ${missingEnv.join(', ')}`,
                    missingEnv
                },
                { status: 500 }
            );
        }

        requestBody = await request.json();
        const { projectId, enhancedPrompt, originalPrompt, userEmail } = requestBody;

        if (!projectId || !userEmail) {
            return NextResponse.json(
                { error: 'Project ID and user email are required' },
                { status: 400 }
            );
        }

        const project = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
        if (!ensureProjectOwnership(project, userEmail)) {
            return NextResponse.json(
                { error: 'You are not allowed to generate this project' },
                { status: 403 }
            );
        }

        const normalizedProject = normalizeWebsiteProject(project);
        if (normalizedProject.current_code) {
            return NextResponse.json({
                success: true,
                message: 'Website already generated',
                generatedAlready: true,
                versionId: normalizedProject.current_version_id || null
            });
        }

        // console.log(`Generating website for project ${projectId}...`);

        const rawPrompt = (originalPrompt || normalizedProject.original_prompt || '').trim();
        let promptToUse = (enhancedPrompt || normalizedProject.enhanced_prompt || '').trim();

        // Analyze/enhance prompt before generation when we only have the raw input.
        if (!promptToUse || (rawPrompt && promptToUse === rawPrompt)) {
            if (!rawPrompt) {
                return NextResponse.json(
                    { error: 'Missing prompt data for generation' },
                    { status: 400 }
                );
            }

            const improvedPrompt = await enhancePrompt(rawPrompt);
            promptToUse = improvedPrompt;

            await persistEnhancedPrompt(projectId, improvedPrompt);
            await createWebsiteConversationMessage(
                projectId,
                'assistant',
                `I've enhanced your prompt to: "${improvedPrompt}"`
            );
        }

        // Step 1: Generate website code
        const generatedCode = await generateWebsite(promptToUse);

        // Step 2: Validate the generated code
        const validation = validateHTML(generatedCode);
        if (!validation.isValid) {
            console.error('Generated invalid HTML:', validation.errors);
            // Still save it, but log the errors
        }

        // Step 3: Create initial version
        const version = await createWebsiteVersionDocument({
            projectId,
            code: generatedCode
        });

        // Step 4: Update project with current code and version
        await updateWebsiteProjectCode(projectId, generatedCode, version.$id);

        // Step 5: Add AI response to conversation
        await createWebsiteConversationMessage(
            projectId,
            'assistant',
            'I\'ve created your website! You can see it in the preview panel. Feel free to request any changes.'
        );

        // console.log(`Website generated successfully for project ${projectId}`);

        return NextResponse.json({
            success: true,
            versionId: version.$id,
            message: 'Website generated successfully'
        });

    } catch (error) {
        console.error('Error in generate endpoint:', error);

        try {
            if (requestBody?.projectId) {
                await createWebsiteConversationMessage(
                    requestBody.projectId,
                    'assistant',
                    `Sorry, I encountered an error generating your website: ${error.message}`
                );
            }
        } catch {
            // Ignore secondary failure while logging generation error.
        }

        return NextResponse.json(
            { error: 'Failed to generate website', details: error.message },
            { status: 500 }
        );
    }
}
