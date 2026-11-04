#!/usr/bin/env node

/**
 * Migration: Add async generation fields to website_projects collection
 * 
 * New fields for Phase 3-4 implementation:
 * - status: 'queued' | 'generating' | 'success' | 'error' (tracks async job status)
 * - generation_step: Current step in pipeline (e.g., "Building: Header Component")
 * - sandbox_id: e2b sandbox ID for persistent sandboxes
 * - sandbox_url: Exposed sandbox URL for iframe preview
 * - designSpec: JSON design specifications extracted from screenshot
 * 
 * Usage: node database/async-generation-migration.mjs
 */

import { Client, Databases, Query } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

const DB_ID = process.env.APPWRITE_DATABASE_ID || 'database';
const WEBSITE_PROJECTS_COLLECTION_ID = process.env.APPWRITE_WEBSITE_PROJECTS_COLLECTION_ID || 'website_projects';

async function updateExistingDocuments() {
  console.log('📋 Fetching existing website_projects documents...');
  
  try {
    // Fetch all documents in batches
    let hasMore = true;
    let offset = 0;
    const batchSize = 25;
    let updatedCount = 0;

    while (hasMore) {
      const response = await databases.listDocuments(
        DB_ID,
        WEBSITE_PROJECTS_COLLECTION_ID,
        [Query.limit(batchSize), Query.offset(offset)]
      );

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`\n📦 Processing batch (offset: ${offset}, count: ${response.documents.length})`);

      for (const doc of response.documents) {
        try {
          // Prepare update with new fields
          const updatePayload = {
            status: doc.status || 'success', // Default existing docs to success
            generation_step: doc.generation_step || 'Complete',
            sandbox_id: doc.sandbox_id || null,
            sandbox_url: doc.sandbox_url || null,
            designSpec: doc.designSpec || null,
          };

          // Update the document
          await databases.updateDocument(
            DB_ID,
            WEBSITE_PROJECTS_COLLECTION_ID,
            doc.$id,
            updatePayload
          );

          updatedCount++;
          console.log(`  ✅ Updated: ${doc.name || doc.project_name || doc.$id}`);
        } catch (docError) {
          console.error(`  ❌ Failed to update ${doc.$id}:`, docError.message);
        }
      }

      offset += batchSize;
    }

    console.log(`\n✨ Migration complete! Updated ${updatedCount} documents.`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting async generation migration...\n');

  // Verify connection
  try {
    const databases_check = new Databases(client);
    console.log('✅ Connected to Appwrite');
  } catch (error) {
    console.error('❌ Failed to connect to Appwrite:', error.message);
    process.exit(1);
  }

  // Run migration
  await updateExistingDocuments();

  console.log('\n🎉 All done!');
}

main();
