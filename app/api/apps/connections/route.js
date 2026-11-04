export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getUserConnections } from '@/lib/oauth-manager.js';
import { getAppById } from '@/lib/app-registry.js';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(req) {
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

    // Try fetching by userId first, then by email as fallback
    let connections = [];
    try {
      connections = await getUserConnections(userId);
      // If no results by userId, try by email
      if (connections.length === 0 && userEmail) {
        connections = await getUserConnections(userEmail);
      }
    } catch {
      return NextResponse.json({ connections: [] });
    }

    // Enrich with app metadata
    const enriched = (connections || []).map(conn => {
      const app = getAppById(conn.appId);
      return {
        ...conn,
        appName: app?.name || conn.appId,
        appIcon: app?.icon || '',
        appDescription: app?.description || '',
        category: app?.category || '',
        tools: app?.tools?.map(t => ({ id: t.id, name: t.name, description: t.description })) || [],
      };
    });

    return NextResponse.json({ connections: enriched });
  } catch (error) {
    console.error('[API /apps/connections] Error:', error);
    return NextResponse.json({ connections: [] });
  }
}
