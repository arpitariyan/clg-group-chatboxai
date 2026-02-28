import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { generateWebsite } from '@/lib/ai-client';
import { validateHTML } from '@/lib/website-builder-utils';

export async function POST(request) {
    try {
        const { projectId, enhancedPrompt } = await request.json();

        if (!projectId || !enhancedPrompt) {
            return NextResponse.json(
                { error: 'Project ID and enhanced prompt are required' },
                { status: 400 }
            );
        }

        // console.log(`Generating website for project ${projectId}...`);

        // Step 1: Generate website code
        const generatedCode = await generateWebsite(enhancedPrompt);

        // Step 2: Validate the generated code
        const validation = validateHTML(generatedCode);
        if (!validation.isValid) {
            console.error('Generated invalid HTML:', validation.errors);
            // Still save it, but log the errors
        }

        // Step 3: Create initial version
        const { data: version, error: versionError } = await supabase
            .from('website_versions')
            .insert([
                {
                    project_id: projectId,
                    code: generatedCode
                }
            ])
            .select()
            .single();

        if (versionError) {
            console.error('Error creating version:', versionError);
            return NextResponse.json(
                { error: 'Failed to save website version', details: versionError.message },
                { status: 500 }
            );
        }

        // Step 4: Update project with current code and version
        const { error: updateError } = await supabase
            .from('website_projects')
            .update({
                current_code: generatedCode,
                current_version_id: version.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId);

        if (updateError) {
            console.error('Error updating project:', updateError);
            return NextResponse.json(
                { error: 'Failed to update project', details: updateError.message },
                { status: 500 }
            );
        }

        // Step 5: Add AI response to conversation
        await supabase.from('website_conversations').insert([
            {
                project_id: projectId,
                role: 'assistant',
                content: 'I\'ve created your website! You can see it in the preview panel. Feel free to request any changes.',
                created_at: new Date().toISOString()
            }
        ]);

        // console.log(`Website generated successfully for project ${projectId}`);

        return NextResponse.json({
            success: true,
            versionId: version.id,
            message: 'Website generated successfully'
        });

    } catch (error) {
        console.error('Error in generate endpoint:', error);
        return NextResponse.json(
            { error: 'Failed to generate website', details: error.message },
            { status: 500 }
        );
    }
}
