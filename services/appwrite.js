import { Client, Databases, Storage, ID, Query } from 'appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const databases = new Databases(client);
export const storage = new Storage(client);

export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
const configuredBucketId = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || process.env.APPWRITE_STORAGE_BUCKET_ID || 'mainStorage';
const STORAGE_BUCKET_ALIAS_MAP = {
    mainStorage: process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_DOC_ID || process.env.APPWRITE_STORAGE_BUCKET_DOC_ID || '69a69b9c0009d1b683dd',
};

export const BUCKET_ID = STORAGE_BUCKET_ALIAS_MAP[configuredBucketId] || configuredBucketId;

/**
 * Returns the public URL for a file stored in Appwrite Storage.
 * @param {string} fileId - The $id of the uploaded file.
 */
export function getFileUrl(fileId) {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
    const bucketId = BUCKET_ID;
    return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
}

export { ID, Query };
