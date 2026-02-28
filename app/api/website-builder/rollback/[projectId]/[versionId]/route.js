import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request, { params }) {
    try {
        // Next.js 15: params is a Promise
        const { projectId, versionId } = await params;

        // Get the version
        const { data: version, error: versionError } = await supabase
            .from('website_versions')
            .select('*')
            .eq('id', versionId)
            .eq('project_id', projectId)
            .single();

        if (versionError || !version) {
            return NextResponse.json(
                { error: 'Version not found', details: versionError?.message },
                { status: 404 }
            );
        }

        // Update project to use this version
        const { error: updateError } = await supabase
            .from('website_projects')
            .update({
                current_code: version.code,
                current_version_id: versionId,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId);

        if (updateError) {
            console.error('Error rolling back:', updateError);
            return NextResponse.json(
                { error: 'Failed to rollback', details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully rolled back to previous version'
        });

    } catch (error) {
        console.error('Error in rollback endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
