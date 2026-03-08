import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { LIBRARY_COLLECTION_ID } from '@/services/appwrite-collections';

const normalizeString = (value, fallback = '', maxLength = 200) => {
  const normalized = String(value ?? fallback ?? '').trim();
  return normalized.slice(0, maxLength);
};

const normalizeUploadedFiles = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const ALLOWED_LIBRARY_UPDATE_FIELDS = new Set([
  'searchInput',
  'type',
  'selectedModel',
  'modelName',
  'uploadedFiles',
  'hasFiles',
  'analyzedFilesCount',
  'processedAt',
]);

const FILE_CONTEXT_FIELDS = ['uploadedFiles', 'hasFiles', 'analyzedFilesCount', 'processedAt'];

const isUnknownAttributeError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('unknown attribute') || message.includes('attribute not found') || message.includes('invalid document structure');
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { libId, libraryData } = body || {};

    if (!libId) {
      return NextResponse.json({ error: 'libId is required' }, { status: 400 });
    }

    if (!libraryData || typeof libraryData !== 'object') {
      return NextResponse.json({ error: 'libraryData is required' }, { status: 400 });
    }

    const existing = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('libId', libId),
      Query.limit(1),
    ]);

    if ((existing.documents || []).length > 0) {
      const doc = existing.documents[0];
      return NextResponse.json({ success: true, created: false, record: { ...doc, id: doc.$id } });
    }

    const payload = {
      created_at: libraryData.created_at || new Date().toISOString(),
      searchInput: normalizeString(libraryData.searchInput, '', 1000000),
      userEmail: normalizeString(libraryData.userEmail, 'anonymous', 200),
      type: normalizeString(libraryData.type, 'search', 100),
      libId: normalizeString(libId, '', 200),
      selectedModel: normalizeString(libraryData.selectedModel, 'provider-8/gemini-2.0-flash', 200),
      modelName: normalizeString(libraryData.modelName, 'Gemini 2.0 Flash', 200),
      hasFiles: !!libraryData.hasFiles,
      analyzedFilesCount: Number(libraryData.analyzedFilesCount || 0),
    };

    if (libraryData.uploadedFiles !== undefined) {
      payload.uploadedFiles = libraryData.uploadedFiles;
    }

    if (libraryData.processedAt !== undefined) {
      payload.processedAt = libraryData.processedAt;
    }

    const created = await databases.createDocument(DB_ID, LIBRARY_COLLECTION_ID, libId, payload);

    return NextResponse.json({
      success: true,
      created: true,
      record: { ...created, id: created.$id },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create library record',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { libId, updateData } = body || {};

    if (!libId) {
      return NextResponse.json({ error: 'libId is required' }, { status: 400 });
    }

    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json({ error: 'updateData is required' }, { status: 400 });
    }

    const existing = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('libId', libId),
      Query.limit(1),
    ]);

    const existingDoc = (existing.documents || [])[0];

    if (!existingDoc) {
      return NextResponse.json({ success: false, error: 'Library record not found' }, { status: 404 });
    }

    const payload = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (ALLOWED_LIBRARY_UPDATE_FIELDS.has(key)) {
        payload[key] = value;
      }
    }

    if (payload.searchInput !== undefined) {
      payload.searchInput = normalizeString(payload.searchInput, '', 1000000);
    }

    if (payload.type !== undefined) {
      payload.type = normalizeString(payload.type, existingDoc.type || 'search', 100);
    }

    if (payload.selectedModel !== undefined) {
      payload.selectedModel = normalizeString(payload.selectedModel, existingDoc.selectedModel || 'provider-8/gemini-2.0-flash', 200);
    }

    if (payload.modelName !== undefined) {
      payload.modelName = normalizeString(payload.modelName, existingDoc.modelName || 'Gemini 2.0 Flash', 200);
    }

    if (payload.uploadedFiles !== undefined) {
      payload.uploadedFiles = normalizeUploadedFiles(payload.uploadedFiles);
      payload.hasFiles = payload.uploadedFiles.length > 0;
      payload.analyzedFilesCount = payload.uploadedFiles.length;
      payload.processedAt = new Date().toISOString();
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({
        success: true,
        record: { ...existingDoc, id: existingDoc.$id },
      });
    }

    let updated;
    try {
      updated = await databases.updateDocument(DB_ID, LIBRARY_COLLECTION_ID, existingDoc.$id, payload);
    } catch (error) {
      if (!isUnknownAttributeError(error)) {
        throw error;
      }

      const fallbackPayload = { ...payload };
      for (const field of FILE_CONTEXT_FIELDS) {
        delete fallbackPayload[field];
      }

      if (Object.keys(fallbackPayload).length === 0) {
        return NextResponse.json({
          success: true,
          record: { ...existingDoc, id: existingDoc.$id },
          warning: 'Schema does not support file-context fields yet; update skipped for those fields.',
        });
      }

      updated = await databases.updateDocument(DB_ID, LIBRARY_COLLECTION_ID, existingDoc.$id, fallbackPayload);
    }

    return NextResponse.json({
      success: true,
      record: { ...updated, id: updated.$id },
    });
  } catch (error) {
    console.error('Library PATCH error:', {
      message: error?.message,
      code: error?.code,
      type: error?.type,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update library record',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
