import { NextResponse } from 'next/server';
import { databases, DB_ID, BUCKET_ID, Query } from '@/services/appwrite-admin';
import { IMAGE_GENERATION_COLLECTION_ID } from '@/services/appwrite-collections';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

/**
 * Proxies generated image bytes through the backend so normal users can always view images,
 * even when bucket-level ACL/public access differs across environments.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get('fileId');
        const userEmail = searchParams.get('userEmail');
        const libId = searchParams.get('libId');

        if (!fileId) {
            return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
        }

        if (!userEmail) {
            return NextResponse.json({ error: 'userEmail is required' }, { status: 400 });
        }

        const ownershipQueries = [
            Query.equal('generatedImagePath', fileId),
            Query.equal('userEmail', userEmail),
            Query.limit(1),
        ];

        if (libId) {
            ownershipQueries.unshift(Query.equal('libId', libId));
        }

        const ownershipRes = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, ownershipQueries);
        if (!ownershipRes.documents?.length) {
            return NextResponse.json({ error: 'Image not found for this user' }, { status: 404 });
        }

        const fileResponse = await fetch(`${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': APPWRITE_PROJECT_ID,
                'X-Appwrite-Key': APPWRITE_API_KEY,
            },
        });

        if (!fileResponse.ok) {
            const text = await fileResponse.text().catch(() => '');
            return NextResponse.json({ error: 'Failed to fetch image from storage', details: text || fileResponse.statusText }, { status: fileResponse.status });
        }

        const contentType = fileResponse.headers.get('content-type') || 'image/png';
        const cacheControl = fileResponse.headers.get('cache-control') || 'private, max-age=300';
        const imageBuffer = await fileResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to proxy generated image',
                details: error?.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
