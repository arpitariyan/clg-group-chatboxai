import { Client, Databases, Storage, ID, Query } from 'appwrite';

const SUPPORT_ENDPOINT = process.env.NEXT_PUBLIC_SUPPORT_APPWRITE_ENDPOINT;
const SUPPORT_PROJECT_ID = process.env.NEXT_PUBLIC_SUPPORT_APPWRITE_PROJECT_ID;
export const SUPPORT_DB_ID = process.env.NEXT_PUBLIC_SUPPORT_APPWRITE_DB_ID;
export const SUPPORT_COLLECTION_ID = 'support_messages';
export const SUPPORT_SESSIONS_COLLECTION_ID = 'support_sessions';
export const SUPPORT_CONVERSATIONS_COLLECTION_ID = 'support_conversations';
export const SUPPORT_BUCKET_ID = '6a69b7d400000ae278b9';

const client = new Client()
    .setEndpoint(SUPPORT_ENDPOINT)
    .setProject(SUPPORT_PROJECT_ID);

export const supportDatabases = new Databases(client);
export const supportStorage = new Storage(client);
export { client as supportClient, ID, Query };