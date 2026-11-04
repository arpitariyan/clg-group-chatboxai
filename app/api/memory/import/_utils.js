import { getUserMemories } from '@/services/memory-service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_HASH_SCAN = 500;

function normalizeValue(value) {
	return typeof value === 'string' ? value.trim() : '';
}

export async function parseImportRequest(request) {
	const contentType = request.headers.get('content-type') || '';

	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();
		const provider = normalizeValue(formData.get('provider'));
		const userEmail = normalizeValue(formData.get('userEmail'));
		const sourceType = normalizeValue(formData.get('sourceType')) || 'upload';
		const includeInContext = String(formData.get('includeInContext') || 'true') !== 'false';
		const file = formData.get('file');

		if (!file) {
			throw new Error('Missing file in form data.');
		}

		if (file.size > MAX_FILE_SIZE) {
			throw new Error('Import file is too large. Maximum size is 10MB.');
		}

		const fileText = await file.text();

		return {
			provider,
			userEmail,
			sourceType,
			includeInContext,
			fileName: file.name,
			fileText,
			pastedText: '',
		};
	}

	const body = await request.json();
	return {
		provider: normalizeValue(body.provider),
		userEmail: normalizeValue(body.userEmail),
		sourceType: normalizeValue(body.sourceType) || 'paste',
		includeInContext: body.includeInContext !== false,
		fileName: normalizeValue(body.fileName),
		fileText: normalizeValue(body.fileText),
		pastedText: normalizeValue(body.pastedText),
	};
}

export async function collectExistingImportHashes(userEmail) {
	const hashes = new Set();
	let offset = 0;
	const pageSize = 100;
	let scanned = 0;

	while (scanned < MAX_HASH_SCAN) {
		const result = await getUserMemories(userEmail, pageSize, offset);
		if (!result.memories.length) break;

		for (const memory of result.memories) {
			const metaHash = memory.summary?.importMeta?.importHash;
			if (metaHash) {
				hashes.add(metaHash);
				continue;
			}
		}

		scanned += result.memories.length;
		offset += pageSize;

		if (result.memories.length < pageSize) break;
	}

	return hashes;
}
