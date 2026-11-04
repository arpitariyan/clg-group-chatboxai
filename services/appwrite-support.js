import { Client, Databases, Storage, ID, Query } from 'node-appwrite';

const SUPPORT_ENDPOINT = process.env.NEXT_PUBLIC_SUPPORT_APPWRITE_ENDPOINT;
const SUPPORT_PROJECT_ID = process.env.NEXT_PUBLIC_SUPPORT_APPWRITE_PROJECT_ID;
const SUPPORT_API_KEY = process.env.SUPPORT_APPWRITE_API_KEY;
const SUPPORT_DB_ID = process.env.NEXT_PUBLIC_SUPPORT_APPWRITE_DB_ID;
const SUPPORT_COLLECTION_ID = 'support_messages';

const SUPPORT_CONVERSATIONS_COLLECTION_ID = 'support_conversations';

// Server-side admin client with API key
function getAdminClient() {
    return new Client()
        .setEndpoint(SUPPORT_ENDPOINT)
        .setProject(SUPPORT_PROJECT_ID)
        .setKey(SUPPORT_API_KEY);
}

export const supportDatabases = new Databases(getAdminClient());
export { getAdminClient, ID, Query, SUPPORT_DB_ID, SUPPORT_COLLECTION_ID, SUPPORT_CONVERSATIONS_COLLECTION_ID };
