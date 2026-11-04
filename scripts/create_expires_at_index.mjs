import 'dotenv/config';
import { Client, Databases } from 'node-appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'main';
const mfaOtpsCollectionId = process.env.APPWRITE_MFA_OTPS_COLLECTION_ID || 'mfa_otps';

if (!projectId || !apiKey) {
  console.error('Error: APPWRITE_PROJECT_ID and APPWRITE_API_KEY are required.');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new Databases(client);

async function createIndex() {
  console.log(`Creating index on 'expires_at' for collection: ${mfaOtpsCollectionId}`);
  try {
    await db.createIndex(
      databaseId,
      mfaOtpsCollectionId,
      'expires_at_idx',
      'key',
      ['expires_at'],
      ['ASC']
    );
    console.log('✓ Index created successfully!');
  } catch (err) {
    if (err?.message?.toLowerCase().includes('already exists') || err?.code === 409) {
      console.log('ℹ Index already exists — skipping.');
    } else {
      console.error('✗ Failed to create index:', err.message);
    }
  }
}

createIndex();
