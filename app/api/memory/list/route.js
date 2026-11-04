import { NextRequest, NextResponse } from 'next/server';
import { getUserMemories } from '@/services/memory-service';
import { withUser } from '@/lib/request-context';

/**
 * GET /api/memory/list
 * Fetch user's memories with pagination
 *
 * Query params:
 * - userEmail (required)
 * - limit (default: 50)
 * - offset (default: 0)
 */
export const GET = withUser(async function GET(request, ctx) {
	try {
		const url = new URL(request.url);
		const userEmail = ctx.assertEmail(url.searchParams.get('userEmail'));
		const limit = parseInt(url.searchParams.get('limit')) || 50;
		const offset = parseInt(url.searchParams.get('offset')) || 0;

		if (!userEmail) {
			return NextResponse.json(
				{ error: 'userEmail is required' },
				{ status: 400 }
			);
		}

		// Validate pagination params
		if (limit < 1 || limit > 100) {
			return NextResponse.json(
				{ error: 'limit must be between 1 and 100' },
				{ status: 400 }
			);
		}

		if (offset < 0) {
			return NextResponse.json(
				{ error: 'offset must be >= 0' },
				{ status: 400 }
			);
		}

		const result = await getUserMemories(userEmail, limit, offset);

		// Format response to hide full transcripts
		const memoriesForDisplay = result.memories.map(memory => ({
			$id: memory.$id,
			summary: memory.summary,
			conversationType: memory.conversationType,
			createdAt: memory.createdAt,
			includedInContext: memory.includedInContext,
		}));

		return NextResponse.json(
			{
				success: true,
				total: result.total,
				limit,
				offset,
				memories: memoriesForDisplay,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error listing memories:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch memories' },
			{ status: 500 }
		);
	}
});
