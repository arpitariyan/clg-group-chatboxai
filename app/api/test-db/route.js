import { NextResponse } from 'next/server';
import { databases, storage, DB_ID, BUCKET_ID, Query } from '@/services/appwrite-admin';
import { APPWRITE_COLLECTIONS, isPlaceholderCollectionId } from '@/services/appwrite-collections';

const hasValue = (value) => Boolean(value && String(value).trim());

export async function GET() {
  try {
    const baseChecks = {
      endpointConfigured: hasValue(process.env.APPWRITE_ENDPOINT),
      projectConfigured: hasValue(process.env.APPWRITE_PROJECT_ID),
      apiKeyConfigured: hasValue(process.env.APPWRITE_API_KEY),
      databaseConfigured: hasValue(DB_ID),
      bucketConfigured: hasValue(BUCKET_ID),
    };

    const hasCriticalEnv = Object.values(baseChecks).every(Boolean);
    if (!hasCriticalEnv) {
      return NextResponse.json(
        {
          success: false,
          summary: {
            totalChecks: Object.keys(baseChecks).length,
            passedChecks: Object.values(baseChecks).filter(Boolean).length,
            failedChecks: Object.values(baseChecks).filter((value) => !value).length,
          },
          checks: {
            base: baseChecks,
            collections: [],
            storage: { success: false, details: 'Skipped due to missing base environment values' },
          },
          message: 'Missing required Appwrite environment variables',
        },
        { status: 500 }
      );
    }

    const [dbResult, storageResult] = await Promise.all([
      databases.listCollections(DB_ID),
      storage.listFiles(BUCKET_ID, [Query.limit(1)]),
    ]);

    const collectionChecks = await Promise.all(
      APPWRITE_COLLECTIONS.map(async (collection) => {
        if (!hasValue(collection.id) || isPlaceholderCollectionId(collection.id)) {
          return {
            key: collection.key,
            id: collection.id,
            success: false,
            details: 'Collection ID is missing or still set to placeholder value',
          };
        }

        try {
          await databases.listDocuments(DB_ID, collection.id, [Query.limit(1)]);
          return {
            key: collection.key,
            id: collection.id,
            success: true,
            details: 'Reachable',
          };
        } catch (error) {
          return {
            key: collection.key,
            id: collection.id,
            success: false,
            details: error?.message || 'Unknown collection access error',
          };
        }
      })
    );

    const baseCheckResults = {
      endpointConfigured: { success: true },
      projectConfigured: { success: true },
      apiKeyConfigured: { success: true },
      databaseConfigured: { success: true },
      bucketConfigured: { success: true },
      databaseReachable: {
        success: Array.isArray(dbResult?.collections),
        details: Array.isArray(dbResult?.collections)
          ? `Database reachable, collections visible: ${dbResult.collections.length}`
          : 'Unable to read database collections',
      },
      storageReachable: {
        success: Array.isArray(storageResult?.files),
        details: Array.isArray(storageResult?.files)
          ? `Storage bucket reachable, sampled files: ${storageResult.files.length}`
          : 'Unable to read storage files',
      },
    };

    const allChecks = [
      ...Object.values(baseCheckResults).map((item) => item.success),
      ...collectionChecks.map((item) => item.success),
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    const failedChecks = allChecks.length - passedChecks;
    const success = failedChecks === 0;

    return NextResponse.json(
      {
        success,
        summary: {
          totalChecks: allChecks.length,
          passedChecks,
          failedChecks,
        },
        checks: {
          base: baseCheckResults,
          collections: collectionChecks,
          storage: baseCheckResults.storageReachable,
        },
      },
      { status: success ? 200 : 500 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run Appwrite diagnostics',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}