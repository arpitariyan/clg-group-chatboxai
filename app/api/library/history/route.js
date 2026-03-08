import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  LIBRARY_COLLECTION_ID,
  CHATS_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  WEBSITE_PROJECTS_COLLECTION_ID,
} from '@/services/appwrite-collections';

function getProxyFileUrl(fileId, userEmail, libId) {
  const params = new URLSearchParams({ fileId });
  if (userEmail) params.set('userEmail', userEmail);
  if (libId) params.set('libId', libId);
  return `/api/generate-image/file?${params.toString()}`;
}

function normalizeDisplayUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete('mode');
    return parsed.toString();
  } catch (_) {
    return rawUrl
      .replace(/[?&]mode=admin/g, '')
      .replace('?&', '?')
      .replace(/\?$/, '');
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let libraryDocs = [];
    let imageGenDocs = [];
    let websiteProjectsDocs = [];

    const [libResult, imgResult, wpResult] = await Promise.allSettled([
      databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.equal('userEmail', userEmail),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]),
      databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
        Query.equal('userEmail', userEmail),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]),
      databases.listDocuments(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, [
        Query.equal('user_email', userEmail),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]),
    ]);

    if (libResult.status === 'fulfilled') libraryDocs = libResult.value.documents;
    if (imgResult.status === 'fulfilled') {
      const rawImageDocs = imgResult.value.documents || [];
      const groupedByConversation = new Map();

      for (const doc of rawImageDocs) {
        const conversationLibId = doc?.libId || doc?.$id;
        if (!conversationLibId) continue;

        if (!groupedByConversation.has(conversationLibId)) {
          groupedByConversation.set(conversationLibId, {
            latest: doc,
            count: 1,
          });
          continue;
        }

        const current = groupedByConversation.get(conversationLibId);
        const currentTime = new Date(current.latest?.created_at || current.latest?.$createdAt || 0).getTime();
        const nextTime = new Date(doc?.created_at || doc?.$createdAt || 0).getTime();

        groupedByConversation.set(conversationLibId, {
          latest: nextTime > currentTime ? doc : current.latest,
          count: current.count + 1,
        });
      }

      imageGenDocs = Array.from(groupedByConversation.entries()).map(([conversationLibId, item]) => ({
        ...item.latest,
        libId: conversationLibId,
        publicUrl: item.latest?.generatedImagePath
          ? getProxyFileUrl(item.latest.generatedImagePath, item.latest?.userEmail || userEmail, conversationLibId)
          : normalizeDisplayUrl(item.latest?.publicUrl),
        imageCount: item.count,
      }));
    }
    if (wpResult.status === 'fulfilled') websiteProjectsDocs = wpResult.value.documents;

    const chatsMap = {};
    if (libraryDocs.length > 0) {
      const libIds = libraryDocs.map((item) => item.libId).filter(Boolean);
      if (libIds.length > 0) {
        try {
          const chatsRes = await databases.listDocuments(DB_ID, CHATS_COLLECTION_ID, [
            Query.equal('libId', libIds),
            Query.limit(500),
          ]);

          for (const chat of chatsRes.documents) {
            if (!chatsMap[chat.libId]) chatsMap[chat.libId] = [];
            chatsMap[chat.libId].push({ ...chat, id: chat.$id });
          }
        } catch (error) {
          console.warn('[api/library/history] Chats fetch warning:', error?.message || error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      libraryDocs,
      imageGenDocs,
      websiteProjectsDocs,
      chatsMap,
      warnings: {
        library: libResult.status === 'rejected' ? libResult.reason?.message || 'Library query failed' : null,
        imageGeneration: imgResult.status === 'rejected' ? imgResult.reason?.message || 'Image query failed' : null,
        websiteProjects: wpResult.status === 'rejected' ? wpResult.reason?.message || 'Website query failed' : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch library history',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
