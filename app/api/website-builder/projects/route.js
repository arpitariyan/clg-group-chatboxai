import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userEmail = searchParams.get('userEmail');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 401 }
            );
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Get user's projects
        const { data: projects, error: projectsError, count } = await supabase
            .from('website_projects')
            .select('*', { count: 'exact' })
            .eq('user_email', userEmail)
            .order('updated_at', { ascending: false })
            .range(from, to);

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return NextResponse.json(
                { error: 'Failed to fetch projects', details: projectsError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            projects: projects || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error in projects endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
