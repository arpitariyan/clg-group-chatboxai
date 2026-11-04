import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID } from '@/services/appwrite-collections';

export const dynamic = 'force-dynamic'; // Prevent Next.js from statically caching this route

export async function GET(request) {
  try {
    const startTime = Date.now();
    
    // Perform a lightweight query to Appwrite Database 
    // This action ensures the Appwrite cloud free tier project stays "awake" and doesn't pause.
    await databases.listDocuments(
      DB_ID,
      USERS_COLLECTION_ID,
      [Query.limit(1)]
    );
    
    const dbPingMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'ok',
      message: 'System is healthy and database is active',
      timestamp: new Date().toISOString(),
      metrics: {
        database_ping_ms: dbPingMs
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[Health Check Error]:', error);
    
    // If the database is paused or unreachable, it returns a 503
    // This will trigger an alert in UptimeRobot if it happens
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 503 });
  }
}
