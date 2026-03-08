import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { normalizeDoc, normalizeWebsiteProject } from '@/lib/website-builder-server-utils';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const date = searchParams.get('date') || '';

        const offset = (page - 1) * limit;

        const filters = [
            Query.equal('is_published', true),
            Query.orderDesc('$updatedAt'),
            Query.limit(limit),
            Query.offset(offset)
        ];

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            filters.push(Query.greaterThanEqual('$updatedAt', startOfDay.toISOString()));
            filters.push(Query.lessThanEqual('$updatedAt', endOfDay.toISOString()));
        }

        let res;
        try {
            if (search) {
                filters.push(Query.search('project_name', search));
            }
            res = await databases.listDocuments(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, filters);
        } catch (projectsError) {
            const retryWithName = Boolean(search);

            if (retryWithName) {
                try {
                    const fallbackFilters = [
                        Query.equal('is_published', true),
                        Query.orderDesc('$updatedAt'),
                        Query.limit(limit),
                        Query.offset(offset),
                        Query.search('name', search)
                    ];
                    res = await databases.listDocuments(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, fallbackFilters);
                    return NextResponse.json({
                        success: true,
                        projects: (res.documents || []).map((doc) => normalizeWebsiteProject(normalizeDoc(doc))),
                        pagination: {
                            page,
                            limit,
                            total: res.total || 0,
                            totalPages: Math.ceil((res.total || 0) / limit)
                        }
                    });
                } catch {
                    // Continue with existing error handling.
                }
            }

            const isTimeout = projectsError.message?.includes('timeout') ||
                projectsError.message?.includes('fetch failed');

            if (isTimeout) {
                console.warn('[published] Appwrite unreachable, returning empty projects');
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
            projects: (res.documents || []).map((doc) => normalizeWebsiteProject(normalizeDoc(doc))),
            pagination: {
                page,
                limit,
                total: res.total || 0,
                totalPages: Math.ceil((res.total || 0) / limit)
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
