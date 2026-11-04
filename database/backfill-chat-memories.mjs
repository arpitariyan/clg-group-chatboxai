/**
 * Backfill script to convert existing chat history to memory
 * Analyzes past conversations and saves them as memories
 * Usage: node database/backfill-chat-memories.mjs
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Client, Databases, Query, ID } from 'node-appwrite';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env.local');
config({ path: envPath });

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || '69a6aeff003b4922f883';
const geminiApiKey = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;

const libraryCollId = 'library';
const chatsCollId = 'chats';
const memoryCollId = 'conversation_memory';

if (!projectId || !apiKey) {
	console.error('❌ Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY');
	process.exit(1);
}

if (!geminiApiKey) {
	console.error('❌ Missing GOOGLE_AI_KEY or GEMINI_API_KEY for summarization');
	process.exit(1);
}

const client = new Client()
	.setEndpoint(endpoint)
	.setProject(projectId)
	.setKey(apiKey);

const db = new Databases(client);
const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Extract summary from conversations using Gemini
 */
async function extractSummary(chats, libMetadata) {
	try {
		const conversationText = chats
			.map((chat, idx) => `Q${idx + 1}: ${chat.userSearchInput}\nA${idx + 1}: ${chat.aiResp}`)
			.join('\n---\n');

		const prompt = `Analyze this conversation and extract key information in JSON format:

Conversation:
${conversationText}

Return ONLY valid JSON with these exact fields:
{
  "topic": "main topic discussed (max 50 chars)",
  "intent": "information_gathering|decision_making|learning|problem_solving|research",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "questionsAsked": ["q1", "q2"],
  "mainTopic": "primary subject (max 100 chars)"
}

Return ONLY JSON, no markdown, no code blocks.`;

		const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
		const result = await model.generateContent(prompt);
		const responseText = result.response.text().trim();

		const summary = JSON.parse(responseText);
		return {
			topic: summary.topic || libMetadata?.searchInput || 'Conversation',
			intent: summary.intent || 'information_gathering',
			keyFindings: Array.isArray(summary.keyFindings) ? summary.keyFindings.slice(0, 5) : [],
			questionsAsked: Array.isArray(summary.questionsAsked) ? summary.questionsAsked.slice(0, 5) : [],
			mainTopic: summary.mainTopic || libMetadata?.searchInput || '',
		};
	} catch (error) {
		console.warn('⚠️  Summary extraction failed, using basic summary:', error.message);
		return {
			topic: libMetadata?.searchInput || 'Conversation',
			intent: 'information_gathering',
			keyFindings: [],
			questionsAsked: [],
			mainTopic: libMetadata?.searchInput || '',
		};
	}
}

/**
 * Get all library entries (search/research sessions)
 */
async function getAllLibraryEntries() {
	try {
		let allDocs = [];
		let offset = 0;
		const pageSize = 25;
		let hasMore = true;

		while (hasMore) {
			const result = await db.listDocuments(databaseId, libraryCollId, [
				Query.limit(pageSize),
				Query.offset(offset),
			]);

			allDocs = allDocs.concat(result.documents || []);
			hasMore = (result.documents || []).length === pageSize;
			offset += pageSize;
		}

		return allDocs;
	} catch (error) {
		console.error('Error fetching library entries:', error.message);
		return [];
	}
}

/**
 * Get chats for a specific libId
 */
async function getChatsForLibId(libId) {
	try {
		const result = await db.listDocuments(databaseId, chatsCollId, [
			Query.equal('libId', libId),
			Query.limit(100),
		]);
		return result.documents || [];
	} catch (error) {
		console.error(`Error fetching chats for libId ${libId}:`, error.message);
		return [];
	}
}

/**
 * Check if memory already exists for a libId
 */
async function memoryExists(libId) {
	try {
		const result = await db.listDocuments(databaseId, memoryCollId, [
			Query.equal('libId', libId),
			Query.limit(1),
		]);
		return (result.documents || []).length > 0;
	} catch (error) {
		return false;
	}
}

/**
 * Save memory to database
 */
async function saveMemory(libId, userEmail, transcript, summary, type, createdAt) {
	try {
		await db.createDocument(
			databaseId,
			memoryCollId,
			ID.unique(),
			{
				libId,
				userEmail,
				fullTranscript: JSON.stringify(transcript),
				summary: JSON.stringify(summary),
				conversationType: type || 'search',
				includedInContext: true,
				createdAt: createdAt || new Date().toISOString(),
			}
		);
		return true;
	} catch (error) {
		console.error('Error saving memory:', error.message);
		return false;
	}
}

/**
 * Main backfill function
 */
async function backfillMemories() {
	console.log('🚀 Starting chat history backfill...\n');

	const libraryEntries = await getAllLibraryEntries();
	console.log(`📚 Found ${libraryEntries.length} search/research sessions\n`);

	if (libraryEntries.length === 0) {
		console.log('ℹ️  No chat history found to backfill');
		return;
	}

	let processed = 0;
	let skipped = 0;
	let failed = 0;

	for (let i = 0; i < libraryEntries.length; i++) {
		const lib = libraryEntries[i];
		const libId = lib.libId || lib.$id;
		const userEmail = lib.userEmail || 'unknown@example.com';

		console.log(`\n[${i + 1}/${libraryEntries.length}] Processing ${libId}`);

		// Check if memory already exists
		const exists = await memoryExists(libId);
		if (exists) {
			console.log(`  ⏭️  Skipped (memory already exists)`);
			skipped++;
			continue;
		}

		// Fetch chats for this library
		const chats = await getChatsForLibId(libId);
		if (chats.length === 0) {
			console.log(`  ⏭️  Skipped (no chats found)`);
			skipped++;
			continue;
		}

		console.log(`  📝 Found ${chats.length} chats, user: ${userEmail}`);

		// Extract summary
		const summary = await extractSummary(chats, {
			searchInput: lib.searchInput || '',
			type: lib.type || 'search',
		});

		// Save memory
		const saved = await saveMemory(
			libId,
			userEmail,
			chats,
			summary,
			lib.type || 'search',
			lib.created_at || lib.createdAt
		);

		if (saved) {
			console.log(`  ✅ Memory saved`);
			console.log(`     Topic: "${summary.topic}"`);
			console.log(`     Findings: ${summary.keyFindings.length}`);
			processed++;
		} else {
			console.log(`  ❌ Failed to save memory`);
			failed++;
		}

		// Rate limiting - wait 2 seconds between saves
		await new Promise(resolve => setTimeout(resolve, 2000));
	}

	console.log(`\n✨ Backfill completed!\n`);
	console.log(`📊 Results:`);
	console.log(`   ✅ Processed: ${processed}`);
	console.log(`   ⏭️  Skipped: ${skipped}`);
	console.log(`   ❌ Failed: ${failed}`);
	console.log(`   📈 Total: ${libraryEntries.length}`);
	console.log(`\n✨ All past conversations are now in memory!`);
}

backfillMemories().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
