import { Client, Databases, Storage, ID, Query, Permission, Role } from 'node-appwrite';

const appwriteEndpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    'https://cloud.appwrite.io/v1';

const appwriteProjectId =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    '';

const appwriteDatabaseId =
    process.env.APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    '';

const appwriteBucketId =
    process.env.APPWRITE_STORAGE_BUCKET_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ||
    'mainStorage';

const STORAGE_BUCKET_ALIAS_MAP = {
    mainStorage: process.env.APPWRITE_STORAGE_BUCKET_DOC_ID || '69a69b9c0009d1b683dd',
};

const resolvedBucketId = STORAGE_BUCKET_ALIAS_MAP[appwriteBucketId] || appwriteBucketId;

const client = new Client()
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProjectId)
    .setKey(process.env.APPWRITE_API_KEY || '');

export const databases = new Databases(client);
export const storage = new Storage(client);

export const DB_ID = appwriteDatabaseId;
export const BUCKET_ID = resolvedBucketId;

/**
 * Returns the public URL for a file stored in Appwrite Storage.
 * @param {string} fileId - The $id of the uploaded file.
 */
export function getFileUrl(fileId) {
    return `${appwriteEndpoint}/storage/buckets/${resolvedBucketId}/files/${fileId}/view?project=${appwriteProjectId}&mode=admin`;
}

export function createAppwriteFile(buffer, fileName, mimeType = 'application/octet-stream') {
    if (typeof File === 'undefined') {
        throw new Error('Global File API is not available in this Node runtime');
    }

    return new File([buffer], fileName, { type: mimeType });
}

export { ID, Query, Permission, Role };
