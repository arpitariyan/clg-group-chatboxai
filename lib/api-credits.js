import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import {
  API_CREDITS_COLLECTION_ID,
  API_CREDIT_TRANSACTIONS_COLLECTION_ID,
  USERS_COLLECTION_ID,
} from '@/services/appwrite-collections';

const creditLocks = new Map();

function queueByKey(key, task) {
  const previous = creditLocks.get(key) || Promise.resolve();

  const runTask = previous
    .catch(() => {})
    .then(task);

  creditLocks.set(
    key,
    runTask.finally(() => {
      if (creditLocks.get(key) === runTask) {
        creditLocks.delete(key);
      }
    })
  );

  return runTask;
}

function normalizeCredits(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Number(parsed.toFixed(6));
}

async function getUserIdFromEmail(userEmail) {
  const response = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
    Query.equal('email', String(userEmail || '').toLowerCase()),
    Query.limit(1),
  ]);

  if (!response.documents.length) {
    return null;
  }

  return response.documents[0].$id;
}

export async function getApiCreditsDoc(userEmail) {
  const response = await databases.listDocuments(DB_ID, API_CREDITS_COLLECTION_ID, [
    Query.equal('user_email', String(userEmail || '').toLowerCase()),
    Query.limit(1),
  ]);

  return response.documents[0] || null;
}

export async function getOrCreateApiCreditsDoc(userEmail) {
  const normalizedEmail = String(userEmail || '').toLowerCase();
  if (!normalizedEmail) {
    throw new Error('User email is required.');
  }

  const userId = await getUserIdFromEmail(normalizedEmail);
  if (!userId) {
    throw new Error('User not found.');
  }

  const existing = await getApiCreditsDoc(normalizedEmail);
  if (existing) {
    return existing;
  }

  return databases.createDocument(DB_ID, API_CREDITS_COLLECTION_ID, ID.unique(), {
    user_id: userId,
    user_email: normalizedEmail,
    balance_credits: '0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function getApiCreditTransactions(userEmail, limit = 20) {
  const normalizedEmail = String(userEmail || '').toLowerCase();
  const userId = await getUserIdFromEmail(normalizedEmail);
  if (!userId) {
    return [];
  }

  const response = await databases.listDocuments(DB_ID, API_CREDIT_TRANSACTIONS_COLLECTION_ID, [
    Query.equal('user_id', userId),
    Query.orderDesc('created_at'),
    Query.limit(Math.min(Math.max(Number(limit) || 20, 1), 100)),
  ]);

  return response.documents;
}

export async function recordApiCreditTransaction({
  userEmail,
  amount,
  transactionType,
  balanceBefore,
  balanceAfter,
  orderId = '',
  paymentId = '',
  keyId = '',
  endpoint = '',
  costUsd = '',
  meta = {},
}) {
  const normalizedEmail = String(userEmail || '').toLowerCase();
  if (!normalizedEmail || !transactionType) {
    return null;
  }

  const userId = await getUserIdFromEmail(normalizedEmail);
  if (!userId) {
    return null;
  }

  const payload = {
    user_id: userId,
    user_email: normalizedEmail,
    amount: String(amount ?? '0'),
    transaction_type: transactionType,
    balance_before: String(balanceBefore ?? '0'),
    balance_after: String(balanceAfter ?? '0'),
    order_id: orderId || '',
    payment_id: paymentId || '',
    key_id: keyId || '',
    endpoint: endpoint || '',
    cost_usd: String(costUsd ?? '0'),
    meta: JSON.stringify(meta || {}),
    created_at: new Date().toISOString(),
  };

  return databases.createDocument(DB_ID, API_CREDIT_TRANSACTIONS_COLLECTION_ID, ID.unique(), payload);
}

export async function addApiCreditsWithLock(userEmail, amount, options = {}) {
  const normalizedEmail = String(userEmail || '').toLowerCase();
  const creditAmount = normalizeCredits(amount);
  if (!normalizedEmail) {
    return { success: false, error: 'User email is required.' };
  }

  if (creditAmount <= 0) {
    return { success: false, error: 'Invalid credit amount.' };
  }

  return queueByKey(normalizedEmail, async () => {
    const creditsDoc = await getOrCreateApiCreditsDoc(normalizedEmail);
    const balanceBefore = normalizeCredits(creditsDoc.balance_credits);
    const balanceAfter = Number((balanceBefore + creditAmount).toFixed(6));

    const updated = await databases.updateDocument(DB_ID, API_CREDITS_COLLECTION_ID, creditsDoc.$id, {
      balance_credits: String(balanceAfter),
      updated_at: new Date().toISOString(),
    });

    await recordApiCreditTransaction({
      userEmail: normalizedEmail,
      amount: creditAmount,
      transactionType: options.transactionType || 'purchase',
      balanceBefore,
      balanceAfter,
      orderId: options.orderId || '',
      paymentId: options.paymentId || '',
      keyId: options.keyId || '',
      endpoint: options.endpoint || 'api-credits',
      costUsd: options.costUsd || '0',
      meta: options.meta || {},
    });

    return {
      success: true,
      balance_credits: normalizeCredits(updated.balance_credits),
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      credit_amount: creditAmount,
    };
  });
}

export async function deductApiCreditsWithLock(userEmail, amount, options = {}) {
  const normalizedEmail = String(userEmail || '').toLowerCase();
  const creditAmount = normalizeCredits(amount);
  if (!normalizedEmail) {
    return { success: false, error: 'User email is required.' };
  }

  if (creditAmount <= 0) {
    return { success: false, error: 'Invalid credit amount.' };
  }

  return queueByKey(normalizedEmail, async () => {
    const creditsDoc = await getOrCreateApiCreditsDoc(normalizedEmail);
    const balanceBefore = normalizeCredits(creditsDoc.balance_credits);

    if (!options.allowNegative && balanceBefore < creditAmount) {
      return {
        success: false,
        error: 'Insufficient API credits. Please purchase more credits to continue using the API.',
        balance_credits: balanceBefore,
        required_credits: creditAmount,
      };
    }

    const balanceAfter = Number((balanceBefore - creditAmount).toFixed(6));

    const updated = await databases.updateDocument(DB_ID, API_CREDITS_COLLECTION_ID, creditsDoc.$id, {
      balance_credits: String(balanceAfter),
      updated_at: new Date().toISOString(),
    });

    await recordApiCreditTransaction({
      userEmail: normalizedEmail,
      amount: creditAmount,
      transactionType: options.transactionType || 'usage',
      balanceBefore,
      balanceAfter,
      orderId: options.orderId || '',
      paymentId: options.paymentId || '',
      keyId: options.keyId || '',
      endpoint: options.endpoint || '',
      costUsd: options.costUsd || String(creditAmount),
      meta: options.meta || {},
    });

    return {
      success: true,
      balance_credits: normalizeCredits(updated.balance_credits),
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      deducted_credits: creditAmount,
    };
  });
}