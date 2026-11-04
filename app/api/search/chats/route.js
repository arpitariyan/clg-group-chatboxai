import { NextResponse } from 'next/server';
import { databases, DB_ID, ID } from '@/services/appwrite-admin';
import { CHATS_COLLECTION_ID, LIBRARY_COLLECTION_ID } from '@/services/appwrite-collections';
import { Query } from 'node-appwrite';
import { AuthError, authErrorResponse, normalizeEmail, resolveRequestUserEmail } from '@/lib/server-auth';
import { encryptIncognitoData, decryptIncognitoData } from '@/lib/crypto-utils';

const APPWRITE_TEXT_MAX = 1000000;
const SAFE_TEXT_MAX = 950000;
const TRUNCATED_SUFFIX = '\n\n[Truncated: payload too large]';

function toSafeString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function trimToMaxChars(value, max = SAFE_TEXT_MAX) {
  const asString = toSafeString(value, '');
  if (asString.length <= max) return asString;
  return `${asString.slice(0, Math.max(0, max - TRUNCATED_SUFFIX.length))}${TRUNCATED_SUFFIX}`;
}

function sanitizeChatPayload(raw = {}) {
  const payload = { ...(raw || {}) };

  // Only allow known Appwrite collection fields — strip anything else
  const ALLOWED_FIELDS = [
    'libId', 'userSearchInput', 'searchResult', 'aiResp', 'analysisType',
    'processedFiles', 'analyzedFilesCount', 'liked', 'disliked',
    'usedModel', 'modelApi', 'created_at', 'isThinkingMode',
  ];

  // Remove any fields not in the allowed list
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_FIELDS.includes(key)) {
      delete payload[key];
    }
  }

  // Appwrite schema expects these as strings.
  payload.userSearchInput = trimToMaxChars(payload.userSearchInput || '', SAFE_TEXT_MAX);
  payload.analysisType = trimToMaxChars(payload.analysisType || 'text_only', 200);

  payload.searchResult = trimToMaxChars(payload.searchResult ?? '', SAFE_TEXT_MAX);

  if (Object.prototype.hasOwnProperty.call(payload, 'processedFiles')) {
    payload.processedFiles = trimToMaxChars(payload.processedFiles, SAFE_TEXT_MAX);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'aiResp') && payload.aiResp !== undefined) {
    payload.aiResp = trimToMaxChars(payload.aiResp, SAFE_TEXT_MAX);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isThinkingMode')) {
    payload.isThinkingMode = payload.isThinkingMode === true || payload.isThinkingMode === 'true';
  }

  if (payload.analyzedFilesCount !== undefined && payload.analyzedFilesCount !== null) {
    const parsed = Number(payload.analyzedFilesCount);
    payload.analyzedFilesCount = Number.isFinite(parsed) ? parsed : 0;
  }

  // Keep booleans compatible for legacy schema variants.
  if (Object.prototype.hasOwnProperty.call(payload, 'liked')) {
    payload.liked = String(payload.liked) === 'true' ? 'true' : 'false';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'disliked')) {
    payload.disliked = String(payload.disliked) === 'true' ? 'true' : 'false';
  }

  return payload;
}

