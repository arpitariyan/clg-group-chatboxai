import { NextResponse } from 'next/server';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import {
    USERS_COLLECTION_ID,
    WEBSITE_USER_CREDITS_COLLECTION_ID
} from '@/services/appwrite-collections';

async function getOrCreateUserCredits(userEmail, isPro) {
    const res = await databases.listDocuments(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, [
        Query.equal('user_email', userEmail), Query.limit(1)
    ]);

    if (res.documents.length === 0) {
        const doc = await databases.createDocument(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, ID.unique(), {
            user_email: userEmail,
            weekly_credits: isPro ? 100 : 10,
            purchased_credits: 0,
            week_start_date: new Date().toISOString().split('T')[0],
            is_pro: isPro
        });
        return doc;
    }

    const doc = res.documents[0];
    const weekStart = new Date(doc.week_start_date);
    const daysDiff = Math.floor((Date.now() - weekStart.getTime()) / 86400000);

    if (daysDiff >= 7) {
        return await databases.updateDocument(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, doc.$id, {
            weekly_credits: isPro ? 100 : 10,
            week_start_date: new Date().toISOString().split('T')[0],
            is_pro: isPro
        });
    }

    return doc;
}

/**
 * GET /api/website-builder/credits
 * Fetches the current user's website builder credit balance
 */
export async function GET(request) {
    try {
        const url = new URL(request.url);
        const userEmail = url.searchParams.get('email');

        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 400 }
            );
        }

        // Get user's plan status
        const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
            Query.equal('email', userEmail), Query.limit(1)
        ]);

        if (userRes.documents.length === 0) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const userData = userRes.documents[0];
        const isPro = userData.plan === 'pro';

        const creditData = await getOrCreateUserCredits(userEmail, isPro);

        return NextResponse.json({
            success: true,
            credits: {
                weekly: creditData.weekly_credits,
                purchased: creditData.purchased_credits,
                total: (creditData.weekly_credits || 0) + (creditData.purchased_credits || 0),
                weekStartDate: creditData.week_start_date,
                isPro: creditData.is_pro
            }
        });

    } catch (error) {
        console.error('Error in credits GET endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
