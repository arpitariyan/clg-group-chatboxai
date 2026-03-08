import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  LIBRARY_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function DELETE(request) {
  try {
    const { id, type } = await request.json();

    if (!id || !type) {
      return NextResponse.json(
        { error: 'ID and type are required' },
        { status: 400 }
      );
    }

    if (type === 'search' || type === 'research') {
      // Find in Library by libId
      const res = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.equal('libId', id),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      }
      await databases.deleteDocument(DB_ID, LIBRARY_COLLECTION_ID, res.documents[0].$id);
    } else if (type === 'image') {
      // Find in ImageGeneration by libId
      const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
        Query.equal('libId', id),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      }
      await databases.deleteDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, res.documents[0].$id);
    } else {
      return NextResponse.json(
        { error: 'Invalid history type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'History entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting history:', error);
    return NextResponse.json(
      { error: 'Failed to delete history entry' },
      { status: 500 }
    );
  }
}
