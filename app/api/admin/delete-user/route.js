import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  LIBRARY_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  CHATS_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function DELETE(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Helper to delete all docs matching a field value in a collection
    const deleteByField = async (collectionId, field, value) => {
      let offset = 0;
      while (true) {
        const res = await databases.listDocuments(DB_ID, collectionId, [
          Query.equal(field, value),
          Query.limit(100),
          Query.offset(offset),
        ]);
        if (res.documents.length === 0) break;
        await Promise.all(
          res.documents.map(doc =>
            databases.deleteDocument(DB_ID, collectionId, doc.$id)
          )
        );
        if (res.documents.length < 100) break;
        offset += 100;
      }
    };

    // Delete user's data from all related tables
    await deleteByField(LIBRARY_COLLECTION_ID, 'userEmail', email);
    await deleteByField(IMAGE_GENERATION_COLLECTION_ID, 'userEmail', email);
    await deleteByField(CHATS_COLLECTION_ID, 'userEmail', email);

    // Finally delete the user
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(1),
    ]);
    if (userRes.documents.length > 0) {
      await databases.deleteDocument(DB_ID, USERS_COLLECTION_ID, userRes.documents[0].$id);
    }

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
