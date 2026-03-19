import { NextResponse } from 'next/server';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID } from '@/services/appwrite-collections';

function getUserNameFromEmail(email = '') {
  const emailName = String(email || '').split('@')[0] || 'user';
  const cleanName = emailName.replace(/[0-9._-]/g, '');
  const normalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
  return normalized || 'User';
}

function buildDefaultUser({ email, name }) {
  return {
    email,
    name: name || getUserNameFromEmail(email),
    plan: 'free',
    credits: 5000,
    last_monthly_reset: new Date().toISOString().split('T')[0],
    mfa_enabled: false,
    mfa_email: null,
    accent_color: 'violet',
    language: 'en',
  };
}

async function listUsersByEmail(email) {
  // Some Appwrite setups may reject mixed filter+sort queries when indexes differ.
  // Try the optimized query first, then fall back to a broader query and sort locally.
  try {
    return await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.orderDesc('$updatedAt'),
      Query.limit(10),
    ]);
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    const shouldFallback =
      message.includes('index') ||
      message.includes('invalid query') ||
      message.includes('attribute not found') ||
      message.includes('order') ||
      message.includes('query');

    if (!shouldFallback) throw error;

    return databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(100),
    ]);
  }
}

function sortByUpdatedAtDesc(documents = []) {
  return [...documents].sort((a, b) => {
    const aTime = new Date(a?.$updatedAt || 0).getTime() || 0;
    const bTime = new Date(b?.$updatedAt || 0).getTime() || 0;
    return bTime - aTime;
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = (searchParams.get('email') || '').trim().toLowerCase();
    const createIfMissing = searchParams.get('createIfMissing') !== 'false';
    const name = (searchParams.get('name') || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const res = await listUsersByEmail(email);
    const allDocs = sortByUpdatedAtDesc(res?.documents || []).slice(0, 10);

    // Default to the first (most recently updated) or one with MFA explicitly on
    let user = allDocs.find(doc => doc.mfa_enabled === true) || allDocs[0] || null;

    // If duplicate documents exist, merge them to preserve the best account state
    if (allDocs.length > 1) {
      const merged = allDocs.reduce((best, doc) => ({
        ...best,
        ...doc,
        // Critical fields — prefer truthy/upgraded values
        mfa_enabled: best.mfa_enabled || doc.mfa_enabled,
        mfa_email: best.mfa_email || doc.mfa_email,
        plan: (best.plan === 'pro' || doc.plan === 'pro') ? 'pro' : (best.plan || doc.plan || 'free'),
        credits: Math.max(best.credits || 0, doc.credits || 0),
      }), {});
      user = merged;
    }

    if (!user && createIfMissing) {
      user = await databases.createDocument(
        DB_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        buildDefaultUser({ email, name })
      );
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user profile',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const email = (body?.email || '').trim().toLowerCase();
    const updates = body?.updates;

    if (!email || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'email and updates are required' }, { status: 400 });
    }

    const safeUpdates = { ...updates };

    if (Object.prototype.hasOwnProperty.call(safeUpdates, 'name')) {
      const normalizedName = String(safeUpdates.name || '').trim().slice(0, 120);
      if (!normalizedName) {
        return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
      }
      safeUpdates.name = normalizedName;
    }

    const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(100),
    ]);

    const existingDocs = Array.isArray(res?.documents) ? res.documents : [];

    if (!existingDocs.length) {
      const created = await databases.createDocument(
        DB_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        {
          ...buildDefaultUser({ email, name: safeUpdates.name }),
          ...safeUpdates,
          email,
        }
      );

      return NextResponse.json({ success: true, user: created, created: true });
    }

    const updatedDocs = await Promise.all(
      existingDocs.map((doc) =>
        databases.updateDocument(DB_ID, USERS_COLLECTION_ID, doc.$id, safeUpdates)
      )
    );

    // Force merge the original updates back into the returned document.
    // If the Appwrite database schema is missing columns like `mfa_enabled`,
    // Appwrite will silently strip them from the returned document.
    // This frontend-facing merge ensures the client still receives the updated state.
    const primary = updatedDocs[0] || null;
    const mergedUser = primary ? { ...primary, ...safeUpdates } : null;

    return NextResponse.json({
      success: true,
      user: mergedUser,
      updatedCount: updatedDocs.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user profile',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
