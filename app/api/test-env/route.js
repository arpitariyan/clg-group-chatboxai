import { NextResponse } from 'next/server';
import { APPWRITE_COLLECTIONS, isPlaceholderCollectionId } from '@/services/appwrite-collections';

export async function GET() {
  try {
    const collectionEnvHealth = APPWRITE_COLLECTIONS.map((collection) => ({
      key: collection.key,
      configured: !!collection.id,
      placeholder: isPlaceholderCollectionId(collection.id),
    }));

    const envCheck = {
      RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      NEXT_PUBLIC_RAZORPAY_KEY_ID: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      APPWRITE_PROJECT_ID: !!process.env.APPWRITE_PROJECT_ID,
      APPWRITE_API_KEY: !!process.env.APPWRITE_API_KEY,
      APPWRITE_DATABASE_ID: !!process.env.APPWRITE_DATABASE_ID,
      APPWRITE_STORAGE_BUCKET_ID: !!process.env.APPWRITE_STORAGE_BUCKET_ID,
      APPWRITE_ENDPOINT: !!process.env.APPWRITE_ENDPOINT,
      NODE_ENV: process.env.NODE_ENV
    };

    const unresolvedCollections = collectionEnvHealth.filter(
      (item) => !item.configured || item.placeholder
    );

    return NextResponse.json({
      success: unresolvedCollections.length === 0,
      environment: envCheck,
      collections: {
        total: collectionEnvHealth.length,
        unresolved: unresolvedCollections.length,
        details: collectionEnvHealth,
      },
      nextStep: 'Run /api/test-db for live Appwrite connectivity checks'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check environment variables', details: error.message },
      { status: 500 }
    );
  }
}