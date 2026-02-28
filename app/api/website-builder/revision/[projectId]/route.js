import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { generateRevision, enhancePrompt } from '@/lib/ai-client';
import { formatConversation } from '@/lib/website-builder-utils';

export async function POST(request, { params }) {
    try {
        // Next.js 15: params is a Promise
        const { projectId } = await params;
        const { message } = await request.json();

        if (!message || !message.trim()) {
            return NextResponse.json(
                { error: 'Revision message is required' },
                { status: 400 }
            );
        }

        // Step 1: Get current project
        const { data: project, error: projectError } = await supabase
            .from('website_projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json(
                { error: 'Project not found', details: projectError?.message },
                { status: 404 }
            );
        }

        if (!project.current_code) {
            return NextResponse.json(
                { error: 'No current code to revise. Please wait for initial generation.' },
                { status: 400 }
            );
        }

        // Check and deduct credits before generating revision
        try {
            const { data: deductResult, error: deductError } = await supabase
                .rpc('deduct_website_credits', {
                    p_user_email: project.user_email,
                    p_amount: 1,
                    p_description: 'Website revision request'
                });

            if (deductError) {
                throw new Error(deductError.message);
            }

            const result = deductResult[0];
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

        // Step 2: Get conversation history
        const { data: conversations, error: convError } = await supabase
            .from('website_conversations')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (convError) {
            console.error('Error fetching conversations:', convError);
        }

        const formattedHistory = formatConversation(conversations || []);

        // Step 3: Add user message to conversation
        await supabase.from('website_conversations').insert([
            {
                project_id: projectId,
                role: 'user',
                content: message,
                created_at: new Date().toISOString()
            }
        ]);

        // Step 4: Enhance the revision request
        // console.log('Enhancing revision request...');
        const enhancedRequest = await enhancePrompt(message);

        // Step 5: Add assistant message about enhancement
        await supabase.from('website_conversations').insert([
            {
                project_id: projectId,
                role: 'assistant',
                content: `I've enhanced your request to: "${enhancedRequest}"`,
                created_at: new Date().toISOString()
            }
        ]);

        // Step 6: Add assistant message about starting changes
        await supabase.from('website_conversations').insert([
            {
                project_id: projectId,
                role: 'assistant',
                content: 'Now making changes to your website...',
                created_at: new Date().toISOString()
            }
        ]);

        // Step 7: Generate revision
        // console.log(`Generating revision for project ${projectId}...`);
        const revisedCode = await generateRevision(
            project.current_code,
            enhancedRequest,
            formattedHistory
        );

        // Step 5: Create new version
        const { data: version, error: versionError } = await supabase
            .from('website_versions')
            .insert([
                {
                    project_id: projectId,
                    code: revisedCode
                }
            ])
            .select()
            .single();

        if (versionError) {
            console.error('Error creating version:', versionError);
            return NextResponse.json(
                { error: 'Failed to save revision', details: versionError.message },
                { status: 500 }
            );
        }

        // Step 6: Update project
        const { error: updateError } = await supabase
            .from('website_projects')
            .update({
                current_code: revisedCode,
                current_version_id: version.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId);

        if (updateError) {
            console.error('Error updating project:', updateError);
        }

        // Step 8: Add AI success message to conversation
        await supabase.from('website_conversations').insert([
            {
                project_id: projectId,
                role: 'assistant',
                content: "I've made the changes to your website! You can now preview it",
                created_at: new Date().toISOString()
            }
        ]);

        // console.log(`Revision completed for project ${projectId}`);

        return NextResponse.json({
            success: true,
            versionId: version.id,
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
