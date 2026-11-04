import { supportDatabases, SUPPORT_DB_ID, SUPPORT_COLLECTION_ID, getAdminClient } from '../services/appwrite-support.js';

export const SUPPORT_CONVERSATIONS_COLLECTION_ID = 'support_conversations';

const CONVERSATIONS_SCHEMA = {
  name: 'Support Conversations',
  attributes: [
    { key: 'userEmail', type: 'string', size: 255, required: true },
    { key: 'status', type: 'string', size: 64, required: true }, // 'open', 'closed'
    { key: 'topic', type: 'string', size: 255, required: true },
    { key: 'createdAt', type: 'datetime', required: true },
    { key: 'updatedAt', type: 'datetime', required: true },
    { key: 'hasUnreadMessages', type: 'boolean', required: false },
  ],
  indexes: [
    { key: 'userEmail_idx', type: 'key', attributes: ['userEmail'] },
    { key: 'status_idx', type: 'key', attributes: ['status'] },
    { key: 'updatedAt_idx', type: 'key', attributes: ['updatedAt'], orders: ['DESC'] },
  ],
};

const MESSAGES_SCHEMA_ADDITIONS = [
  { key: 'conversationId', type: 'string', size: 255, required: false }, // Optional for backward compatibility
  { key: 'isRead', type: 'boolean', required: false },
  { key: 'imageUrl', type: 'string', size: 2048, required: false },
];

export const SUPPORT_BUCKET_ID = 'support_images';

async function ensureCollection(collectionId, schema) {
  try {
    await supportDatabases.getCollection(SUPPORT_DB_ID, collectionId);
    return false;
  } catch (error) {
    if (Number(error?.code) !== 404) {
      throw error;
    }
  }

  await supportDatabases.createCollection(
    SUPPORT_DB_ID,
    collectionId,
    schema.name
  );

  for (const attr of schema.attributes) {
    if (attr.type === 'string') {
      await supportDatabases.createStringAttribute(SUPPORT_DB_ID, collectionId, attr.key, attr.size, attr.required);
    } else if (attr.type === 'datetime') {
      await supportDatabases.createDatetimeAttribute(SUPPORT_DB_ID, collectionId, attr.key, attr.required);
    } else if (attr.type === 'boolean') {
      await supportDatabases.createBooleanAttribute(SUPPORT_DB_ID, collectionId, attr.key, attr.required);
    }
  }

  // Wait for attributes to be available before creating indexes
  await new Promise(resolve => setTimeout(resolve, 3000));

  for (const idx of schema.indexes) {
    try {
      await supportDatabases.createIndex(
        SUPPORT_DB_ID,
        collectionId,
        idx.key,
        idx.type,
        idx.attributes,
        idx.orders || []
      );
    } catch (e) {
      console.warn(`Could not create index ${idx.key}:`, e.message);
    }
  }

  return true;
}

export async function ensureSupportCollectionsReady() {
  if (!SUPPORT_DB_ID) {
    throw new Error('Appwrite Support database ID not configured.');
  }

  console.log('Ensuring Support Conversations collection exists...');
  await ensureCollection(SUPPORT_CONVERSATIONS_COLLECTION_ID, CONVERSATIONS_SCHEMA);
  
  console.log('Ensuring Support Messages has required attributes...');
  // Add new attributes to the existing messages collection if they don't exist
  for (const attr of MESSAGES_SCHEMA_ADDITIONS) {
    try {
      if (attr.type === 'string') {
        await supportDatabases.createStringAttribute(SUPPORT_DB_ID, SUPPORT_COLLECTION_ID, attr.key, attr.size, attr.required);
      } else if (attr.type === 'boolean') {
        await supportDatabases.createBooleanAttribute(SUPPORT_DB_ID, SUPPORT_COLLECTION_ID, attr.key, attr.required);
      }
    } catch (e) {
      // Ignored if already exists
    }
  }
}
