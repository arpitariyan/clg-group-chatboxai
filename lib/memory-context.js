import { getActiveUserMemories } from '@/services/memory-service';
import { formatMemoriesForContextInjection } from '@/lib/memory-summarizer';

const STOP_WORDS = new Set([
	'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'by', 'is', 'are', 'was',
	'were', 'be', 'as', 'at', 'from', 'that', 'this', 'it', 'its', 'their', 'your', 'you', 'about',
	'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'can', 'could', 'should', 'would'
]);

function normalizeText(value = '') {
	return String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function tokenize(value = '') {
	return normalizeText(value)
		.split(' ')
		.filter(token => token && token.length > 2 && !STOP_WORDS.has(token));
}

function getMemorySearchText(memory = {}) {
	const summary = memory.summary || {};
	return [
		summary.topic,
		summary.mainTopic,
		summary.intent,
		...(Array.isArray(summary.keyFindings) ? summary.keyFindings : []),
		...(Array.isArray(summary.questionsAsked) ? summary.questionsAsked : [])
	].filter(Boolean).join(' ');
}

function getConversationTurnText(turn = {}) {
	if (typeof turn === 'string') return turn;
	if (!turn || typeof turn !== 'object') return '';

	if (turn.userSearchInput || turn.aiResp) {
		return [turn.userSearchInput, turn.aiResp].filter(Boolean).join(' ');
	}

	if (turn.content) {
		return String(turn.content);
	}

	return [turn.question, turn.answer, turn.prompt, turn.response].filter(Boolean).join(' ');
}

function scoreMemoryRelevance(memory = {}, queryText = '') {
	const queryTokens = new Set(tokenize(queryText));
	if (!queryTokens.size) {
		return {
			score: 0,
			createdAt: new Date(memory.createdAt || 0).getTime() || 0,
		};
	}

	const memoryTokens = new Set(tokenize(getMemorySearchText(memory)));
	let overlap = 0;
	queryTokens.forEach(token => {
		if (memoryTokens.has(token)) overlap += 1;
	});

	const summary = memory.summary || {};
	const topicText = normalizeText(summary.topic || summary.mainTopic || '');
	const queryTextNormalized = normalizeText(queryText);
	const exactTopicMatch = topicText && queryTextNormalized.includes(topicText) ? 2 : 0;
	const recencyBoost = Math.min(1, Math.max(0, (Date.now() - new Date(memory.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24 * 30)));

	return {
		score: overlap + exactTopicMatch + (1 - recencyBoost) * 0.25,
		createdAt: new Date(memory.createdAt || 0).getTime() || 0,
	};
}

function rankMemoriesForPrompt(memories = [], queryText = '', limit = 5) {
	const ranked = (Array.isArray(memories) ? memories : [])
		.filter(memory => memory && memory.includedInContext !== false)
		.map(memory => ({
			memory,
			...scoreMemoryRelevance(memory, queryText)
		}))
		.sort((left, right) => {
			if (right.score === left.score) {
				return right.createdAt - left.createdAt;
			}
			return right.score - left.score;
		});

	return ranked.slice(0, limit).map(item => item.memory);
}

/**
 * @deprecated Use buildConversationMemoryContext instead.
 * Raw conversation history is no longer injected into prompts to avoid
 * re-sending all previous Q&A pairs on every request (token cost).
 * Long-term memory is handled by the summarized memory service.
 */
export function buildRecentConversationContext(_conversationHistory = [], _maxTurns = 6) {
	// Intentionally returns empty string — raw history injection removed.
	// Use getActiveUserMemories() for efficient summarized memory instead.
	return '';
}

/**
 * Builds memory context for the AI prompt using only compact summarized memories.
 * Does NOT inject raw conversation history — each request sends only the current
 * question plus lightweight memory summaries, keeping token usage flat.
 */
export async function buildConversationMemoryContext({
	userEmail,
	query = '',
	memoryEnabled = true,
	limit = 5,
	recentMessageIds = [],
} = {}) {
	if (!memoryEnabled || !userEmail) {
		return {
			activeMemories: [],
			relevantMemories: [],
			recentConversationContext: '',
			memoryContext: '',
			combinedContext: '',
		};
	}

	try {
		let activeMemories = await getActiveUserMemories(userEmail);

		// V5 Deduplication: Exclude long-term memories that overlap with the short-term window
		if (recentMessageIds && recentMessageIds.length > 0) {
			const recentIdsSet = new Set(recentMessageIds.filter(Boolean));
			activeMemories = activeMemories.filter(memory => {
				if (!memory.fullTranscript) return true;
				try {
					const transcript = typeof memory.fullTranscript === 'string' 
						? JSON.parse(memory.fullTranscript) 
						: memory.fullTranscript;
					
					if (!Array.isArray(transcript)) return true;
					
					// If this memory contains a chat ID that is currently in our short-term context window,
					// exclude this memory completely to prevent redundant/conflicting information.
					const hasOverlap = transcript.some(chat => chat.id && recentIdsSet.has(chat.id));
					return !hasOverlap;
				} catch (e) {
					console.warn('Failed to parse memory transcript for deduplication:', e?.message);
					return true;
				}
			});
		}

		const relevantMemories = rankMemoriesForPrompt(activeMemories, query, limit);
		const memoryContext = relevantMemories.length > 0
			? formatMemoriesForContextInjection(relevantMemories)
			: '';

		return {
			activeMemories,
			relevantMemories,
			recentConversationContext: '',
			memoryContext,
			combinedContext: memoryContext,
		};
	} catch (error) {
		console.warn('Failed to build memory context:', error?.message || error);
		return {
			activeMemories: [],
			relevantMemories: [],
			recentConversationContext: '',
			memoryContext: '',
			combinedContext: '',
		};
	}
}