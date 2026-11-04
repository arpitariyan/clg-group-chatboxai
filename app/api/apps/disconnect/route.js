export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revokeConnection } from '@/lib/oauth-manager.js';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId, userEmail;
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
      userEmail = decoded.email;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { appId } = await req.json();
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }

    // Try disconnect by userId first, then by email
    let result = await revokeConnection(userId, appId);
    if (result.message === 'No connection found' && userEmail) {
      result = await revokeConnection(userEmail, appId);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /apps/disconnect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect app' },
      { status: 500 }
    );
  }
}
