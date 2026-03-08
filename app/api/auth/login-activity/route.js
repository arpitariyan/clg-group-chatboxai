import { NextResponse } from 'next/server';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { LOGIN_ACTIVITY_COLLECTION_ID } from '@/services/appwrite-collections';

// Detect browser name from User-Agent string
function parseBrowser(ua = '') {
    if (!ua) return 'Unknown Browser';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown Browser';
}

// Detect platform/OS from User-Agent string
function parsePlatform(ua = '') {
    if (!ua) return 'Unknown';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown';
}

/**
 * POST /api/auth/login-activity
 * Body: { email, method, userAgent }
 * Records a login event for the user.
 */
export async function POST(request) {
    try {
        const { email, method, userAgent } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'email is required' }, { status: 400 });
        }

        // Get real UA from the request header as fallback
        const ua = userAgent || request.headers.get('user-agent') || '';

        const doc = {
            user_email: email.trim().toLowerCase(),
            login_at: new Date().toISOString(),
            browser: parseBrowser(ua),
            platform: parsePlatform(ua),
            method: method || 'unknown',
        };

        await databases.createDocument(DB_ID, LOGIN_ACTIVITY_COLLECTION_ID, ID.unique(), doc);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Login activity POST error:', error);
        // Non-critical — don't block the login flow if this fails
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/auth/login-activity?email=...
 * Returns the last 10 login events for a user, newest first.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = (searchParams.get('email') || '').trim().toLowerCase();

        if (!email) {
            return NextResponse.json({ error: 'email is required' }, { status: 400 });
        }

        const res = await databases.listDocuments(DB_ID, LOGIN_ACTIVITY_COLLECTION_ID, [
            Query.equal('user_email', email),
            Query.orderDesc('login_at'),
            Query.limit(10),
        ]);

        return NextResponse.json({ success: true, events: res.documents });
    } catch (error) {
        console.error('Login activity GET error:', error);
        return NextResponse.json({ success: false, error: error.message, events: [] }, { status: 500 });
    }
}
