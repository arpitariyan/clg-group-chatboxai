import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID } from '@/services/appwrite-collections';
import { normalizePlan } from '@/lib/subscriptionPlans';
import dns from 'node:dns';

// Fix Node 18+ IPv6 timeout issues in Route Handlers
dns.setDefaultResultOrder('ipv4first');

const HAS_APPWRITE_CONFIG = Boolean(DB_ID && process.env.APPWRITE_API_KEY);

export function getUserNameFromEmail(email = '') {
  const emailName = String(email || '').split('@')[0] || 'user';
  const cleanName = emailName.replace(/[0-9._-]/g, '');
  const normalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
  return normalized || 'User';
}

export function buildDefaultUser({ email, name }) {
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
    chat_font: 'default',
    memory_enabled: true,
    signup_verified: false, // Must complete email OTP verification before accessing the app
  };
}


// Timeout helper for Appwrite requests
function withTimeout(promise, ms = 3000, label = 'Appwrite') {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(label + ' timeout after ' + ms + 'ms')), ms)
  );
  return Promise.race([promise, timeout]);
}
export async function listUsersByEmail(email) {
  try {
    return await withTimeout(databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.orderDesc('$updatedAt'),
      Query.limit(10),
    ]), 3000, 'listUsersByEmail');
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    const shouldFallback =
      message.includes('index') ||
      message.includes('invalid query') ||
      message.includes('attribute not found') ||
      message.includes('order') ||
      message.includes('query');

    if (!shouldFallback) throw error;

    return withTimeout(databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', email),
      Query.limit(100),
    ]), 3000, 'listUsersByEmailFallback');
  }
}

export function sortByUpdatedAtDesc(documents = []) {
  return [...documents].sort((a, b) => {
    const aTime = new Date(a?.$updatedAt || 0).getTime() || 0;
    const bTime = new Date(b?.$updatedAt || 0).getTime() || 0;
    return bTime - aTime;
  });
}

export async function getCanonicalUserByEmail({ email, name = '', createIfMissing = false }) {
  if (!email) {
    return { user: null, allDocs: [], created: false };
  }

  if (!HAS_APPWRITE_CONFIG) {
    return {
      user: buildDefaultUser({ email, name }),
      allDocs: [],
      created: false,
    };
  }

  let res;
  try {
    res = await listUsersByEmail(email);
  } catch (err) {
    console.error('[Appwrite] listUsersByEmail failed:', err.message);
    // Graceful fallback if Appwrite is completely unreachable (e.g., fetch failed / timeout)
    return {
      user: buildDefaultUser({ email, name }),
      allDocs: [],
      created: false,
      isOfflineFallback: true,
    };
  }

  const allDocs = sortByUpdatedAtDesc(res?.documents || []).slice(0, 10);

  let user = allDocs.find((doc) => doc.mfa_enabled === true) || allDocs[0] || null;

  if (allDocs.length > 1) {
    user = allDocs.reduce((best, doc) => ({
      ...best,
      ...doc,
      mfa_enabled: best.mfa_enabled || doc.mfa_enabled,
      mfa_email: best.mfa_email || doc.mfa_email,
      plan: (() => {
        const bestPlan = normalizePlan(best.plan);
        const docPlan = normalizePlan(doc.plan);
        if (bestPlan === 'max' || docPlan === 'max') return 'max';
        if (bestPlan === 'pro' || docPlan === 'pro') return 'pro';
        return 'free';
      })(),
      credits: Math.max(best.credits || 0, doc.credits || 0),
    }), {});
  }

  if (!user && createIfMissing) {
    user = await databases.createDocument(
      DB_ID,
      USERS_COLLECTION_ID,
      ID.unique(),
      buildDefaultUser({ email, name })
    );
    return { user, allDocs: [user], created: true };
  }

  return { user, allDocs, created: false };
}

export async function updateUsersByEmail(email, updates) {
  if (!HAS_APPWRITE_CONFIG) {
    return [{
      ...buildDefaultUser({ email, name: updates?.name }),
      ...updates,
      email,
    }];
  }

  const res = await listUsersByEmail(email);
  const existingDocs = Array.isArray(res?.documents) ? res.documents : [];

  if (!existingDocs.length) {
    const created = await databases.createDocument(
      DB_ID,
      USERS_COLLECTION_ID,
      ID.unique(),
      {
        ...buildDefaultUser({ email, name: updates?.name }),
        ...updates,
        email,
      }
    );
    return [created];
  }

  return Promise.all(
    existingDocs.map((doc) => databases.updateDocument(DB_ID, USERS_COLLECTION_ID, doc.$id, updates))
  );
}