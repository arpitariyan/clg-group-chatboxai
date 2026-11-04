/**
 * Migration: Add memory_enabled field to user profiles
 * This script adds the memory_enabled field (default: true) to all existing users
 * 
 * Usage: node database/add_memory_settings_migration.mjs
 */

import { Client, Users, Databases } from 'node-appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://localhost/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'main';
const usersCollectionId = process.env.APPWRITE_USERS_COLLECTION_ID || 'users';

if (!projectId || !apiKey) {
	console.error('Error: NEXT_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY environment variables are required');
	process.exit(1);
}

const client = new Client()
	.setEndpoint(endpoint)
	.setProject(projectId)
	.setKey(apiKey);

const db = new Databases(client);

async function runMigration() {
	try {
		console.log('Starting migration: add_memory_settings...');
		console.log(`Database: ${databaseId}, Collection: ${usersCollectionId}`);

		// Fetch all user documents
		let offset = 0;
		let totalProcessed = 0;
		let totalUpdated = 0;
		const pageSize = 25;

		let hasMore = true;
		while (hasMore) {
			const result = await db.listDocuments(databaseId, usersCollectionId, [
				undefined,
				pageSize,
				offset,
			]);

			console.log(`\nFetching batch at offset ${offset}...`);
			console.log(`Found ${result.documents.length} documents`);

			for (const doc of result.documents) {
				totalProcessed++;

				// Check if memory_enabled already exists
				if (doc.memory_enabled !== undefined && doc.memory_enabled !== null) {
					console.log(`✓ User ${doc.email} already has memory_enabled set to ${doc.memory_enabled}`);
					continue;
				}

				try {
					// Add memory_enabled field
					await db.updateDocument(databaseId, usersCollectionId, doc.$id, {
						memory_enabled: true,
					});

					console.log(`✓ Updated user ${doc.email || doc.$id} - memory_enabled: true`);
					totalUpdated++;
				} catch (error) {
					console.error(`✗ Failed to update user ${doc.email || doc.$id}:`, error.message);
				}
			}

			// Check if there are more documents
			if (result.documents.length < pageSize) {
				hasMore = false;
			} else {
				offset += pageSize;
			}
		}

		console.log(`\n✓ Migration completed successfully!`);
		console.log(`Total processed: ${totalProcessed}`);
		console.log(`Total updated: ${totalUpdated}`);
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	}
}

runMigration();
