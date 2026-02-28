import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { enhancePrompt, generateWebsite } from '@/lib/ai-client';
import { generateProjectName } from '@/lib/website-builder-utils';

export async function POST(request) {
    try {
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
            const { data: deductResult, error: deductError } = await supabase
                .rpc('deduct_website_credits', {
                    p_user_email: userEmail,
                    p_amount: 1,
                    p_description: 'Create new website project'
                });

            if (deductError) {
                throw new Error(deductError.message);
            }

            const result = deductResult[0];
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
                    { status: 402 } // Payment Required status code
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

        // Step 1: Enhance the prompt
        // console.log('Enhancing prompt...');
        const enhancedPrompt = await enhancePrompt(prompt);
        // console.log('Enhanced prompt:', enhancedPrompt);

        // Step 2: Create project record
        const { data: project, error: projectError } = await supabase
            .from('website_projects')
            .insert([
                {
                    user_email: userEmail,
                    project_name: projectName,
                    original_prompt: prompt,
                    enhanced_prompt: enhancedPrompt,
                    current_code: null, // Will be generated next
                    is_published: false
                }
            ])
            .select()
            .single();

        if (projectError) {
            console.error('Error creating project:', projectError);
            return NextResponse.json(
                { error: 'Failed to create project', details: projectError.message },
                { status: 500 }
            );
        }

        // Step 3: Add conversation messages
        // User's original prompt
        await supabase.from('website_conversations').insert([
            {
                project_id: project.id,
                role: 'user',
                content: prompt,
                created_at: new Date().toISOString()
            }
        ]);

        // Assistant's enhancement confirmation
        await supabase.from('website_conversations').insert([
            {
                project_id: project.id,
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                created_at: new Date().toISOString()
            }
        ]);

        // Assistant's generation start message
        await supabase.from('website_conversations').insert([
            {
                project_id: project.id,
                role: 'assistant',
                content: 'Now generating your website...',
                created_at: new Date().toISOString()
            }
        ]);

        // Step 4: Start website generation in background
        // Don't wait for this to complete - let it run asynchronously
        // User will see LoaderSteps and poll for updates
        (async () => {
            try {
                // console.log(`[Background] Starting generation for project ${project.id}`);

                // Import and call generation function directly (no fetch timeout)
                const { generateWebsite } = await import('@/lib/ai-client');
                const { validateHTML } = await import('@/lib/website-builder-utils');

                // Generate the code
                const generatedCode = await generateWebsite(enhancedPrompt);
                // console.log(`[Background] Code generated for project ${project.id}`);

                // Validate
                const validation = validateHTML(generatedCode);
                if (!validation.isValid) {
                    console.warn('[Background] Generated code has validation warnings:', validation.errors);
                }

                // Create version
                const { data: version, error: versionError } = await supabase
                    .from('website_versions')
                    .insert([{ project_id: project.id, code: generatedCode }])
                    .select()
                    .single();

                if (versionError) {
                    console.error('[Background] Error creating version:', versionError);
                    return;
                }

                // Update project
                const { error: updateError } = await supabase
                    .from('website_projects')
                    .update({
                        current_code: generatedCode,
                        current_version_id: version.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', project.id);

                if (updateError) {
                    console.error('[Background] Error updating project:', updateError);
                    return;
                }

                // Add success message to conversation
                await supabase.from('website_conversations').insert([{
                    project_id: project.id,
                    role: 'assistant',
                    content: "I've created your website! You can see it in the preview panel. Feel free to request any changes.",
                    created_at: new Date().toISOString()
                }]);

                // console.log(`✅ [Background] Website generated successfully for project ${project.id}`);

            } catch (error) {
                console.error('❌ [Background] Generation error:', error.message);

                // Add error message to conversation
                try {
                    await supabase.from('website_conversations').insert([{
                        project_id: project.id,
                        role: 'assistant',
                        content: `Sorry, I encountered an error generating your website: ${error.message}. Please try again.`,
                        created_at: new Date().toISOString()
                    }]);
                } catch (convError) {
                    console.error('[Background] Failed to save error message:', convError);
                }
            }
        })();

        return NextResponse.json({
            success: true,
            projectId: project.id,
            projectName: projectName,
            message: 'Project created successfully. Website generation started.'
        });

    } catch (error) {
        console.error('Error in create endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
