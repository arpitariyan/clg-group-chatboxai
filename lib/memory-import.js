import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import crypto from 'node:crypto';

const MAX_ENTRIES = 200;
const MAX_TEXT_CHARS = 50000;
const MAX_TOPIC_CHARS = 120;

export const SUPPORTED_PROVIDERS = ['chatgpt', 'claude', 'gemini', 'generic'];

function safeString(value) {
	if (value === null || value === undefined) return '';
	return String(value).trim();
}

function clampText(value, maxLen) {
	const text = safeString(value);
	if (!text) return '';
	return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function toArray(value) {
	return Array.isArray(value) ? value : [];
}

function normalizeSentenceList(value, maxItems = 5) {
	if (Array.isArray(value)) {
		return value
			.map(item => clampText(item, 280))
			.filter(Boolean)
			.slice(0, maxItems);
	}

	if (typeof value === 'string') {
		return value
			.split(/\n|;|\u2022|\-|\*/)
			.map(item => clampText(item, 280))
			.filter(Boolean)
			.slice(0, maxItems);
	}

	return [];
}

function summarizeText(text) {
	const raw = clampText(text, MAX_TEXT_CHARS);
	if (!raw) {
		return {
			topic: 'Imported Memory',
			intent: 'information_gathering',
			keyFindings: [],
			questionsAsked: [],
			mainTopic: 'Imported Memory',
		};
	}

	const lines = raw
		.split(/\n+/)
		.map(line => line.trim())
		.filter(Boolean);

	const topic = clampText(lines[0] || 'Imported Memory', MAX_TOPIC_CHARS);
	const keyFindings = lines.slice(1, 6).map(line => clampText(line, 280));
	const questionsAsked = lines
		.filter(line => line.includes('?'))
		.slice(0, 5)
		.map(line => clampText(line, 280));

	return {
		topic: topic || 'Imported Memory',
		intent: 'information_gathering',
		keyFindings,
		questionsAsked,
		mainTopic: topic || 'Imported Memory',
	};
}

function inferConversationType(raw) {
	const type = safeString(raw).toLowerCase();
	if (type === 'research') return 'research';
	return 'search';
}

function normalizeMessages(messages, fallbackText = '') {
	const normalized = [];

	toArray(messages).forEach((message, idx) => {
		if (!message || typeof message !== 'object') return;

		const role = safeString(message.role || message.author || message.sender || message.type).toLowerCase();
		const content =
			safeString(message.content) ||
			safeString(message.text) ||
			safeString(message.message) ||
			safeString(message.value) ||
			safeString(message.body);

		if (!content) return;

		if (role.includes('assistant') || role.includes('model') || role.includes('ai')) {
			normalized.push({
				userSearchInput: idx === 0 ? 'Imported conversation' : 'Imported follow-up',
				aiResp: clampText(content, MAX_TEXT_CHARS),
			});
		} else {
			normalized.push({
				userSearchInput: clampText(content, MAX_TEXT_CHARS),
				aiResp: '',
			});
		}
	});

	if (normalized.length > 0) {
		return normalized.slice(0, 50);
	}

	const text = clampText(fallbackText, MAX_TEXT_CHARS);
	if (!text) return [];

	return [
		{
			userSearchInput: 'Imported memory',
			aiResp: text,
		},
	];
}

function extractTextFromRecord(record) {
	if (!record || typeof record !== 'object') return '';
	const candidates = [
		record.text,
		record.content,
		record.message,
		record.summary,
		record.memory,
		record.note,
		record.description,
		record.aiResp,
		record.response,
	];

	for (const candidate of candidates) {
		const value = safeString(candidate);
		if (value) return value;
	}

	return '';
}

function normalizeRecord(record, provider, sourceType) {
	const text = extractTextFromRecord(record);
	const messages =
		record.messages ||
		record.chat_messages ||
		record.turns ||
		record.conversation ||
		record.entries ||
		record.parts;

	const normalizedMessages = normalizeMessages(messages, text);
	const joinedConversation = normalizedMessages
		.map(item => `${item.userSearchInput}\n${item.aiResp}`.trim())
		.join('\n---\n');
	const baseText = joinedConversation || text;
	if (!baseText) return null;

	const summary = {
		...summarizeText(baseText),
		topic: clampText(record.topic || record.title || record.subject || summarizeText(baseText).topic, MAX_TOPIC_CHARS),
		intent: safeString(record.intent) || 'information_gathering',
		keyFindings: normalizeSentenceList(record.keyFindings || record.key_findings, 5),
		questionsAsked: normalizeSentenceList(record.questionsAsked || record.questions_asked, 5),
		mainTopic: clampText(record.mainTopic || record.main_topic || record.title || summarizeText(baseText).mainTopic, MAX_TOPIC_CHARS),
	};

	if (!summary.keyFindings.length) {
		summary.keyFindings = summarizeText(baseText).keyFindings;
	}

	const createdAt = safeString(record.createdAt || record.created_at || record.timestamp) || new Date().toISOString();

	return {
		sourceProvider: provider,
		sourceType,
		summary,
		fullTranscript: normalizedMessages,
		conversationType: inferConversationType(record.conversationType || record.type),
		createdAt,
		rawText: clampText(baseText, MAX_TEXT_CHARS),
	};
}

function normalizeFromJson(jsonValue, provider, sourceType) {
	const output = [];

	const pushRecord = record => {
		const normalized = normalizeRecord(record, provider, sourceType);
		if (normalized) output.push(normalized);
	};

	if (Array.isArray(jsonValue)) {
		jsonValue.forEach(pushRecord);
		return output;
	}

	if (!jsonValue || typeof jsonValue !== 'object') {
		return output;
	}

	const candidateArrays = [
		jsonValue.memories,
		jsonValue.conversations,
		jsonValue.chats,
		jsonValue.data,
		jsonValue.items,
		jsonValue.history,
	];

	for (const candidate of candidateArrays) {
		if (Array.isArray(candidate)) {
			candidate.forEach(pushRecord);
		}
	}

	if (output.length === 0) {
		pushRecord(jsonValue);
	}

	return output;
}

function parseCsvText(csvText, provider, sourceType) {
	const workbook = xlsxRead(csvText, { type: 'string' });
	const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
	if (!firstSheet) return [];

	const rows = xlsxUtils.sheet_to_json(firstSheet, { defval: '' });
	return rows
		.map(row => normalizeRecord(row, provider, sourceType))
		.filter(Boolean);
}

function parseTextBlob(text, provider, sourceType) {
	const normalized = normalizeRecord({ text, topic: 'Imported Memory' }, provider, sourceType);
	return normalized ? [normalized] : [];
}

function normalizeImportRows(rows) {
	return rows.slice(0, MAX_ENTRIES).map(row => {
		const safeSummary = {
			topic: clampText(row.summary?.topic || 'Imported Memory', 120),
			intent: clampText(row.summary?.intent || 'information_gathering', 60),
			keyFindings: normalizeSentenceList(row.summary?.keyFindings, 5),
			questionsAsked: normalizeSentenceList(row.summary?.questionsAsked, 5),
			mainTopic: clampText(row.summary?.mainTopic || row.summary?.topic || 'Imported Memory', 120),
		};

		const transcript = Array.isArray(row.fullTranscript) && row.fullTranscript.length > 0
			? row.fullTranscript.slice(0, 100).map(item => ({
				userSearchInput: clampText(item.userSearchInput || 'Imported memory', MAX_TEXT_CHARS),
				aiResp: clampText(item.aiResp || '', MAX_TEXT_CHARS),
			}))
			: [
				{
					userSearchInput: 'Imported memory',
					aiResp: clampText(row.rawText || '', MAX_TEXT_CHARS),
				},
			];

		const dedupeText = `${safeSummary.topic}\n${safeSummary.mainTopic}\n${safeSummary.keyFindings.join('|')}\n${transcript
			.map(item => `${item.userSearchInput} ${item.aiResp}`)
			.join('\n')}`;

		const importHash = crypto
			.createHash('sha256')
			.update(dedupeText.toLowerCase())
			.digest('hex');

		return {
			sourceProvider: row.sourceProvider,
			sourceType: row.sourceType,
			summary: safeSummary,
			fullTranscript: transcript,
			conversationType: row.conversationType || 'search',
			createdAt: row.createdAt || new Date().toISOString(),
			importHash,
		};
	});
}

export function parseMemoryImport({ provider, sourceType, fileName, fileText, pastedText }) {
	const normalizedProvider = safeString(provider).toLowerCase();
	const normalizedSourceType = safeString(sourceType).toLowerCase() || 'upload';

	if (!SUPPORTED_PROVIDERS.includes(normalizedProvider)) {
		throw new Error('Unsupported provider. Use chatgpt, claude, gemini, or generic.');
	}

	const textPayload = safeString(fileText || pastedText);
	if (!textPayload) {
		throw new Error('No import content provided.');
	}

	const extension = safeString(fileName).toLowerCase().split('.').pop();
	let parsedRows = [];

	if (normalizedSourceType === 'paste') {
		parsedRows = parseTextBlob(textPayload, normalizedProvider, 'paste');
	} else if (extension === 'json' || textPayload.trim().startsWith('{') || textPayload.trim().startsWith('[')) {
		let json;
		try {
			json = JSON.parse(textPayload);
		} catch (error) {
			throw new Error('Invalid JSON import file.');
		}
		parsedRows = normalizeFromJson(json, normalizedProvider, 'upload');
	} else if (extension === 'csv') {
		parsedRows = parseCsvText(textPayload, normalizedProvider, 'upload');
	} else if (extension === 'txt' || extension === 'md' || !extension) {
		parsedRows = parseTextBlob(textPayload, normalizedProvider, 'upload');
	} else {
		throw new Error('Unsupported file format. Use JSON, CSV, or TXT.');
	}

	const cleaned = normalizeImportRows(parsedRows).filter(item => {
		const transcriptText = item.fullTranscript
			.map(msg => `${msg.userSearchInput} ${msg.aiResp}`.trim())
			.join(' ')
			.trim();
		return Boolean(item.summary.topic || transcriptText);
	});

	if (cleaned.length === 0) {
		throw new Error('No valid memories found in import content.');
	}

	const isTruncated = parsedRows.length > MAX_ENTRIES;

	return {
		provider: normalizedProvider,
		sourceType: normalizedSourceType,
		entries: cleaned,
		truncated: isTruncated,
		maxEntries: MAX_ENTRIES,
	};
}

export function buildMemoryPreview(entries, maxItems = 20) {
	const items = entries.slice(0, maxItems).map((entry, index) => ({
		index,
		topic: entry.summary.topic,
		conversationType: entry.conversationType,
		keyFindingsCount: entry.summary.keyFindings.length,
		questionsAskedCount: entry.summary.questionsAsked.length,
	}));

	return {
		total: entries.length,
		items,
	};
}
