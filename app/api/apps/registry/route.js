export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAllApps, APP_CATEGORIES } from '@/lib/app-registry.js';
import { getUserConnections } from '@/lib/oauth-manager.js';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(req) {
  try {
    // Authenticate user
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

    // Get all apps from registry
    const apps = getAllApps().map(app => ({
      id: app.id,
      name: app.name,
      icon: app.icon,
      description: app.description,
      category: app.category,
      connectionType: app.connectionType,
      toolCount: app.tools.length,
      tools: app.tools.map(t => ({ id: t.id, name: t.name, description: t.description })),
    }));

    // Get user's connections (try userId first, then email)
    let connections = [];
    try {
      connections = await getUserConnections(userId);
      if (connections.length === 0 && userEmail) {
        connections = await getUserConnections(userEmail);
      }
    } catch {
      // Collection doesn't exist yet
    }

    // Build connection status map
    const connectionMap = {};
    for (const conn of connections) {
      connectionMap[conn.appId] = conn.status || 'active';
    }

    return NextResponse.json({
      apps,
      categories: APP_CATEGORIES,
      connections: connectionMap,
      totalApps: apps.length,
    });
  } catch (error) {
    console.error('[API /apps/registry] Error:', error);
    return NextResponse.json({ error: 'Failed to load app registry' }, { status: 500 });
  }
}
