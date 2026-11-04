/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Tool, Web Search & Retrieval Decision Layer (Phase 7)
 * ═══════════════════════════════════════════════════════════════
 * Decides intentionally when external tools, live web search,
 * or document RAG retrieval are strictly required. Prevents calling
 * tools unnecessarily to preserve latency, cost, and reliability.
 */

import { ADAPTIVE_TASK_CATEGORIES } from './intent-classifier.js';

export const TOOL_ACTION_TYPES = {
  DIRECT_ANSWER:     'direct_answer',     // Pure parametric/reasoning generation
  WEB_SEARCH:        'web_search',        // Fresh web queries, current events, recent tech
  DOCUMENT_RAG:      'document_rag',      // User uploaded documents/attachments
  CALCULATION:       'calculation',       // Pure math or deterministic computation
  CONNECTED_APP_MCP: 'connected_app_mcp', // Canva, Gmail, Drive, Notion tools
};

/**
 * Determine the exact tool strategy for the request.
 *
 * @param {string} prompt
 * @param {object} intent - output of classifyAdaptiveIntent
 * @param {object} context - { hasAttachment, searchResult, connectedApps, selectedAppId }
 * @returns {{
 *   actionType: string,
 *   needsLiveSearch: boolean,
 *   needsDocumentRAG: boolean,
 *   needsConnectedApps: boolean,
 *   reason: string
 * }}
 */
export function decideToolStrategy(prompt, intent = {}, context = {}) {
  const text = String(prompt || '').toLowerCase();
  const category = intent.category || ADAPTIVE_TASK_CATEGORIES.GENERAL_CHAT;
  const { hasAttachment, searchResult = [], connectedApps = [], selectedAppId } = context;

  // 1. User uploaded files take first precedence for document RAG
  if (hasAttachment || (Array.isArray(searchResult) && searchResult.some(r => r.type === 'document' || r.documentContent))) {
    return {
      actionType: TOOL_ACTION_TYPES.DOCUMENT_RAG,
      needsLiveSearch: false,
      needsDocumentRAG: true,
      needsConnectedApps: false,
      reason: 'User uploaded documents/files attached to the query.',
    };
  }

  // 2. Explicit Connected App selection (e.g., Canva, Gmail, Notion)
  if (selectedAppId || (Array.isArray(connectedApps) && connectedApps.length > 0 && /\b(send email|calendar meeting|notion page|create design|canva|drive)\b/i.test(text))) {
    return {
      actionType: TOOL_ACTION_TYPES.CONNECTED_APP_MCP,
      needsLiveSearch: false,
      needsDocumentRAG: false,
      needsConnectedApps: true,
      reason: 'User request explicitly targets connected workspace tools.',
    };
  }

  // 3. Deterministic calculation signals (no search needed)
  if (category === ADAPTIVE_TASK_CATEGORIES.MATHEMATICS && /^\s*[\d\.\s\+\-\*\/\^\(\)]+\s*$/.test(text)) {
    return {
      actionType: TOOL_ACTION_TYPES.CALCULATION,
      needsLiveSearch: false,
      needsDocumentRAG: false,
      needsConnectedApps: false,
      reason: 'Pure mathematical arithmetic solvable deterministically.',
    };
  }

  // 4. Live Web Search determination
  const liveSearchSignals = [
    /\b(today|yesterday|latest|current|recent|newest|news|this week|this month|stock price|weather|score|release date)\b/i.test(text),
    /\b(in 202[4-9]|2025|2026)\b/.test(text),
    category === ADAPTIVE_TASK_CATEGORIES.RESEARCH,
    category === ADAPTIVE_TASK_CATEGORIES.FACTUAL_QUESTION && !/\b(what is a|define|how do you say)\b/i.test(text),
    /\b(who won|who is currently|ceo of|price of)\b/i.test(text),
  ];

  if (liveSearchSignals.some(Boolean)) {
    return {
      actionType: TOOL_ACTION_TYPES.WEB_SEARCH,
      needsLiveSearch: true,
      needsDocumentRAG: false,
      needsConnectedApps: false,
      reason: 'Query demands real-time or recent information beyond static training data.',
    };
  }

  // 5. Default: Direct parametric answer (no tool needed)
  return {
    actionType: TOOL_ACTION_TYPES.DIRECT_ANSWER,
    needsLiveSearch: false,
    needsDocumentRAG: false,
    needsConnectedApps: false,
    reason: 'Self-contained reasoning, coding, explanation, or conversational request.',
  };
}
