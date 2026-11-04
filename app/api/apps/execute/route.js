export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { execute } from '@/lib/tool-executor.js';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId;
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { appId, toolId, parameters, confirmed } = await req.json();

    if (!appId || !toolId) {
      return NextResponse.json(
        { error: 'appId and toolId are required' },
        { status: 400 }
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction ? 'https://chatboxai.co.in' : 'http://localhost:3000';

    const result = await execute(userId, appId, toolId, parameters || {}, { confirmed: !!confirmed, baseUrl });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /apps/execute] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}
