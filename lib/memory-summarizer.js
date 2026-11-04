import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Extracts a structured summary from a conversation
 * @param {Array} chats - Array of chat messages from the database
 * @param {Object} libMetadata - Library metadata (type, searchInput, etc.)
 * @returns {Promise<Object>} Structured summary with topic, keyFindings, questionsAsked
 */
export async function extractConversationSummary(chats, libMetadata) {
	if (!chats || chats.length === 0) {
		return {
			topic: libMetadata?.searchInput || 'Unknown Topic',
			intent: 'information_gathering',
			keyFindings: [],
			questionsAsked: [],
			mainTopic: libMetadata?.searchInput || '',
		};
	}

	try {
		// Format conversation for analysis
		const conversationText = chats
			.map((chat, index) => {
				return `User Query ${index + 1}: ${chat.userSearchInput}\n\nAI Response: ${chat.aiResp}\n`;
			})
			.join('\n---\n');

		const prompt = `Analyze the following conversation and extract key information in JSON format.

Conversation:
${conversationText}

Return a JSON object with these exact fields:
{
  "topic": "main topic discussed (string, max 50 chars)",
  "intent": "user's primary intent: information_gathering|decision_making|learning|problem_solving|research (string)",
  "keyFindings": ["array", "of", "key", "findings", "max 5 items"],
  "questionsAsked": ["array", "of", "main", "questions", "max 5 items"],
  "mainTopic": "the primary subject discussed (string, max 100 chars)"
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no extra text.`;

		const apiKey = process.env.GOOGLE_AI_KEY
			|| process.env.GOOGLE_GENAI_API_KEY
			|| process.env.GEMINI_API_KEY
			|| process.env.GEMINI_API_KEY
			|| process.env.GOOGLE_API_KEY;

		if (!apiKey) {
			console.warn('Memory summarizer: no Gemini API key configured. Skipping summary extraction.');
			return {
				topic: libMetadata?.searchInput || 'Conversation',
				intent: 'information_gathering',
				keyFindings: [],
				questionsAsked: [],
				mainTopic: libMetadata?.searchInput || '',
			};
		}

		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

		const result = await model.generateContent(prompt);
		const responseText = result.response.text().trim();

		// Parse JSON response
		let summary = {};
		try {
			summary = JSON.parse(responseText);
		} catch (e) {
			// If JSON parsing fails, try to extract JSON from the response
			const jsonMatch = responseText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				summary = JSON.parse(jsonMatch[0]);
			} else {
				throw e;
			}
		}

		// Validate and provide defaults
		return {
			topic: summary.topic || libMetadata?.searchInput || 'Conversation',
			intent: summary.intent || 'information_gathering',
			keyFindings: Array.isArray(summary.keyFindings) ? summary.keyFindings.slice(0, 5) : [],
			questionsAsked: Array.isArray(summary.questionsAsked) ? summary.questionsAsked.slice(0, 5) : [],
			mainTopic: summary.mainTopic || libMetadata?.searchInput || '',
		};
	} catch (error) {
		console.error('Error extracting memory summary:', error);
		// Return basic summary if extraction fails
		return {
			topic: libMetadata?.searchInput || 'Conversation',
			intent: 'information_gathering',
			keyFindings: [],
			questionsAsked: [],
			mainTopic: libMetadata?.searchInput || '',
		};
	}
}

/**
 * Formats a memory summary for display to users
 * @param {Object} summary - The summary object
 * @returns {String} Formatted display text
 */
export function formatMemorySummaryForDisplay(summary) {
	if (!summary) return 'Conversation';

	let display = `${summary.topic}`;

	if (summary.keyFindings && summary.keyFindings.length > 0) {
		display += ` • ${summary.keyFindings.length} key findings`;
	}

	return display;
}

/**
 * Formats active memories into a context string for AI prompt injection
 * @param {Array} memories - Array of memory objects with summaries
 * @returns {String} Context string to inject into prompts
 */
export function formatMemoriesForContextInjection(memories) {
	if (!memories || memories.length === 0) {
		return '';
	}

	const activeMemories = memories.filter(m => m.includedInContext !== false);

	if (activeMemories.length === 0) {
		return '';
	}

	let context = 'Based on your previous research and conversations:\n\n';

	activeMemories.slice(0, 10).forEach((memory, index) => {
		const summary = memory.summary;
		context += `${index + 1}. **${summary.topic}**\n`;

		if (summary.keyFindings && summary.keyFindings.length > 0) {
			context += `   Key findings: ${summary.keyFindings.join('; ')}\n`;
		}

		if (summary.questionsAsked && summary.questionsAsked.length > 0) {
			context += `   Questions explored: ${summary.questionsAsked.slice(0, 2).join('; ')}\n`;
		}

		context += '\n';
	});

	context += 'Consider this context when providing your response to give more relevant and coherent answers.\n';

	return context;
}
