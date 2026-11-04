import { Client, Databases, Query, ID } from 'node-appwrite';
import { CONVERSATION_MEMORY_COLLECTION_ID, APPWRITE_DATABASE_ID } from './appwrite-collections.js';

let client = null;
let db = null;

function initializeAppwrite() {
	if (!client) {
		client = new Client()
			.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
			.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
			.setKey(process.env.APPWRITE_API_KEY);

		db = new Databases(client);
	}
	return db;
}

/**
 * Save a conversation to memory
 * @param {Object} memoryData - { userEmail, libId, fullTranscript, summary, conversationType }
 * @returns {Promise<Object>} Saved memory document
 */
export async function saveConversationMemory(memoryData) {
	try {
		const database = initializeAppwrite();

		const document = {
			userEmail: memoryData.userEmail,
			libId: memoryData.libId,
			fullTranscript: JSON.stringify(memoryData.fullTranscript),
			summary: JSON.stringify(memoryData.summary),
			conversationType: memoryData.conversationType || 'search',
			includedInContext: true,
			createdAt: new Date().toISOString(),
		};

		const result = await database.createDocument(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			ID.unique(),
			document
		);

		return result;
	} catch (error) {
		console.error('Error saving conversation memory:', error);
		throw error;
	}
}

/**
 * Get all memories for a user
 * @param {String} userEmail - User's email
 * @param {Number} limit - Number of records to fetch (default: 50)
 * @param {Number} offset - Pagination offset (default: 0)
 * @returns {Promise<Object>} { total, memories: [...] }
 */
export async function getUserMemories(userEmail, limit = 50, offset = 0) {
	try {
		const database = initializeAppwrite();

		const result = await database.listDocuments(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			[
				Query.equal('userEmail', userEmail),
				Query.orderDesc('createdAt'),
				Query.limit(limit),
				Query.offset(offset),
			]
		);

		// Parse summary JSON
		const memories = result.documents.map(doc => ({
			...doc,
			summary: doc.summary ? JSON.parse(doc.summary) : {},
			fullTranscript: doc.fullTranscript ? JSON.parse(doc.fullTranscript) : [],
		}));

		return {
			total: result.total,
			memories,
		};
	} catch (error) {
		console.error('Error fetching user memories:', error);
		throw error;
	}
}

/**
 * Get active memories for a user (only those included in context)
 * @param {String} userEmail - User's email
 * @returns {Promise<Array>} Array of active memory objects
 */
export async function getActiveUserMemories(userEmail) {
	try {
		const database = initializeAppwrite();

		const result = await database.listDocuments(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			[
				Query.equal('userEmail', userEmail),
				Query.equal('includedInContext', true),
				Query.orderDesc('createdAt'),
				Query.limit(100), // Get up to 100 active memories
			]
		);

		// Parse summary JSON
		const memories = result.documents.map(doc => ({
			...doc,
			summary: doc.summary ? JSON.parse(doc.summary) : {},
		}));

		return memories;
	} catch (error) {
		console.error('Error fetching active memories:', error);
		throw error;
	}
}

/**
 * Fetch a single memory document by id, or null if it does not exist.
 * Used by the [memoryId] route to enforce ownership before mutating.
 * @param {String} memoryId
 * @returns {Promise<Object|null>}
 */
export async function getMemoryById(memoryId) {
	try {
		const database = initializeAppwrite();
		return await database.getDocument(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			memoryId
		);
	} catch (error) {
		if (error?.code === 404 || error?.response?.code === 404) return null;
		throw error;
	}
}

/**
 * Toggle memory inclusion in context
 * @param {String} memoryId - Memory document ID
 * @param {Boolean} includedInContext - Whether to include in context
 * @returns {Promise<Object>} Updated memory document
 */
export async function toggleMemoryInclusion(memoryId, includedInContext) {
	try {
		const database = initializeAppwrite();

		const result = await database.updateDocument(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			memoryId,
			{ includedInContext }
		);

		return result;
	} catch (error) {
		console.error('Error toggling memory inclusion:', error);
		throw error;
	}
}

/**
 * Delete a specific memory
 * @param {String} memoryId - Memory document ID
 * @returns {Promise<void>}
 */
export async function deleteMemory(memoryId) {
	try {
		const database = initializeAppwrite();

		await database.deleteDocument(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			memoryId
		);
	} catch (error) {
		console.error('Error deleting memory:', error);
		throw error;
	}
}

/**
 * Delete all memories for a user
 * @param {String} userEmail - User's email
 * @returns {Promise<Object>} { deletedCount: number }
 */
export async function deleteAllUserMemories(userEmail) {
	try {
		const database = initializeAppwrite();

		// Get all memory IDs for the user
		const result = await database.listDocuments(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			[Query.equal('userEmail', userEmail), Query.limit(100)]
		);

		let deletedCount = 0;

		// Delete each memory
		for (const memory of result.documents) {
			await database.deleteDocument(
				APPWRITE_DATABASE_ID,
				CONVERSATION_MEMORY_COLLECTION_ID,
				memory.$id
			);
			deletedCount++;
		}

		return { deletedCount };
	} catch (error) {
		console.error('Error deleting all user memories:', error);
		throw error;
	}
}

/**
 * Check if memory already exists for a libId
 * @param {String} libId - Library/session ID
 * @returns {Promise<Boolean>}
 */
export async function memoryExistsForLibId(libId) {
	try {
		const database = initializeAppwrite();

		const result = await database.listDocuments(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			[Query.equal('libId', libId), Query.limit(1)]
		);

		return result.documents.length > 0;
	} catch (error) {
		console.error('Error checking memory existence:', error);
		return false;
	}
}

/**
 * Save imported memories in batch.
 * @param {Object} params
 * @param {String} params.userEmail
 * @param {Array} params.entries
 * @param {String} params.provider
 * @param {String} params.batchId
 * @param {Boolean} params.includeInContext
 * @returns {Promise<Object>} Batch import result
 */
export async function saveImportedMemoriesBatch({
	userEmail,
	entries,
	provider,
	batchId,
	includeInContext = true,
}) {
	if (!userEmail) {
		throw new Error('userEmail is required');
	}

	if (!Array.isArray(entries) || entries.length === 0) {
		return { importedCount: 0, memoryIds: [] };
	}

	const database = initializeAppwrite();
	const memoryIds = [];

	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index];
		const summaryWithMeta = {
			...(entry.summary || {}),
			importMeta: {
				provider,
				sourceType: entry.sourceType || 'upload',
				importedAt: new Date().toISOString(),
				importHash: entry.importHash,
				batchId,
			},
		};

		const document = {
			userEmail,
			libId: `import_${batchId}_${index}`,
			fullTranscript: JSON.stringify(entry.fullTranscript || []),
			summary: JSON.stringify(summaryWithMeta),
			conversationType: entry.conversationType || 'search',
			includedInContext: includeInContext,
			createdAt: entry.createdAt || new Date().toISOString(),
		};

		const result = await database.createDocument(
			APPWRITE_DATABASE_ID,
			CONVERSATION_MEMORY_COLLECTION_ID,
			`memory_import_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
			document
		);

		memoryIds.push(result.$id);
	}

	return {
		importedCount: memoryIds.length,
		memoryIds,
	};
}
