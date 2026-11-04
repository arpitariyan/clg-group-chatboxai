import { NextRequest, NextResponse } from 'next/server';
import { deleteAllUserMemories } from '@/services/memory-service';
import { withUser } from '@/lib/request-context';

/**
 * DELETE /api/memory/all
 * Delete all memories for a user
 * Body: { userEmail }
 */
export const DELETE = withUser(async function DELETE(request, ctx) {
	try {
		const body = await request.json().catch(() => ({}));
		const userEmail = ctx.assertEmail(body.userEmail);

		if (!userEmail) {
			return NextResponse.json(
				{ error: 'userEmail is required' },
				{ status: 400 }
			);
		}

		const result = await deleteAllUserMemories(userEmail);

		return NextResponse.json(
			{
				success: true,
				deletedCount: result.deletedCount,
				message: `Deleted ${result.deletedCount} memory/memories`,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error clearing all memories:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to clear memories' },
			{ status: 500 }
		);
	}
});
