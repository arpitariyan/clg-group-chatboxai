import { databases } from '@/services/appwrite-admin.js';
import { API_KEYS_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';

const API_KEYS_COLLECTION_SCHEMA = {
  name: 'API Keys',
  attributes: [
    { key: 'user_id', type: 'string', size: 255, required: true },
    { key: 'key_hash', type: 'string', size: 128, required: true },
    { key: 'encrypted_key', type: 'string', size: 2048, required: false },
    { key: 'encrypted_key_iv', type: 'string', size: 64, required: false },
    { key: 'encrypted_key_tag', type: 'string', size: 64, required: false },
    { key: 'environment', type: 'string', size: 32, required: true },
    { key: 'name', type: 'string', size: 255, required: false },
    { key: 'status', type: 'string', size: 32, required: true },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'last_used_at', type: 'datetime', required: false },
    { key: 'revoked_at', type: 'datetime', required: false },
    { key: 'rate_limit_rpm', type: 'integer', required: true },
    { key: 'rate_limit_tpm', type: 'integer', required: true },
    { key: 'metadata', type: 'string', size: 4096, required: false },
  ],
  indexes: [
    { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
    { key: 'key_hash_unique', type: 'unique', attributes: ['key_hash'] },
    { key: 'status_idx', type: 'key', attributes: ['status'] },
    { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] },
  ],
};

async function ensureApiKeysCollection() {
  try {
    // If collection exists, ensure required attributes are present (self-heal)
    await databases.getCollection(APPWRITE_DATABASE_ID, API_KEYS_COLLECTION_ID);

    // Try creating any missing attributes gracefully.
    for (const attr of API_KEYS_COLLECTION_SCHEMA.attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            APPWRITE_DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            attr.key,
            attr.size || 255,
            Boolean(attr.required)
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            APPWRITE_DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            attr.key,
            Boolean(attr.required)
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            APPWRITE_DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            attr.key,
            Boolean(attr.required)
          );
        }
      } catch (e) {
        // Appwrite returns 409 when attribute already exists. Ignore that.
        if (Number(e?.code) === 409) {
          // already exists - fine
        } else {
          // Log but don't fail entire bootstrap; callers can choose to surface errors.
          // eslint-disable-next-line no-console
          console.warn('ensureApiKeysCollection: failed to create attribute', attr.key, e?.message || e);
        }
      }
    }

    return false;
  } catch (error) {
    if (Number(error?.code) !== 404) {
      throw error;
    }
  }

  // Collection missing - create fresh with attributes & indexes
  await databases.createCollection({
    databaseId: APPWRITE_DATABASE_ID,
    collectionId: API_KEYS_COLLECTION_ID,
    name: API_KEYS_COLLECTION_SCHEMA.name,
    permissions: [],
    documentSecurity: false,
    enabled: true,
    attributes: API_KEYS_COLLECTION_SCHEMA.attributes,
    indexes: API_KEYS_COLLECTION_SCHEMA.indexes,
  });

  return true;
}

export async function ensureApiKeyStorageReady() {
  if (!APPWRITE_DATABASE_ID || !API_KEYS_COLLECTION_ID) {
    throw new Error('Appwrite database or API key collection ID is not configured.');
  }

  return ensureApiKeysCollection();
}