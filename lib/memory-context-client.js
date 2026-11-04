/**
 * Client-side utilities for using conversation memory in prompts
 * This allows frontend components to fetch and inject memory context
 */

import { authFetch } from '@/lib/auth-fetch';

/**
 * Fetch active memories for a user and format them for context injection
 * @param {String} userEmail - User's email
 * @returns {Promise<String>} Formatted memory context string to inject into prompts
 */
export async function fetchAndFormatMemoryContext(userEmail) {
	if (!userEmail) {
		return '';
	}

	try {
		const response = await authFetch(
			`/api/memory/list?userEmail=${encodeURIComponent(userEmail)}&limit=100&offset=0`
		);

		if (!response.ok) {
			console.warn('Failed to fetch memory context:', response.statusText);
			return '';
		}

		const data = await response.json();
		const memories = data.memories || [];

		if (memories.length === 0) {
			return '';
		}

		// Filter only active memories (included in context)
		const activeMemories = memories.filter(m => m.includedInContext !== false);

		if (activeMemories.length === 0) {
			return '';
		}

		// Format for context injection
		return formatMemoriesForInjection(activeMemories);
	} catch (error) {
		console.error('Error fetching memory context:', error);
		return '';
	}
}

/**
 * Format memories into a context string for AI prompt injection
 * @param {Array} memories - Array of memory objects with summaries
 * @returns {String} Formatted context string
 */
export function formatMemoriesForInjection(memories) {
	if (!memories || memories.length === 0) {
		return '';
	}

	let context = '---\n**CONVERSATION MEMORY CONTEXT**\n\n';
	context += 'Based on your previous research and conversations, here is relevant context:\n\n';

	// Limit to top 10 memories to avoid overwhelming the prompt
	const topMemories = memories.slice(0, 10);

	topMemories.forEach((memory, index) => {
		const summary = memory.summary || {};
		const date = memory.createdAt
			? new Date(memory.createdAt).toLocaleDateString()
			: 'Unknown date';

		context += `**${index + 1}. ${summary.topic || 'Untitled'}** (${date})\n`;

		if (summary.intent) {
			context += `- Intent: ${summary.intent}\n`;
		}

		if (summary.keyFindings && Array.isArray(summary.keyFindings) && summary.keyFindings.length > 0) {
			context += `- Key findings:\n`;
			summary.keyFindings.slice(0, 3).forEach(finding => {
				context += `  • ${finding}\n`;
			});
		}

		if (
			summary.questionsAsked &&
			Array.isArray(summary.questionsAsked) &&
			summary.questionsAsked.length > 0
		) {
			context += `- Questions explored: ${summary.questionsAsked.slice(0, 2).join('; ')}\n`;
		}

		context += '\n';
	});

	context +=
		'Use this context to provide more relevant and coherent answers. Refer back to previous findings when applicable.\n';
	context += '---\n\n';

	return context;
}

/**
 * Inject memory context into a prompt
 * @param {String} basePrompt - The original prompt
 * @param {String} memoryContext - Formatted memory context
 * @returns {String} Prompt with memory context injected
 */
export function injectMemoryIntoPrompt(basePrompt, memoryContext) {
	if (!memoryContext) {
		return basePrompt;
	}

	// Inject memory context after the initial system instruction but before the specific task
	return `${memoryContext}\n${basePrompt}`;
}
