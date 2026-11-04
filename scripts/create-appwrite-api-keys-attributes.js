import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_API_KEYS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_API_KEYS_COLLECTION_ID || 'api_keys';

async function main() {
  try {
    console.log(`Ensuring encrypted attributes for database ${databaseId}, collection ${collectionId}...`);

    try {
      await databases.createStringAttribute(databaseId, collectionId, 'encrypted_key', 2048, false);
      console.log('Created encrypted_key attribute');
    } catch (e) {
      if (Number(e?.code) === 409) console.log('encrypted_key already exists');
      else console.error('Failed to create encrypted_key:', e.message || e);
    }

    try {
      await databases.createStringAttribute(databaseId, collectionId, 'encrypted_key_iv', 64, false);
      console.log('Created encrypted_key_iv attribute');
    } catch (e) {
      if (Number(e?.code) === 409) console.log('encrypted_key_iv already exists');
      else console.error('Failed to create encrypted_key_iv:', e.message || e);
    }

    try {
      await databases.createStringAttribute(databaseId, collectionId, 'encrypted_key_tag', 64, false);
      console.log('Created encrypted_key_tag attribute');
    } catch (e) {
      if (Number(e?.code) === 409) console.log('encrypted_key_tag already exists');
      else console.error('Failed to create encrypted_key_tag:', e.message || e);
    }

    console.log('Done ensuring attributes.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
