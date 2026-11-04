import { NextResponse } from 'next/server';
import { parseMemoryImport } from '@/lib/memory-import';
import { saveImportedMemoriesBatch } from '@/services/memory-service';
import { collectExistingImportHashes, parseImportRequest } from './_utils';
import { withUser } from '@/lib/request-context';

/**
 * POST /api/memory/import
 * Imports memories from provider exports or pasted content.
 */
export const POST = withUser(async function POST(request, ctx) {
	try {
		const payload = await parseImportRequest(request);
		const { provider, sourceType, fileName, fileText, pastedText, includeInContext } = payload;
		const userEmail = ctx.assertEmail(payload.userEmail);

		if (!provider || !userEmail) {
			return NextResponse.json({ error: 'provider and userEmail are required' }, { status: 400 });
		}

		const parsed = parseMemoryImport({
			provider,
			sourceType,
			fileName,
			fileText,
			pastedText,
		});

		const existingHashes = await collectExistingImportHashes(userEmail);
		const uniqueEntries = [];
		let skippedDuplicates = 0;

		for (const entry of parsed.entries) {
			if (existingHashes.has(entry.importHash)) {
				skippedDuplicates += 1;
				continue;
			}
			existingHashes.add(entry.importHash);
			uniqueEntries.push(entry);
		}

		if (uniqueEntries.length === 0) {
			return NextResponse.json(
				{
					success: true,
					message: 'No new memories imported. All entries matched existing memory.',
					counts: {
						total: parsed.entries.length,
						imported: 0,
						skippedDuplicates,
					},
				},
				{ status: 200 }
			);
		}

		const batchId = `batch_${Date.now()}`;
		const result = await saveImportedMemoriesBatch({
			userEmail,
			entries: uniqueEntries,
			provider,
			batchId,
			includeInContext,
		});

		return NextResponse.json(
			{
				success: true,
				message: 'Memory import completed successfully.',
				provider: parsed.provider,
				sourceType: parsed.sourceType,
				truncated: parsed.truncated,
				counts: {
					total: parsed.entries.length,
					imported: result.importedCount,
					skippedDuplicates,
				},
				memoryIds: result.memoryIds,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Memory import error:', error);
		return NextResponse.json({ error: error.message || 'Failed to import memories' }, { status: 400 });
	}
});
