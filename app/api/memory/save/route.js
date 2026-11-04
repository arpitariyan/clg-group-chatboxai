import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import { extractConversationSummary } from '@/lib/memory-summarizer';
import { saveConversationMemory, memoryExistsForLibId } from '@/services/memory-service';
import { CHATS_COLLECTION_ID, LIBRARY_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections';
import { withUser } from '@/lib/request-context';

async function getAppwriteDB() {
	const client = new Client()
		.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
		.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
		.setKey(process.env.APPWRITE_API_KEY);

	return new Databases(client);
}

/**
 * POST /api/memory/save
 * Saves a conversation to memory after chat completion
 * Body: { libId, userEmail }
 */
export const POST = withUser(async function POST(request, ctx) {
	try {
		const body = await request.json().catch(() => ({}));
		const { libId } = body;
		const userEmail = ctx.assertEmail(body.userEmail);

		if (!libId || !userEmail) {
			return NextResponse.json(
				{ error: 'libId and userEmail are required' },
				{ status: 400 }
			);
		}

		// Check if memory already exists for this libId
		const alreadyExists = await memoryExistsForLibId(libId);
		if (alreadyExists) {
			return NextResponse.json(
				{ message: 'Memory already exists for this conversation', exists: true },
				{ status: 200 }
			);
		}

		const db = await getAppwriteDB();

		// Fetch library document to get metadata
		let libMetadata = {};
		try {
			const libDoc = await db.getDocument(APPWRITE_DATABASE_ID, LIBRARY_COLLECTION_ID, libId);
			libMetadata = {
				searchInput: libDoc.searchInput || '',
				type: libDoc.type || 'search',
				selectedModel: libDoc.selectedModel || '',
			};
		} catch (error) {
			console.error('Error fetching library metadata:', error);
		}

		// Fetch all chats for this libId
		const chatsResult = await db.listDocuments(
			APPWRITE_DATABASE_ID,
			CHATS_COLLECTION_ID,
			[Query.equal('libId', libId), Query.limit(100)]
		);

		if (chatsResult.documents.length === 0) {
			return NextResponse.json(
				{ error: 'No conversations found for this libId' },
				{ status: 404 }
			);
		}

		// Extract summary from conversation
		const summary = await extractConversationSummary(chatsResult.documents, libMetadata);

		// Save to memory
		const memoryData = {
			userEmail,
			libId,
			fullTranscript: chatsResult.documents,
			summary,
			conversationType: libMetadata.type || 'search',
		};

		const savedMemory = await saveConversationMemory(memoryData);

		return NextResponse.json(
			{
				success: true,
				memoryId: savedMemory.$id,
				summary,
				message: 'Conversation saved to memory',
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error saving memory:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to save memory' },
			{ status: 500 }
		);
	}
});
