import { databases } from '@/services/appwrite-admin.js';
import { API_USAGE_LOGS_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';

const API_USAGE_LOGS_SCHEMA = {
  name: 'API Usage Logs',
  attributes: [
    { key: 'user_id', type: 'string', size: 255, required: true },
    { key: 'key_id', type: 'string', size: 255, required: false },
    { key: 'endpoint', type: 'string', size: 64, required: false },
    { key: 'model', type: 'string', size: 128, required: false },
    { key: 'input_tokens', type: 'integer', required: false },
    { key: 'output_tokens', type: 'integer', required: false },
    { key: 'total_tokens', type: 'integer', required: false },
    // Appwrite does not accept 'float' as an attribute type in some versions;
    // store cost as a string (e.g. decimal in text) to avoid createCollection errors.
    { key: 'cost_usd', type: 'string', size: 64, required: false },
    { key: 'status', type: 'string', size: 64, required: false },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'timestamp', type: 'integer', required: false },
    { key: 'meta', type: 'string', size: 4096, required: false },
  ],
  indexes: [
    { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
    { key: 'key_id_idx', type: 'key', attributes: ['key_id'] },
    { key: 'endpoint_idx', type: 'key', attributes: ['endpoint'] },
    { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] },
  ],
};

async function ensureApiUsageCollection() {
  try {
    await databases.getCollection(APPWRITE_DATABASE_ID, API_USAGE_LOGS_COLLECTION_ID);
    return false;
  } catch (error) {
    if (Number(error?.code) !== 404) {
      throw error;
    }
  }

  await databases.createCollection({
    databaseId: APPWRITE_DATABASE_ID,
    collectionId: API_USAGE_LOGS_COLLECTION_ID,
    name: API_USAGE_LOGS_SCHEMA.name,
    permissions: [],
    documentSecurity: false,
    enabled: true,
    attributes: API_USAGE_LOGS_SCHEMA.attributes,
    indexes: API_USAGE_LOGS_SCHEMA.indexes,
  });

  return true;
}

export async function ensureApiUsageStorageReady() {
  if (!APPWRITE_DATABASE_ID || !API_USAGE_LOGS_COLLECTION_ID) {
    throw new Error('Appwrite database or API usage logs collection ID is not configured.');
  }

  return ensureApiUsageCollection();
}
