/**
 * Setup script to create conversation_memory collection in Appwrite
 * Run this once to initialize the collection with all required fields
 * Usage: node database/setup-memory-collection.mjs
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Client, Databases, ID } from 'node-appwrite';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env.local');
config({ path: envPath });

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'http://localhost/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'main';

if (!projectId || !apiKey) {
	console.error('❌ Error: APPWRITE_PROJECT_ID and APPWRITE_API_KEY environment variables are required');
	console.error('📝 Make sure your .env.local file contains both variables');
	console.error(`Read from: ${envPath}`);
	console.error(`projectId: ${projectId}, apiKey: ${apiKey ? 'SET' : 'NOT SET'}`);
	process.exit(1);
}

console.log('🚀 Starting Appwrite collection setup...');
console.log(`📍 Endpoint: ${endpoint}`);
console.log(`🗂️  Database: ${databaseId}`);

const client = new Client()
	.setEndpoint(endpoint)
	.setProject(projectId)
	.setKey(apiKey);

const databases = new Databases(client);

async function setupCollection() {
	try {
		const collectionId = 'conversation_memory';

		// Check if collection already exists
		console.log(`\n🔍 Checking if collection '${collectionId}' exists...`);
		let collection;
		try {
			collection = await databases.getCollection(databaseId, collectionId);
			console.log(`✅ Collection '${collectionId}' already exists!`);
		} catch (error) {
			if (error.code === 404) {
				console.log(`⚠️  Collection not found. Creating...`);
				collection = await databases.createCollection(
					databaseId,
					collectionId,
					collectionId,
					[],
					true // Enabled
				);
				console.log(`✅ Collection created: ${collection.$id}`);
			} else {
				throw error;
			}
		}

		// Create attributes (fields)
		console.log(`\n📋 Creating attributes...`);

		const attributes = [
			{
				name: 'userEmail',
				type: 'string',
				size: 255,
				required: true,
				description: "User's email address"
			},
			{
				name: 'libId',
				type: 'string',
				size: 255,
				required: true,
				description: 'Reference to search/research session ID'
			},
			{
				name: 'fullTranscript',
				type: 'string',
				size: 1000000,
				required: true,
				description: 'Complete conversation as JSON string'
			},
			{
				name: 'summary',
				type: 'string',
				size: 500000,
				required: true,
				description: 'AI-extracted summary as JSON string'
			},
			{
				name: 'conversationType',
				type: 'string',
				size: 50,
				required: true,
				description: 'Either "search" or "research"'
			},
			{
				name: 'includedInContext',
				type: 'boolean',
				required: true,
				description: 'Whether memory is used in prompts'
			},
			{
				name: 'createdAt',
				type: 'string',
				size: 255,
				required: true,
				description: 'ISO timestamp when conversation was saved'
			}
		];

		for (const attr of attributes) {
			try {
				await databases.createStringAttribute(
					databaseId,
					collectionId,
					attr.name,
					attr.size,
					attr.required
				);
				console.log(`  ✅ Created attribute: ${attr.name} (${attr.description})`);
			} catch (error) {
				if (error.code === 400 && error.message.includes('already exists')) {
					console.log(`  ⚠️  Skipping: ${attr.name} (already exists)`);
				} else if (attr.type === 'boolean') {
					// Try boolean type
					try {
						await databases.createBooleanAttribute(
							databaseId,
							collectionId,
							attr.name,
							attr.required
						);
						console.log(`  ✅ Created attribute: ${attr.name} (${attr.description})`);
					} catch (boolError) {
						console.error(`  ❌ Failed to create ${attr.name}:`, boolError.message);
					}
				} else {
					console.error(`  ❌ Failed to create ${attr.name}:`, error.message);
				}
			}
		}

		// Create indexes
		console.log(`\n🏗️  Creating indexes...`);

		// Wait a moment for attributes to be ready
		await new Promise(resolve => setTimeout(resolve, 2000));

		try {
			await databases.createIndex(
				databaseId,
				collectionId,
				'idx_userEmail_createdAt',
				'key',
				['userEmail', 'createdAt'],
				['ASC', 'DESC']
			);
			console.log(`  ✅ Created index: idx_userEmail_createdAt`);
		} catch (error) {
			console.warn(`  ⚠️  Could not create composite index:`, error.message);
		}

		try {
			await databases.createIndex(
				databaseId,
				collectionId,
				'idx_libId',
				'key',
				['libId'],
				['ASC']
			);
			console.log(`  ✅ Created index: idx_libId`);
		} catch (error) {
			console.warn(`  ⚠️  Could not create libId index:`, error.message);
		}

		try {
			await databases.createIndex(
				databaseId,
				collectionId,
				'idx_userEmail',
				'key',
				['userEmail'],
				['ASC']
			);
			console.log(`  ✅ Created index: idx_userEmail`);
		} catch (error) {
			console.warn(`  ⚠️  Could not create userEmail index:`, error.message);
		}

		console.log(`\n✨ Setup completed successfully!`);
		console.log(`\nCollection 'conversation_memory' is ready to use.`);
		console.log(`Fields created: userEmail, libId, fullTranscript, summary, conversationType, includedInContext, createdAt`);
		console.log(`Indexes created: idx_userEmail_createdAt, idx_libId, idx_userEmail`);

	} catch (error) {
		console.error('\n❌ Setup failed:', error.message);
		if (error.response) {
			console.error('Response:', error.response);
		}
		process.exit(1);
	}
}

setupCollection();
