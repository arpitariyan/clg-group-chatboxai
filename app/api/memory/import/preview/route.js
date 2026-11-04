import { NextResponse } from 'next/server';
import { buildMemoryPreview, parseMemoryImport } from '@/lib/memory-import';
import { collectExistingImportHashes, parseImportRequest } from '../_utils';
import { withUser } from '@/lib/request-context';

/**
 * POST /api/memory/import/preview
 * Parses and validates import content without saving.
 */
export const POST = withUser(async function POST(request, ctx) {
	try {
		const payload = await parseImportRequest(request);
		const { provider, sourceType, fileName, fileText, pastedText } = payload;
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
		let duplicateCount = 0;
		const previewEntries = parsed.entries.map(entry => {
			const isDuplicate = existingHashes.has(entry.importHash);
			if (isDuplicate) duplicateCount += 1;
			return {
				...entry,
				isDuplicate,
			};
		});

		return NextResponse.json(
			{
				success: true,
				provider: parsed.provider,
				sourceType: parsed.sourceType,
				truncated: parsed.truncated,
				preview: buildMemoryPreview(previewEntries),
				counts: {
					total: parsed.entries.length,
					duplicates: duplicateCount,
					importable: parsed.entries.length - duplicateCount,
				},
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Memory import preview error:', error);
		return NextResponse.json({ error: error.message || 'Failed to preview memory import' }, { status: 400 });
	}
});
