import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request, { params }) {
    try {
        // Next.js 15: params is a Promise
        const { projectId } = await params;

        // Get project with all related data
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

        // Get all versions
        const { data: versions, error: versionsError } = await supabase
            .from('website_versions')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (versionsError) {
            console.error('Error fetching versions:', versionsError);
        }

        // Get conversation history
        const { data: conversations, error: convError } = await supabase
            .from('website_conversations')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (convError) {
            console.error('Error fetching conversations:', convError);
        }

        return NextResponse.json({
            success: true,
            project: {
                ...project,
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
