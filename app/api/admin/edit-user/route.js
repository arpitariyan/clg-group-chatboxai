import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID } from '@/services/appwrite-collections';

export async function PUT(request) {
  try {
    const { email, updates } = await request.json();

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

    // Prepare update object
    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.plan !== undefined) updateData.plan = updates.plan;
    if (updates.credits !== undefined) updateData.credits = updates.credits;

    const updated = await databases.updateDocument(
      DB_ID,
      USERS_COLLECTION_ID,
      user.$id,
      updateData
    );

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updated,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
