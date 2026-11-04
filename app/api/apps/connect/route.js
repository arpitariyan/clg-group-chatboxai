export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initiateOAuth } from '@/lib/oauth-manager.js';
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

    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction ? 'https://chatboxai.co.in' : 'http://localhost:3000';

    const result = await initiateOAuth(appId, userId, userEmail, baseUrl);

    // MCP connections are instant (no OAuth redirect needed)
    if (result.mcpConnected) {
      return NextResponse.json({ mcpConnected: true, appId: result.appId });
    }

    // OAuth connections return an auth URL to redirect to
    return NextResponse.json({ authUrl: result.authUrl });
  } catch (error) {
    console.error('[API /apps/connect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}
