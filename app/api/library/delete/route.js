import { NextResponse } from 'next/server';
import { databases, storage, DB_ID, BUCKET_ID, Query } from '@/services/appwrite-admin';
import {
  LIBRARY_COLLECTION_ID,
  CHATS_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  WEBSITE_PROJECTS_COLLECTION_ID,
} from '@/services/appwrite-collections';

const toErrorDetails = (error) => ({
  message: error?.message || error?.response?.message || 'Unknown error',
  code: error?.code || error?.response?.code || null,
  type: error?.type || error?.response?.type || null,
});

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { libId, dataType, userEmail } = body || {};

    if (!libId || !dataType || !userEmail) {
      return NextResponse.json(
        { error: 'libId, dataType and userEmail are required' },
        { status: 400 }
      );
    }

    const result = {
      success: true,
      deleted: {
        library: 0,
        chats: 0,
        imageGeneration: 0,
        websiteProjects: 0,
      },
      warnings: [],
    };

    if (dataType === 'image-generation') {
      const imgRes = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
        Query.equal('libId', libId),
        Query.equal('userEmail', userEmail),
        Query.limit(100),
      ]);

      for (const doc of imgRes.documents) {
        // Delete the image file from Appwrite Storage first
        if (doc.generatedImagePath) {
          try {
            await storage.deleteFile(BUCKET_ID, doc.generatedImagePath);
          } catch (storageErr) {
            // File may already be gone; log but continue
            result.warnings.push({
              scope: 'storage',
              message: `Could not delete storage file ${doc.generatedImagePath}: ${storageErr?.message || storageErr}`,
            });
          }
        }
        await databases.deleteDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, doc.$id);
        result.deleted.imageGeneration += 1;
      }
    } else if (dataType === 'website-builder') {
      try {
        await databases.deleteDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, libId);
        result.deleted.websiteProjects += 1;
      } catch (directDeleteError) {
        const fallbackRes = await databases.listDocuments(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, [
          Query.equal('project_id', libId),
          Query.equal('user_email', userEmail),
          Query.limit(10),
        ]);

        for (const doc of fallbackRes.documents) {
          await databases.deleteDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, doc.$id);
          result.deleted.websiteProjects += 1;
        }

        if (result.deleted.websiteProjects === 0) {
          throw directDeleteError;
        }
      }
    } else {
      try {
        const chatsRes = await databases.listDocuments(DB_ID, CHATS_COLLECTION_ID, [
          Query.equal('libId', libId),
          Query.limit(200),
        ]);

        for (const doc of chatsRes.documents) {
          await databases.deleteDocument(DB_ID, CHATS_COLLECTION_ID, doc.$id);
          result.deleted.chats += 1;
        }
      } catch (chatsError) {
        result.warnings.push({
          scope: 'chats',
          ...toErrorDetails(chatsError),
        });
      }

      const libraryRes = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.equal('libId', libId),
        Query.equal('userEmail', userEmail),
        Query.limit(20),
      ]);

      for (const doc of libraryRes.documents) {
        await databases.deleteDocument(DB_ID, LIBRARY_COLLECTION_ID, doc.$id);
        result.deleted.library += 1;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const details = toErrorDetails(error);
    console.error('[api/library/delete] Failed:', details);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete library entry',
        details,
      },
      { status: 500 }
    );
  }
}