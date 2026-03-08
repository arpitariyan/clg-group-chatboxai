import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  LIBRARY_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  WEBSITE_PROJECTS_COLLECTION_ID,
} from '@/services/appwrite-collections';

const MAX_TITLE_LENGTH = 140;

const toErrorDetails = (error) => ({
  message: error?.message || error?.response?.message || 'Unknown error',
  code: error?.code || error?.response?.code || null,
  type: error?.type || error?.response?.type || null,
});

const normalizeTitle = (value) => String(value ?? '').trim().slice(0, MAX_TITLE_LENGTH);

const isUnknownAttributeError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('unknown attribute') || message.includes('attribute not found') || message.includes('invalid document structure');
};

async function updateWebsiteTitleBySchema(docId, title) {
  const payloads = [
    { title },
    { project_name: title },
    { name: title },
  ];

  for (const payload of payloads) {
    try {
      await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, docId, payload);
      return true;
    } catch (error) {
      if (!isUnknownAttributeError(error)) {
        throw error;
      }
    }
  }

  return false;
}

async function renameSearch(libId, userEmail, title) {
  const res = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
    Query.equal('libId', libId),
    Query.equal('userEmail', userEmail),
    Query.limit(20),
  ]);

  for (const doc of res.documents || []) {
    await databases.updateDocument(DB_ID, LIBRARY_COLLECTION_ID, doc.$id, { searchInput: title });
  }

  return (res.documents || []).length;
}

async function renameImageGeneration(libId, userEmail, title) {
  const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
    Query.equal('libId', libId),
    Query.equal('userEmail', userEmail),
    Query.limit(100),
  ]);

  for (const doc of res.documents || []) {
    await databases.updateDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, doc.$id, { prompt: title });
  }

  return (res.documents || []).length;
}

async function renameWebsiteBuilder(libId, userEmail, title) {
  let updated = 0;

  try {
    const doc = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, libId);
    if (doc?.user_email === userEmail) {
      const updatedWithAnyTitleField = await updateWebsiteTitleBySchema(doc.$id, title);
      if (!updatedWithAnyTitleField) {
        throw new Error('No compatible website title field found in schema');
      }
      updated += 1;
      return updated;
    }
  } catch (_) {
    // Fallback below handles records addressed by project_id.
  }

  const fallback = await databases.listDocuments(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, [
    Query.equal('project_id', libId),
    Query.equal('user_email', userEmail),
    Query.limit(20),
  ]);

  for (const doc of fallback.documents || []) {
    const updatedWithAnyTitleField = await updateWebsiteTitleBySchema(doc.$id, title);
    if (!updatedWithAnyTitleField) {
      throw new Error('No compatible website title field found in schema');
    }
    updated += 1;
  }

  return updated;
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { libId, dataType, userEmail, title } = body || {};

    if (!libId || !dataType || !userEmail) {
      return NextResponse.json(
        { error: 'libId, dataType and userEmail are required' },
        { status: 400 }
      );
    }

    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    let updatedCount = 0;

    if (dataType === 'image-generation') {
      updatedCount = await renameImageGeneration(libId, userEmail, normalizedTitle);
    } else if (dataType === 'website-builder') {
      updatedCount = await renameWebsiteBuilder(libId, userEmail, normalizedTitle);
    } else {
      updatedCount = await renameSearch(libId, userEmail, normalizedTitle);
    }

    if (!updatedCount) {
      return NextResponse.json(
        { success: false, error: 'Library record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      title: normalizedTitle,
      libId,
      dataType,
    });
  } catch (error) {
    const details = toErrorDetails(error);
    console.error('[api/library/update] Failed:', details);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update library entry',
        details,
      },
      { status: 500 }
    );
  }
}
