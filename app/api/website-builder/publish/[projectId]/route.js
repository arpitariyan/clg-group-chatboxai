import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request, { params }) {
    try {
        const { projectId } = await params;

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Get current project to check if it exists and get current publish status
        const { data: project, error: fetchError } = await supabase
            .from('website_projects')
            .select('id, is_published, project_name')
            .eq('id', projectId)
            .single();

        if (fetchError) {
            console.error('Error fetching project:', fetchError);
            return NextResponse.json(
                { error: 'Project not found', details: fetchError.message },
                { status: 404 }
            );
        }

        // Toggle the publish status
        const newPublishStatus = !project.is_published;

        const { error: updateError } = await supabase
            .from('website_projects')
            .update({
                is_published: newPublishStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId);

        if (updateError) {
            console.error('Error updating publish status:', updateError);
            return NextResponse.json(
                { error: 'Failed to update publish status', details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            is_published: newPublishStatus,
            message: newPublishStatus
                ? `"${project.project_name}" is now published and visible to everyone!`
                : `"${project.project_name}" has been unpublished.`
        });

    } catch (error) {
        console.error('Error in publish endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
