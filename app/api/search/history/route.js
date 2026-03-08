import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { LIBRARY_COLLECTION_ID, CHATS_COLLECTION_ID } from '@/services/appwrite-collections';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const libId = searchParams.get('libId');

    if (!libId) {
      return NextResponse.json({ error: 'libId is required' }, { status: 400 });
    }

    const chatsRes = await databases.listDocuments(DB_ID, CHATS_COLLECTION_ID, [
      Query.equal('libId', libId),
      Query.orderAsc('$createdAt'),
      Query.limit(200),
    ]);

    const libRes = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('libId', libId),
      Query.limit(1),
    ]);

    const libraryDoc = libRes.documents[0] || null;
    const chats = chatsRes.documents.map((chat) => ({ ...chat, id: chat.$id }));

    const firstChat = chats[0] || null;
    const synthesizedRecord = {
      id: libId,
      libId,
      searchInput: firstChat?.userSearchInput || '',
      type: 'search',
      userEmail: 'anonymous',
      created_at: firstChat?.$createdAt || new Date().toISOString(),
      uploadedFiles: [],
      Chats: chats,
    };

    return NextResponse.json({
      success: true,
      record: libraryDoc
        ? {
            ...libraryDoc,
            id: libraryDoc.$id,
            Chats: chats,
          }
        : synthesizedRecord,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch search history',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
