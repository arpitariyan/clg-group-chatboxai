import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID } from '@/services/appwrite-collections';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || 'all';

    const offset = (page - 1) * limit;

    // Build query filters
    const filters = [];

    if (search) {
      // Search by email or name using separate queries, merge results
      const [emailRes, nameRes] = await Promise.all([
        databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
          Query.search('email', search),
          Query.limit(200),
        ]),
        databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
          Query.search('name', search),
          Query.limit(200),
        ]),
      ]);
      const seen = new Set();
      const merged = [];
      for (const doc of [...emailRes.documents, ...nameRes.documents]) {
        if (!seen.has(doc.$id)) {
          seen.add(doc.$id);
          if (plan === 'all' || doc.plan === plan) merged.push(doc);
        }
      }
      merged.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
      const total = merged.length;
      const users = merged.slice(offset, offset + limit);
      return NextResponse.json({ users, total, page, limit });
    }

    if (plan !== 'all') {
      filters.push(Query.equal('plan', plan));
    }
    filters.push(Query.orderDesc('$createdAt'));
    filters.push(Query.limit(limit));
    filters.push(Query.offset(offset));

    const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, filters);

    // Get total count (separate query without pagination)
    const countFilters = [];
    if (plan !== 'all') countFilters.push(Query.equal('plan', plan));
    countFilters.push(Query.limit(1));
    const countRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, countFilters);

    return NextResponse.json({
      users: res.documents,
      total: countRes.total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
