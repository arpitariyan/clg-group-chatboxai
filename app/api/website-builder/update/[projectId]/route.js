import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function POST(request, { params }) {
    try {
        const { projectId } = await params;
        const { code } = await request.json();

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        if (!code) {
            return NextResponse.json(
                { error: 'Code is required' },
                { status: 400 }
            );
        }

        // Get current project to verify it exists
        const { data: project, error: fetchError } = await supabase
            .from('website_projects')
            .select('id, project_name, current_version_id')
            .eq('id', projectId)
            .single();

        if (fetchError) {
            console.error('Error fetching project:', fetchError);
            return NextResponse.json(
                { error: 'Project not found', details: fetchError.message },
                { status: 404 }
            );
        }

        // Create a new version entry
        const { data: newVersion, error: versionError } = await supabase
            .from('website_versions')
            .insert({
                project_id: projectId,
                code: code,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (versionError) {
            console.error('Error creating version:', versionError);
            return NextResponse.json(
                { error: 'Failed to create version', details: versionError.message },
                { status: 500 }
            );
        }

        // Update the project with new code and version
        const { error: updateError } = await supabase
            .from('website_projects')
            .update({
                current_code: code,
                current_version_id: newVersion.id,
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

        return NextResponse.json({
            success: true,
            message: `"${project.project_name}" updated successfully!`,
            version_id: newVersion.id
        });

    } catch (error) {
        console.error('Error in update endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
