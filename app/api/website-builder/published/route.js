import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const date = searchParams.get('date') || '';

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('website_projects')
            .select('id, project_name, user_email, current_code, created_at, updated_at', { count: 'exact' })
            .eq('is_published', true)
            .order('updated_at', { ascending: false });

        // Add search filter if provided
        if (search) {
            query = query.ilike('project_name', `%${search}%`);
        }

        // Add date filter if provided
        if (date) {
            // Filter by date (matches the entire day)
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            query = query
                .gte('updated_at', startOfDay.toISOString())
                .lte('updated_at', endOfDay.toISOString());
        }

        const { data: projects, error: projectsError, count } = await query
            .range(from, to);

        if (projectsError) {
            const isTimeout = projectsError.code === 'TIMEOUT' ||
                projectsError.message?.includes('timeout') ||
                projectsError.message?.includes('fetch failed');

            if (isTimeout) {
                // Supabase unreachable — return empty list gracefully instead of 500
                console.warn('[published] Supabase unreachable, returning empty projects');
                return NextResponse.json({
                    success: true,
                    projects: [],
                    pagination: { page, limit, total: 0, totalPages: 0 },
                    dbUnavailable: true
                });
            }

            console.error('Error fetching published projects:', projectsError);
            return NextResponse.json(
                { error: 'Failed to fetch published projects', details: projectsError.message },
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
        console.error('Error in published endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
