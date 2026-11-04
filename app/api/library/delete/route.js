import { NextResponse } from 'next/server';
import { databases, storage, DB_ID, BUCKET_ID, Query } from '@/services/appwrite-admin';
import {
  LIBRARY_COLLECTION_ID,
  CHATS_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  WEBSITE_PROJECTS_COLLECTION_ID,
  WEBSITE_CONVERSATIONS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { withUser } from '@/lib/request-context';

const toErrorDetails = (error) => ({
  message: error?.message || error?.response?.message || 'Unknown error',
  code: error?.code || error?.response?.code || null,
  type: error?.type || error?.response?.type || null,
});

/**
 * Resolve the website-project document owned by `userEmail` for this libId.
 *
 * A project is addressable two ways here: by Appwrite document `$id` (the direct-delete
 * path) or by its `project_id` field (the fallback path). Either way, deletion must be
 * gated on ownership — before this, the branch deleted the project (and its conversations)
 * straight from the client-supplied id with no owner check, so any authenticated user
 * could destroy another user's project by passing its id.
 *
 * Returns the owned document, or null when none belongs to this user (caller → 404, so a
 * non-owner cannot distinguish "not found" from "not yours").
 */
async function resolveOwnedWebsiteProject(libId, userEmail) {
  try {
    const doc = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, libId);
    if (doc?.user_email === userEmail) return doc;
  } catch (_) {
    // Not addressable by $id (or not found) — fall through to the project_id lookup.
  }

  const byProjectId = await databases.listDocuments(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, [
    Query.equal('project_id', libId),
    Query.equal('user_email', userEmail),
    Query.limit(10),
  ]);

  return byProjectId.documents?.[0] || null;
}

export const DELETE = withUser(async function DELETE(request, ctx) {
  try {
    const body = await request.json().catch(() => ({}));
    const { libId, dataType } = body || {};
    const userEmail = ctx.assertEmail(body.userEmail);

    if (!libId || !dataType) {
      return NextResponse.json(
        { error: 'libId and dataType are required' },
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
      // Ownership gate (IDOR fix): confirm the caller owns this project before deleting
      // it or its conversations. Previously the project was deleted straight from the
      // client-supplied id, and conversations were removed with no owner check at all.
      const ownedProject = await resolveOwnedWebsiteProject(libId, userEmail);
      if (!ownedProject) {
        return NextResponse.json(
          { success: false, error: 'Website project not found' },
          { status: 404 }
        );
      }

      try {
        // 1. Delete all related conversations explicitly
        const convsRes = await databases.listDocuments(DB_ID, WEBSITE_CONVERSATIONS_COLLECTION_ID, [
          Query.equal('project_id', libId),
          Query.limit(5000) // Ensure all AI generation steps are fetched and deleted
        ]);
        for (const doc of convsRes.documents) {
          await databases.deleteDocument(DB_ID, WEBSITE_CONVERSATIONS_COLLECTION_ID, doc.$id);
        }
      } catch (convsError) {
        result.warnings.push({
          scope: 'website_conversations',
          message: `Could not delete conversations: ${convsError.message}`
        });
      }

      try {
        // 2. Delete the main project document
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
      // Ownership gate (IDOR fix): chats are keyed by libId with no owner column of their
      // own, so confirm the user owns the library entry for this libId before deleting the
      // chats. Previously chats were deleted from libId alone, unscoped to the owner.
      const libraryRes = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.equal('libId', libId),
        Query.equal('userEmail', userEmail),
        Query.limit(20),
      ]);

      if (libraryRes.documents.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Library entry not found' },
          { status: 404 }
        );
      }

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
});
