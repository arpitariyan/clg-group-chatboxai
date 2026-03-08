import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { WEBSITE_PROJECTS_COLLECTION_ID } from '@/services/appwrite-collections';
import { normalizeDoc } from '@/lib/website-builder-server-utils';

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

        const offset = (page - 1) * limit;

        const res = await databases.listDocuments(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, [
            Query.equal('user_email', userEmail),
            Query.orderDesc('$updatedAt'),
            Query.limit(limit),
            Query.offset(offset)
        ]);

        return NextResponse.json({
            success: true,
            projects: (res.documents || []).map(normalizeDoc),
            pagination: {
                page,
                limit,
                total: res.total || 0,
                totalPages: Math.ceil((res.total || 0) / limit)
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
