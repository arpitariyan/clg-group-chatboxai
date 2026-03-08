import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID } from '@/services/appwrite-collections';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    if (search) {
      // Search by email or name among pro users
      const [emailRes, nameRes] = await Promise.all([
        databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
          Query.equal('plan', 'pro'),
          Query.search('email', search),
          Query.limit(200),
        ]),
        databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
          Query.equal('plan', 'pro'),
          Query.search('name', search),
          Query.limit(200),
        ]),
      ]);
      const seen = new Set();
      const merged = [];
      for (const doc of [...emailRes.documents, ...nameRes.documents]) {
        if (!seen.has(doc.$id)) {
          seen.add(doc.$id);
          merged.push(doc);
        }
      }
      merged.sort((a, b) =>
        new Date(b.subscription_start_date || 0) - new Date(a.subscription_start_date || 0)
      );
      return NextResponse.json({ users: merged });
    }

    const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('plan', 'pro'),
      Query.orderDesc('subscription_start_date'),
      Query.limit(200),
    ]);

    return NextResponse.json({
      users: res.documents,
    });
  } catch (error) {
    console.error('Error fetching pro users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pro users' },
      { status: 500 }
    );
  }
}
