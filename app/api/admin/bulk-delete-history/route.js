import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  LIBRARY_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function DELETE(request) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Group items by type for efficient deletion
    const libraryIds = [];
    const imageIds = [];

    items.forEach(item => {
      if (item.type === 'search' || item.type === 'research') {
        libraryIds.push(item.id);
      } else if (item.type === 'image') {
        imageIds.push(item.id);
      }
    });

    let deletedCount = 0;
    const errors = [];

    // Delete from Library table by libId
    if (libraryIds.length > 0) {
      try {
        const res = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
          Query.equal('libId', libraryIds),
          Query.limit(libraryIds.length + 10),
        ]);
        await Promise.all(
          res.documents.map(doc =>
            databases.deleteDocument(DB_ID, LIBRARY_COLLECTION_ID, doc.$id)
          )
        );
        deletedCount += res.documents.length;
      } catch (err) {
        errors.push(`Library deletion error: ${err.message}`);
      }
    }

    // Delete from ImageGeneration table by libId
    if (imageIds.length > 0) {
      try {
        const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
          Query.equal('libId', imageIds),
          Query.limit(imageIds.length + 10),
        ]);
        await Promise.all(
          res.documents.map(doc =>
            databases.deleteDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, doc.$id)
          )
        );
        deletedCount += res.documents.length;
      } catch (err) {
        errors.push(`Image deletion error: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Some deletions failed',
          details: errors,
          deletedCount,
        },
        { status: 207 } // Multi-Status
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} entries`,
      deletedCount,
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json(
      { error: 'Failed to delete entries', details: error.message },
      { status: 500 }
    );
  }
}
