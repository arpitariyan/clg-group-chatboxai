import { databases } from '@/services/appwrite-admin.js';
import {
  API_CREDITS_COLLECTION_ID,
  API_CREDIT_TRANSACTIONS_COLLECTION_ID,
  APPWRITE_DATABASE_ID,
} from '@/services/appwrite-collections.js';

const API_CREDITS_COLLECTION_SCHEMA = {
  name: 'API Credits',
  attributes: [
    { key: 'user_id', type: 'string', size: 255, required: true },
    { key: 'user_email', type: 'string', size: 255, required: true },
    { key: 'balance_credits', type: 'string', size: 64, required: true },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true },
  ],
  indexes: [
    { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
    { key: 'user_email_idx', type: 'key', attributes: ['user_email'] },
  ],
};

const API_CREDIT_TRANSACTIONS_SCHEMA = {
  name: 'API Credit Transactions',
  attributes: [
    { key: 'user_id', type: 'string', size: 255, required: true },
    { key: 'user_email', type: 'string', size: 255, required: true },
    { key: 'amount', type: 'string', size: 64, required: true },
    { key: 'transaction_type', type: 'string', size: 64, required: true },
    { key: 'balance_before', type: 'string', size: 64, required: true },
    { key: 'balance_after', type: 'string', size: 64, required: true },
    { key: 'order_id', type: 'string', size: 255, required: false },
    { key: 'payment_id', type: 'string', size: 255, required: false },
    { key: 'key_id', type: 'string', size: 255, required: false },
    { key: 'endpoint', type: 'string', size: 128, required: false },
    { key: 'cost_usd', type: 'string', size: 64, required: false },
    { key: 'meta', type: 'string', size: 4096, required: false },
    { key: 'created_at', type: 'datetime', required: true },
  ],
  indexes: [
    { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
    { key: 'user_email_idx', type: 'key', attributes: ['user_email'] },
    { key: 'transaction_type_idx', type: 'key', attributes: ['transaction_type'] },
    { key: 'order_id_idx', type: 'key', attributes: ['order_id'] },
    { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] },
  ],
};

async function ensureCollection(collectionId, schema) {
  try {
    await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
    return false;
  } catch (error) {
    if (Number(error?.code) !== 404) {
      throw error;
    }
  }

  await databases.createCollection({
    databaseId: APPWRITE_DATABASE_ID,
    collectionId,
    name: schema.name,
    permissions: [],
    documentSecurity: false,
    enabled: true,
    attributes: schema.attributes,
    indexes: schema.indexes,
  });

  return true;
}

export async function ensureApiCreditStorageReady() {
  if (!APPWRITE_DATABASE_ID || !API_CREDITS_COLLECTION_ID || !API_CREDIT_TRANSACTIONS_COLLECTION_ID) {
    throw new Error('Appwrite database or API credit collection IDs are not configured.');
  }

  await ensureCollection(API_CREDITS_COLLECTION_ID, API_CREDITS_COLLECTION_SCHEMA);
  return ensureCollection(API_CREDIT_TRANSACTIONS_COLLECTION_ID, API_CREDIT_TRANSACTIONS_SCHEMA);
}