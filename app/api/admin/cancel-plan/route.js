import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID } from '@/services/appwrite-collections';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(1),
    ]);

    if (res.documents.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = res.documents[0];

    // Update user to free plan
    const updated = await databases.updateDocument(
      DB_ID,
      USERS_COLLECTION_ID,
      user.$id,
      {
        plan: 'free',
        credits: 5000,
        subscription_start_date: null,
        subscription_end_date: null,
        is_manual_assignment: false,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Pro plan cancelled successfully',
      user: updated,
    });
  } catch (error) {
    console.error('Error cancelling plan:', error);
    return NextResponse.json(
      { error: 'Failed to cancel plan' },
      { status: 500 }
    );
  }
}
