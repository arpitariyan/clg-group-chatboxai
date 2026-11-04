/**
 * DELETE /api/v1/keys/[id]
 * Revoke/delete an API key
 * 
 * PATCH /api/v1/keys/[id]
 * Update API key settings (name, rate limits)
 * 
 * POST /api/v1/keys/[id]/rotate
 * Create a new key and revoke the old one
 */

import { NextResponse } from 'next/server';
import { databases } from '@/services/appwrite-admin.js';
import { API_KEYS_COLLECTION_ID, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID } from '@/services/appwrite-collections.js';
import { resolveRequestUserEmail } from '@/lib/server-auth.js';
import { ensureApiKeyStorageReady } from '@/lib/appwrite-api-keys-bootstrap.js';
import { generatePlatformApiKey, hashPlatformApiKey, getPlatformKeyLastDigits, encryptPlatformApiKey } from '@/lib/platform-api-key.js';
import { Query } from 'node-appwrite';
import { AuthError } from '@/lib/server-auth.js';

/**
 * Helper: Verify ownership of API key
 */
async function verifyKeyOwnership(keyId, userId) {
  const keyRecord = await databases.getDocument(
    APPWRITE_DATABASE_ID,
    API_KEYS_COLLECTION_ID,
    keyId
  );

  if (!keyRecord || keyRecord.user_id !== userId) {
    return null;
  }

  return keyRecord;
}

/**
 * Helper: Get user ID from email
 */
async function getUserIdFromEmail(email) {
  const usersResponse = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    USERS_COLLECTION_ID,
    [Query.equal('email', email.toLowerCase())]
  );

  if (usersResponse.documents.length === 0) {
    return null;
  }

  return usersResponse.documents[0].$id;
}

// DELETE /api/v1/keys/[id]
export async function DELETE(request, { params }) {
  try {
    await ensureApiKeyStorageReady();

    const email = await resolveRequestUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const userId = await getUserIdFromEmail(email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const { id: keyId } = await params;

    // Verify ownership
    const keyRecord = await verifyKeyOwnership(keyId, userId);
    if (!keyRecord) {
      return NextResponse.json(
        { error: 'API key not found or you do not have permission to delete it.' },
        { status: 403 }
      );
    }

    // Permanently delete key document
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      API_KEYS_COLLECTION_ID,
      keyId
    );

    return NextResponse.json(
      { success: true, message: 'API key deleted successfully.' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke API key.' },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/keys/[id]
export async function PATCH(request, { params }) {
  try {
    await ensureApiKeyStorageReady();

    const email = await resolveRequestUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const userId = await getUserIdFromEmail(email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const { id: keyId } = await params;

    // Verify ownership
    const keyRecord = await verifyKeyOwnership(keyId, userId);
    if (!keyRecord) {
      return NextResponse.json(
        { error: 'API key not found or you do not have permission to update it.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const updates = {};

    // Only allow updating specific fields
    if (body.name && typeof body.name === 'string') {
      updates.name = body.name;
    }

    if (typeof body.rate_limit_rpm === 'number' && body.rate_limit_rpm > 0) {
      updates.rate_limit_rpm = body.rate_limit_rpm;
    }

    if (typeof body.rate_limit_tpm === 'number' && body.rate_limit_tpm > 0) {
      updates.rate_limit_tpm = body.rate_limit_tpm;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400 }
      );
    }

    // Update the key
    const updatedKey = await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      API_KEYS_COLLECTION_ID,
      keyId,
      updates
    );

    return NextResponse.json(
      {
        success: true,
        key_id: updatedKey.$id,
        name: updatedKey.name,
        rate_limit_rpm: updatedKey.rate_limit_rpm,
        rate_limit_tpm: updatedKey.rate_limit_tpm,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update API key.' },
      { status: 500 }
    );
  }
}

// POST /api/v1/keys/[id]/rotate
export async function POST(request, { params }) {
  try {
    await ensureApiKeyStorageReady();

    // Check if this is a rotate request
    const url = new URL(request.url);
    if (!url.pathname.includes('/rotate')) {
      return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
    }

    const email = await resolveRequestUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const userId = await getUserIdFromEmail(email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const { id: keyId } = await params;

    // Verify ownership
    const keyRecord = await verifyKeyOwnership(keyId, userId);
    if (!keyRecord) {
      return NextResponse.json(
        { error: 'API key not found or you do not have permission to rotate it.' },
        { status: 403 }
      );
    }

    // Generate new key with same environment and settings
    const { ID } = await import('node-appwrite');
    const newApiKey = generatePlatformApiKey(keyRecord.environment);
    const newKeyHash = hashPlatformApiKey(newApiKey);
    const lastDigits = getPlatformKeyLastDigits(newApiKey);

    // Create new key record
    const newKeyRecord = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      API_KEYS_COLLECTION_ID,
      ID.unique(),
      {
        user_id: userId,
        user_email: email.toLowerCase(),
        key_hash: newKeyHash,
        ...encryptPlatformApiKey(newApiKey),
        environment: keyRecord.environment,
        name: `${keyRecord.name} (rotated)`,
        status: 'active',
        created_at: new Date().toISOString(),
        last_used_at: null,
        revoked_at: null,
        rate_limit_rpm: keyRecord.rate_limit_rpm,
        rate_limit_tpm: keyRecord.rate_limit_tpm,
        metadata: keyRecord.metadata,
      }
    );

    // Revoke old key
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      API_KEYS_COLLECTION_ID,
      keyId,
      {
        status: 'rotated',
        revoked_at: new Date().toISOString(),
      }
    );

    return NextResponse.json(
      {
        success: true,
        key: newApiKey,
        key_id: newKeyRecord.$id,
        name: newKeyRecord.name,
        environment: newKeyRecord.environment,
        created_at: newKeyRecord.created_at,
        last_digits: lastDigits,
        old_key_id: keyId,
        message: 'API key rotated. Old key has been revoked. Store the new key safely.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    console.error('Error rotating API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rotate API key.' },
      { status: 500 }
    );
  }
}