export async function GET(request) {
  try {
    const authenticatedEmail = await resolveRequestUserEmail(request);
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const chat = await databases.getDocument(DB_ID, CHATS_COLLECTION_ID, chatId);
    const linkedLibraries = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('libId', chat.libId),
      Query.limit(1),
    ]);
    const linkedLibrary = linkedLibraries.documents?.[0] || null;
    const isIncognito = linkedLibrary && linkedLibrary.userEmail === 'incognito_session';

    if (!linkedLibrary || (!isIncognito && normalizeEmail(linkedLibrary.userEmail) !== authenticatedEmail)) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    if (isIncognito) {
      chat.userSearchInput = decryptIncognitoData(chat.userSearchInput);
      chat.aiResp = decryptIncognitoData(chat.aiResp);
      chat.searchResult = decryptIncognitoData(chat.searchResult);
    }

    return NextResponse.json({ success: true, chat: { ...chat, id: chat.$id } });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'Authentication is required to access chats.');
    }
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
    const authenticatedEmail = await resolveRequestUserEmail(request);
    const body = await request.json();
    const { chatData, userEmail } = body || {};

    // console.log('CHAT DATA RECEIVED:', JSON.stringify(chatData, null, 2));

    if (!chatData?.libId) {
      return NextResponse.json({ error: 'chatData.libId is required' }, { status: 400 });
    }

    const existingLibrary = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('libId', chatData.libId),
      Query.limit(1),
    ]);

    const existingLibraryDoc = (existingLibrary.documents || [])[0] || null;
    const isIncognito = existingLibraryDoc && existingLibraryDoc.userEmail === 'incognito_session';

    const requestedEmail = normalizeEmail(userEmail || chatData.userEmail);
    if (!isIncognito && requestedEmail && requestedEmail !== authenticatedEmail) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Requested user email does not match authenticated session.' },
        { status: 403 }
      );
    }

    if (existingLibraryDoc && !isIncognito && normalizeEmail(existingLibraryDoc.userEmail) !== authenticatedEmail) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'You do not have access to this library.' },
        { status: 403 }
      );
    }

    if ((existingLibrary.documents || []).length === 0) {
      const fallbackLibraryData = {
        created_at: new Date().toISOString(),
        searchInput: chatData.userSearchInput || '',
        userEmail: authenticatedEmail,
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

    // ✅ FIX: Extract only valid Appwrite fields
    const {
      libId,
      userEmail: _userEmail, // remove duplicates
      ...cleanChatData
    } = chatData;

    const documentData = {
      ...sanitizeChatPayload(cleanChatData),
      libId, // keep it only if defined in the CHATS_COLLECTION as a string field or relation
    };

    if (isIncognito) {
      documentData.userSearchInput = encryptIncognitoData(documentData.userSearchInput);
      if (documentData.aiResp !== undefined) documentData.aiResp = encryptIncognitoData(documentData.aiResp);
      if (documentData.searchResult !== undefined) documentData.searchResult = encryptIncognitoData(documentData.searchResult);
    }

    if (typeof documentData.searchResult !== 'string' || documentData.searchResult.length > APPWRITE_TEXT_MAX) {
      return NextResponse.json(
        {
          success: false,
          error: 'searchResult payload invalid after sanitization',
        },
        { status: 400 }
      );
    }

    const created = await databases.createDocument(
      DB_ID,
      CHATS_COLLECTION_ID,
      ID.unique(),
      documentData
    ).catch(dbErr => {
      console.error('[api/search/chats POST] Appwrite createDocument failed:', dbErr?.message);
      console.error('[api/search/chats POST] Document keys:', Object.keys(documentData));
      console.error('[api/search/chats POST] Field sizes:', Object.fromEntries(
        Object.entries(documentData).map(([k, v]) => [k, typeof v === 'string' ? v.length : typeof v])
      ));
      throw dbErr;
    });

    // Auto-save conversation to memory (non-blocking)
    // This allows users to benefit from conversation context in future searches
    if (authenticatedEmail && chatData.libId && !isIncognito) {
      setTimeout(async () => {
        try {
          const protocol = request.headers.get('x-forwarded-proto') || 'http';
          const host = request.headers.get('host') || 'localhost:3000';
          const baseUrl = `${protocol}://${host}`;

          await fetch(`${baseUrl}/api/memory/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              libId: chatData.libId,
              userEmail: authenticatedEmail,
            }),
          }).catch(err => {
            console.warn('[memory auto-save] Non-critical error, not blocking chat save:', err?.message);
          });
        } catch (memoryError) {
          console.warn('[memory auto-save] Error saving to memory:', memoryError?.message);
        }
      }, 0);
    }

    return NextResponse.json({ success: true, chat: { ...created, id: created.$id } });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'Authentication is required to create chats.');
    }
    console.error('[api/search/chats POST] Error:', error?.message, error?.response);
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
    const authenticatedEmail = await resolveRequestUserEmail(request);
    const body = await request.json();
    const { chatId, updateData } = body || {};

    if (!chatId || !updateData || typeof updateData !== 'object') {
      return NextResponse.json({ error: 'chatId and updateData are required' }, { status: 400 });
    }

    const existingChat = await databases.getDocument(DB_ID, CHATS_COLLECTION_ID, chatId);
    const linkedLibraries = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('libId', existingChat.libId),
      Query.limit(1),
    ]);
    const linkedLibrary = linkedLibraries.documents?.[0] || null;
    const isIncognito = linkedLibrary && linkedLibrary.userEmail === 'incognito_session';

    if (!linkedLibrary || (!isIncognito && normalizeEmail(linkedLibrary.userEmail) !== authenticatedEmail)) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const documentData = sanitizeChatPayload(updateData);
    
    if (isIncognito) {
      if (documentData.userSearchInput !== undefined) documentData.userSearchInput = encryptIncognitoData(documentData.userSearchInput);
      if (documentData.aiResp !== undefined) documentData.aiResp = encryptIncognitoData(documentData.aiResp);
      if (documentData.searchResult !== undefined) documentData.searchResult = encryptIncognitoData(documentData.searchResult);
    }
    const updated = await databases.updateDocument(DB_ID, CHATS_COLLECTION_ID, chatId, documentData);
    return NextResponse.json({ success: true, chat: { ...updated, id: updated.$id } });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'Authentication is required to update chats.');
    }
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
