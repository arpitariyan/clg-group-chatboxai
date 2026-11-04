/**
 * Migration: Add signup_verified attribute to Users collection
 *
 * This script:
 * 1. Adds the `signup_verified` Boolean attribute (default: false) to the Users collection.
 * 2. Marks ALL existing users as signup_verified = true so they are NOT locked out.
 *    Only brand-new users created after this migration will start as unverified.
 *
 * Usage:
 *   node scripts/setup_signup_verification.mjs
 *
 * Prerequisites:
 *   - Set your Appwrite env vars in .env or .env.local before running.
 */

import 'dotenv/config';
import { Client, Databases, Query } from 'node-appwrite';

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  'main';
const usersCollectionId =
  process.env.APPWRITE_USERS_COLLECTION_ID || 'users';
const mfaOtpsCollectionId =
  process.env.APPWRITE_MFA_OTPS_COLLECTION_ID || 'mfa_otps';

if (!projectId || !apiKey) {
  console.error(
    'Error: APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID) and APPWRITE_API_KEY are required.'
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const db = new Databases(client);

async function addAttribute() {
  console.log('Step 1: Adding signup_verified attribute to Users collection...');
  try {
    await db.createBooleanAttribute(
      databaseId,
      usersCollectionId,
      'signup_verified',
      false,   // required = false
      false    // default = false
    );
    console.log('  ✓ signup_verified attribute created (default: false).');
    await new Promise((r) => setTimeout(r, 3000));
  } catch (err) {
    if (err?.message?.toLowerCase().includes('already exists') || err?.code === 409) {
      console.log('  ℹ signup_verified attribute already exists — skipping creation.');
    } else {
      console.error('  ✗ Failed to create signup_verified attribute:', err.message);
    }
  }
}

async function addAttemptCountAttribute() {
  console.log('\nStep 1.5: Adding attempt_count attribute to mfa_otps collection...');
  try {
    await db.createIntegerAttribute(
      databaseId,
      mfaOtpsCollectionId,
      'attempt_count',
      false, // required = false
      0,     // min
      100,   // max
      0      // default = 0
    );
    console.log('  ✓ attempt_count attribute created (default: 0).');
    await new Promise((r) => setTimeout(r, 3000));
  } catch (err) {
    if (err?.message?.toLowerCase().includes('already exists') || err?.code === 409) {
      console.log('  ℹ attempt_count attribute already exists — skipping creation.');
    } else {
      console.error('  ✗ Failed to create attempt_count attribute:', err.message);
    }
  }
}

async function backfillExistingUsers() {
  console.log('\nStep 2: Marking all existing users as signup_verified = true...');

  let offset = 0;
  const pageSize = 25;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let hasMore = true;

  while (hasMore) {
    let result;
    try {
      result = await db.listDocuments(databaseId, usersCollectionId, [
        Query.limit(pageSize),
        Query.offset(offset),
      ]);
    } catch (err) {
      console.error(`  ✗ Failed to fetch users at offset ${offset}:`, err.message);
      break;
    }

    console.log(`  Fetching batch at offset ${offset}... (${result.documents.length} docs)`);

    for (const doc of result.documents) {
      totalProcessed++;

      if (doc.signup_verified === true) {
        totalSkipped++;
        continue;
      }

      try {
        await db.updateDocument(databaseId, usersCollectionId, doc.$id, {
          signup_verified: true,
        });
        totalUpdated++;
        if (totalUpdated % 10 === 0) {
          console.log(`  ... updated ${totalUpdated} users so far`);
        }
      } catch (updateErr) {
        console.error(
          `  ✗ Failed to update user ${doc.email || doc.$id}:`,
          updateErr.message
        );
      }
    }

    if (result.documents.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  console.log('\n✓ Backfill complete!');
  console.log(`  Total processed : ${totalProcessed}`);
  console.log(`  Updated         : ${totalUpdated}`);
  console.log(`  Already verified: ${totalSkipped}`);
}

async function run() {
  console.log('=== Chatbox AI — Signup Verification Migration ===');
  console.log(`  Endpoint   : ${endpoint}`);
  console.log(`  Database   : ${databaseId}`);
  console.log(`  Collection : ${usersCollectionId}\n`);

  await addAttribute();
  await addAttemptCountAttribute();
  await backfillExistingUsers();

  console.log(
    '\nMigration finished. New users will start with signup_verified = false'
  );
  console.log(
    'and must complete email OTP verification before accessing the app.\n'
  );
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
