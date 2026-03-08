import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID } from '@/services/appwrite-collections';

export async function POST(request) {
  try {
    const { email, duration } = await request.json();

    if (!email || !duration) {
      return NextResponse.json(
        { error: 'Email and duration are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(1),
    ]);

    if (res.documents.length === 0) {
      return NextResponse.json(
        { error: 'User not found with this email' },
        { status: 404 }
      );
    }

    const existingUser = res.documents[0];

    // Calculate dates
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(duration));

    // Update user to Pro plan
    const updated = await databases.updateDocument(
      DB_ID,
      USERS_COLLECTION_ID,
      existingUser.$id,
      {
        plan: 'pro',
        credits: 25000,
        subscription_start_date: now.toISOString(),
        subscription_end_date: endDate.toISOString(),
        is_manual_assignment: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Pro plan assigned successfully',
      user: updated,
    });
  } catch (error) {
    console.error('Error assigning plan:', error);
    return NextResponse.json(
      { error: 'Failed to assign plan' },
      { status: 500 }
    );
  }
}
