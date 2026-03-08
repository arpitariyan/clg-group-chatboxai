import { NextResponse } from 'next/server';
import { databases, DB_ID, ID } from '@/services/appwrite-admin';
import { CHATS_COLLECTION_ID, LIBRARY_COLLECTION_ID } from '@/services/appwrite-collections';
import { Query } from 'node-appwrite';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const chat = await databases.getDocument(DB_ID, CHATS_COLLECTION_ID, chatId);
    return NextResponse.json({ success: true, chat: { ...chat, id: chat.$id } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch chat',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { chatData, userEmail } = body || {};

    if (!chatData?.libId) {
      return NextResponse.json({ error: 'chatData.libId is required' }, { status: 400 });
    }

    const existingLibrary = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('libId', chatData.libId),
      Query.limit(1),
    ]);

    if ((existingLibrary.documents || []).length === 0) {
      const fallbackLibraryData = {
        created_at: new Date().toISOString(),
        searchInput: chatData.userSearchInput || '',
        userEmail: userEmail || chatData.userEmail || 'anonymous',
        type: 'search',
        libId: chatData.libId,
        selectedModel: 'auto',
        modelName: 'Auto',
        hasFiles: false,
        analyzedFilesCount: 0,
      };

      try {
        await databases.createDocument(DB_ID, LIBRARY_COLLECTION_ID, chatData.libId, fallbackLibraryData);
      } catch (libraryCreateError) {
        console.warn('[api/search/chats] Library backfill warning:', libraryCreateError?.message || libraryCreateError);
      }
    }

    const created = await databases.createDocument(DB_ID, CHATS_COLLECTION_ID, ID.unique(), chatData);
    return NextResponse.json({ success: true, chat: { ...created, id: created.$id } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create chat',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { chatId, updateData } = body || {};

    if (!chatId || !updateData || typeof updateData !== 'object') {
      return NextResponse.json({ error: 'chatId and updateData are required' }, { status: 400 });
    }

    const updated = await databases.updateDocument(DB_ID, CHATS_COLLECTION_ID, chatId, updateData);
    return NextResponse.json({ success: true, chat: { ...updated, id: updated.$id } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update chat',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
