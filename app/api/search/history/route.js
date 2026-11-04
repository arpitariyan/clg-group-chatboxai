import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { LIBRARY_COLLECTION_ID, CHATS_COLLECTION_ID } from '@/services/appwrite-collections';
import { AuthError, authErrorResponse, normalizeEmail, resolveRequestUserEmail } from '@/lib/server-auth';
import { decryptIncognitoData } from '@/lib/crypto-utils';

export async function GET(request) {
  try {
    let authenticatedEmail = null;
    try {
      authenticatedEmail = await resolveRequestUserEmail(request);
    } catch {
      authenticatedEmail = null;
    }
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
    const isIncognito = libraryDoc?.userEmail === 'incognito_session';
    const isAnonymous = !libraryDoc?.userEmail || libraryDoc?.userEmail === 'anonymous';

    if (libraryDoc && !isIncognito && !isAnonymous && authenticatedEmail && normalizeEmail(libraryDoc.userEmail) !== authenticatedEmail) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    if (isIncognito && libraryDoc) {
      libraryDoc.searchInput = decryptIncognitoData(libraryDoc.searchInput);
    }

    const chats = chatsRes.documents.map((chat) => {
      const processedChat = { ...chat, id: chat.$id };
      if (isIncognito) {
        processedChat.userSearchInput = decryptIncognitoData(processedChat.userSearchInput);
        processedChat.aiResp = decryptIncognitoData(processedChat.aiResp);
        processedChat.searchResult = decryptIncognitoData(processedChat.searchResult);
      }
      return processedChat;
    });

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
    if (error?.name === 'AuthError' || error instanceof AuthError) {
      return authErrorResponse(error, 'Authentication is required to fetch search history.');
    }
    console.error('[Search History API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch search history',
        details: error?.stack || error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
