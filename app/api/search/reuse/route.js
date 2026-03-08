import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { CHATS_COLLECTION_ID, LIBRARY_COLLECTION_ID } from '@/services/appwrite-collections';

function normalizePrompt(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSearchResult(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const query = body?.query || '';
    const mode = body?.mode === 'research' ? 'research' : 'search';
    const userEmail = (body?.userEmail || '').trim().toLowerCase();

    const normalizedQuery = normalizePrompt(query);
    if (!normalizedQuery) {
      return NextResponse.json({ success: true, hit: false, reason: 'empty_query' });
    }

    const libraryDocs = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('type', mode),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]);

    const libraries = libraryDocs.documents || [];
    if (libraries.length === 0) {
      return NextResponse.json({ success: true, hit: false, reason: 'no_libraries' });
    }

    const libIds = libraries.map((item) => item.libId).filter(Boolean);
    if (libIds.length === 0) {
      return NextResponse.json({ success: true, hit: false, reason: 'no_lib_ids' });
    }

    const chatsRes = await databases.listDocuments(DB_ID, CHATS_COLLECTION_ID, [
      Query.equal('libId', libIds),
      Query.equal('analysisType', 'text_only'),
      Query.orderDesc('$createdAt'),
      Query.limit(300),
    ]);

    const libById = new Map(libraries.map((lib) => [lib.libId, lib]));
    const candidates = (chatsRes.documents || [])
      .filter((chat) => {
        if (!chat?.userSearchInput || !chat?.aiResp) return false;
        return normalizePrompt(chat.userSearchInput) === normalizedQuery;
      })
      .map((chat) => {
        const sourceLibrary = libById.get(chat.libId);
        const sourceUserEmail = (sourceLibrary?.userEmail || '').toLowerCase();
        const isOwnResult = !!userEmail && sourceUserEmail === userEmail;

        return {
          chat,
          sourceLibrary,
          isOwnResult,
        };
      });

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, hit: false, reason: 'no_match' });
    }

    const ownMatchCount = candidates.filter((item) => item.isOwnResult).length;
    const ownMatch = candidates.find((item) => item.isOwnResult);
    const bestMatch = ownMatch || candidates[0];

    return NextResponse.json({
      success: true,
      hit: true,
      normalizedQuery,
      match: {
        sourceChatId: bestMatch.chat.$id,
        sourceLibId: bestMatch.chat.libId,
        userSearchInput: bestMatch.chat.userSearchInput,
        aiResp: bestMatch.chat.aiResp,
        searchResult: parseSearchResult(bestMatch.chat.searchResult),
        mode,
        isOwnResult: bestMatch.isOwnResult,
        repeatCountForUser: bestMatch.isOwnResult ? ownMatchCount : 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process reuse request',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
