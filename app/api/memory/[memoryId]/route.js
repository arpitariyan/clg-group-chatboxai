import { NextRequest, NextResponse } from 'next/server';
import { toggleMemoryInclusion, deleteMemory, getMemoryById } from '@/services/memory-service';
import { withUser } from '@/lib/request-context';

/**
 * PATCH /api/memory/[memoryId]
 * Toggle memory inclusion in context
 * Body: { includedInContext: boolean }
 *
 * DELETE /api/memory/[memoryId]
 * Delete a specific memory
 *
 * SECURITY: both handlers enforce ownership — a memory can only be modified or
 * deleted by the authenticated user who owns it (guards against IDOR by memoryId).
 */
async function resolveOwnedMemory(memoryId, ctx) {
	if (!memoryId) {
		return { response: NextResponse.json({ error: 'memoryId is required' }, { status: 400 }) };
	}
	const memory = await getMemoryById(memoryId);
	if (!memory) {
		return { response: NextResponse.json({ error: 'Memory not found' }, { status: 404 }) };
	}
	const ownerEmail = String(memory.userEmail || '').trim().toLowerCase();
	if (ownerEmail !== ctx.userEmail) {
		// Do not leak existence to a non-owner — respond as not found.
		return { response: NextResponse.json({ error: 'Memory not found' }, { status: 404 }) };
	}
	return { memory };
}

export const PATCH = withUser(async function PATCH(request, ctx) {
	try {
		const { memoryId } = await ctx.params;

		const owned = await resolveOwnedMemory(memoryId, ctx);
		if (owned.response) return owned.response;

		const body = await request.json().catch(() => ({}));
		const { includedInContext } = body;

		if (includedInContext === undefined) {
			return NextResponse.json(
				{ error: 'includedInContext is required' },
				{ status: 400 }
			);
		}

		const updated = await toggleMemoryInclusion(memoryId, includedInContext);

		return NextResponse.json(
			{
				success: true,
				memory: {
					$id: updated.$id,
					includedInContext: updated.includedInContext,
				},
				message: `Memory ${includedInContext ? 'included in' : 'excluded from'} context`,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error updating memory:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to update memory' },
			{ status: 500 }
		);
	}
});

export const DELETE = withUser(async function DELETE(request, ctx) {
	try {
		const { memoryId } = await ctx.params;

		const owned = await resolveOwnedMemory(memoryId, ctx);
		if (owned.response) return owned.response;

		await deleteMemory(memoryId);

		return NextResponse.json(
			{
				success: true,
				message: 'Memory deleted successfully',
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error deleting memory:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to delete memory' },
			{ status: 500 }
		);
	}
});
