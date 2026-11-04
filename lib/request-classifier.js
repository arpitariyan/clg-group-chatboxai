/**
 * ChatboxAI — Request Classifier
 * ═══════════════════════════════
 * Classifies an incoming prompt into a request class using lightweight
 * heuristics (regex + word count). No LLM call required.
 *
 * Output:
 *   requestClass          – one of the REQUEST_CLASSES
 *   estimatedInputTokens  – rough token estimate for the prompt
 *   expectedOutputTokens  – expected output size for this class
 *   recommendedMinTier    – minimum cost tier to handle this class well
 */

// ── Request class constants ───────────────────────────────────────────────────
export const REQUEST_CLASSES = {
  CHAT:          'chat',
  CODING:        'coding',
  RESEARCH:      'research',
  LONG_CONTEXT:  'long-context',
  FILE_ANALYSIS: 'file-analysis',
  IMAGE:         'image',
};

// ── Expected output tokens per class ─────────────────────────────────────────
const CLASS_OUTPUT_TOKENS = {
  chat:          500,
  coding:        1200,
  research:      2000,
  'long-context': 1500,
  'file-analysis': 1200,
  image:         0,
};

// ── Recommended min tier per class ───────────────────────────────────────────
const CLASS_MIN_TIER = {
  chat:          1,
  coding:        2,
  research:      3,
  'long-context': 3,
  'file-analysis': 2,
  image:         1,
};

// ── Token estimation ──────────────────────────────────────────────────────────
/** Rough tokens ≈ characters / 4 */
function estimateTokens(text) {
  return Math.ceil((String(text || '').length) / 4);
}

// ── Classifier patterns ───────────────────────────────────────────────────────
const CODING_PATTERNS = [
  /\b(code|coding|debug|fix|error|bug|function|class|method|api|endpoint|sql|query|script|program|algorithm|implement|refactor|test|unit test|typescript|javascript|python|java|rust|go|react|next\.?js|node|html|css|bash|shell|regex|git|docker|database)\b/i,
  /```[\s\S]/,                                  // code fence in prompt
  /\bwrite (a |the )?(function|class|script|code|program|module)\b/i,
  /\b(how to|how do i|how can i) (write|build|create|implement|code)\b/i,
  /[{};=><].*[{};=><]/,                         // multiple code-like symbols
];

const RESEARCH_PATTERNS = [
  /\b(research|analyze|analyse|compare|contrast|evaluate|study|survey|review|investigate|explain|deep dive|in-depth|comprehensive|detailed analysis|report|thesis|essay|literature|findings|evidence)\b/i,
  /\b(what are the (pros|cons|advantages|disadvantages|differences|similarities)|trade-?off|versus|vs\.?)\b/i,
  /\b(history of|origin of|evolution of|impact of|effect of)\b/i,
];

const LONG_CONTEXT_PATTERNS = [
  /\b(summarize|summary|summarise|tldr|key points|main points|overview|outline)\b/i,
  /\b(entire|whole|full|complete|all of|throughout)\b/i,
  /\b(document|article|paper|book|chapter|report|transcript|meeting notes|email thread|conversation|chat history)\b/i,
];

const FILE_ANALYSIS_PATTERNS = [
  /\b(file|document|pdf|csv|spreadsheet|excel|word|docx|xlsx|uploaded|attachment|image|screenshot|photo|picture|diagram)\b/i,
  /\b(read (this|the)|analyze (this|the)|look at (this|the)|what (does|is) (this|the))\b/i,
];

const IMAGE_PATTERNS = [
  /\b(generate|create|draw|make|produce|design|render|paint|illustrate)\b.{0,40}\b(image|photo|picture|artwork|illustration|logo|icon|banner|poster|thumbnail)\b/i,
  /\b(image generation|text.?to.?image|dall.?e|stable diffusion|midjourney|imagine)\b/i,
];

// ── Main classifier ───────────────────────────────────────────────────────────

/**
 * Classify a prompt into a request class.
 *
 * @param {string} prompt – The user's message
 * @param {{ hasAttachment?: boolean, responseMode?: string }} opts
 * @returns {{
 *   requestClass: string,
 *   estimatedInputTokens: number,
 *   expectedOutputTokens: number,
 *   recommendedMinTier: number
 * }}
 */
import { extractUserIntent } from './user-intent.js';

export function classifyRequest(prompt, opts = {}) {
  const text = String(prompt || '').trim();
  const { hasAttachment = false, responseMode = 'search' } = opts;

  const estimatedInputTokens = estimateTokens(text);

  // ── Image generation check ────────────────────────────────────────────────
  if (IMAGE_PATTERNS.some(p => p.test(text))) {
    return build(REQUEST_CLASSES.IMAGE, estimatedInputTokens, text, opts);
  }

  // ── Research mode override ────────────────────────────────────────────────
  if (responseMode === 'research') {
    return build(REQUEST_CLASSES.RESEARCH, estimatedInputTokens, text, opts);
  }

  // ── File analysis (attachment or explicit reference) ──────────────────────
  if (hasAttachment || FILE_ANALYSIS_PATTERNS.some(p => p.test(text))) {
    // Only classify as file-analysis if there really is a file reference
    if (hasAttachment || /\b(this (file|document|image|photo|pdf|csv|screenshot)|uploaded)\b/i.test(text)) {
      return build(REQUEST_CLASSES.FILE_ANALYSIS, estimatedInputTokens, text, opts);
    }
  }

  // ── Coding check ─────────────────────────────────────────────────────────
  if (CODING_PATTERNS.some(p => p.test(text))) {
    return build(REQUEST_CLASSES.CODING, estimatedInputTokens, text, opts);
  }

  // ── Long-context check (prompt itself is very long OR it's a summarize task)
  if (estimatedInputTokens > 2000 || LONG_CONTEXT_PATTERNS.some(p => p.test(text))) {
    return build(REQUEST_CLASSES.LONG_CONTEXT, estimatedInputTokens, text, opts);
  }

  // ── Research check ────────────────────────────────────────────────────────
  if (RESEARCH_PATTERNS.some(p => p.test(text))) {
    return build(REQUEST_CLASSES.RESEARCH, estimatedInputTokens, text, opts);
  }

  // ── Default: chat ─────────────────────────────────────────────────────────
  return build(REQUEST_CLASSES.CHAT, estimatedInputTokens, text, opts);
}

function build(requestClass, estimatedInputTokens, prompt, opts) {
  const userIntent = extractUserIntent(prompt, opts);
  return {
    requestClass,
    estimatedInputTokens,
    expectedOutputTokens: CLASS_OUTPUT_TOKENS[requestClass] ?? 500,
    recommendedMinTier:   CLASS_MIN_TIER[requestClass] ?? 1,
    userIntent,
  };
}
