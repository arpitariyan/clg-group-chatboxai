/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Answer Contract Specification (Phase 6)
 * ═══════════════════════════════════════════════════════════════
 * Generates an immutable pre-generation Answer Contract governing
 * output format, depth, structural elements, code requirements,
 * and citation expectations. Enforces strict compliance with
 * explicit user directives.
 */

import { ADAPTIVE_TASK_CATEGORIES } from './intent-classifier.js';
import { COMPLEXITY_LEVELS } from './complexity-estimator.js';

/**
 * Generate Answer Contract for the request.
 *
 * @param {object} intent - output of classifyAdaptiveIntent
 * @param {object} complexityResult - output of estimateComplexity
 * @param {string} prompt - raw user prompt
 * @param {object} options - { responseMode, citationMode, detailLevel }
 * @returns {object} AnswerContract
 */
export function buildAnswerContract(intent = {}, complexityResult = {}, prompt = '', options = {}) {
  const text = String(prompt || '').toLowerCase();
  const category = intent.category || ADAPTIVE_TASK_CATEGORIES.GENERAL_CHAT;
  const requestedFormat = intent.requestedFormat || { format: 'markdown_structured', strictCodeOnly: false };
  const complexity = complexityResult.complexity || COMPLEXITY_LEVELS.MEDIUM;

  // 1. Determine Output Depth
  let depth = 'balanced';
  if (requestedFormat.strictCodeOnly || /\b(brief|short|one line|in a sentence|quick summary)\b/.test(text)) {
    depth = 'concise';
  } else if (
    complexity === COMPLEXITY_LEVELS.HIGH ||
    complexity === COMPLEXITY_LEVELS.CRITICAL ||
    category === ADAPTIVE_TASK_CATEGORIES.ARCHITECTURE ||
    category === ADAPTIVE_TASK_CATEGORIES.RESEARCH ||
    options.detailLevel === 'detailed' ||
    options.responseMode === 'research'
  ) {
    depth = 'detailed';
  } else if (options.detailLevel === 'brief') {
    depth = 'concise';
  }

  // 2. Determine Code Requirements
  let requiresCode = false;
  let codeOnly = false;
  if (requestedFormat.strictCodeOnly) {
    requiresCode = true;
    codeOnly = true;
  } else if (
    category === ADAPTIVE_TASK_CATEGORIES.CODING ||
    category === ADAPTIVE_TASK_CATEGORIES.DEBUGGING ||
    /\b(code|snippet|script|example implementation|how to implement)\b/.test(text)
  ) {
    requiresCode = true;
  }

  // 3. Determine Table Requirements
  let requiresTable = false;
  if (requestedFormat.format === 'table' || category === ADAPTIVE_TASK_CATEGORIES.COMPARISON) {
    requiresTable = true;
  }

  // 4. Determine Steps Requirements
  let requiresSteps = false;
  if (
    requestedFormat.format === 'numbered_steps' ||
    category === ADAPTIVE_TASK_CATEGORIES.TROUBLESHOOTING ||
    category === ADAPTIVE_TASK_CATEGORIES.PLANNING ||
    /\b(step[- ]by[- ]step|how do i|how to install|walkthrough)\b/.test(text)
  ) {
    requiresSteps = true;
  }

  // 5. Determine Citation Requirements
  let citationRule = 'none';
  const hasContextSources = Boolean(options.hasContextSources || (Array.isArray(options.searchResult) && options.searchResult.length > 0));
  if (
    hasContextSources &&
    (options.responseMode === 'research' ||
      category === ADAPTIVE_TASK_CATEGORIES.RESEARCH ||
      options.citationMode === 'enabled')
  ) {
    citationRule = 'strict_bracketed'; // [1], [2] referencing provided sources
  }

  // 6. Explicit User Constraints
  const explicitConstraints = [];
  if (codeOnly) {
    explicitConstraints.push('Output ONLY the executable code inside fenced code blocks. Do not add introductory chit-chat or tutorials.');
  }
  if (requestedFormat.format === 'json') {
    explicitConstraints.push('Output ONLY valid, parseable JSON conforming to the requested schema. No markdown wrapping outside the JSON.');
  }
  if (/\b(no markdown|plain text only)\b/.test(text)) {
    explicitConstraints.push('Output raw plain text without markdown formatting.');
  }
  if (/\b(in (spanish|french|german|hindi|japanese|chinese))\b/.test(text)) {
    const langMatch = text.match(/\bin (spanish|french|german|hindi|japanese|chinese)\b/);
    if (langMatch) {
      explicitConstraints.push(`Respond completely in ${langMatch[1]}.`);
    }
  }

  // 7. Tone Specification
  const tone = intent.tone || 'helpful_balanced';

  // 8. Structural Blueprint
  const structureRules = [];
  if (codeOnly) {
    structureRules.push('Single code block with precise language tag');
  } else if (depth === 'concise') {
    structureRules.push('Direct 1-2 sentence core answer first');
    structureRules.push('Essential supporting bullet points only');
  } else if (category === ADAPTIVE_TASK_CATEGORIES.COMPARISON) {
    structureRules.push('Concise contextual overview');
    structureRules.push('Structured comparison table or criteria breakdown');
    structureRules.push('Trade-offs & edge cases');
    structureRules.push('Definitive situational recommendation');
  } else if (category === ADAPTIVE_TASK_CATEGORIES.DEBUGGING) {
    structureRules.push('Direct root-cause diagnosis');
    structureRules.push('Immediate copy-paste fix');
    structureRules.push('Verification & prevention tip');
  } else {
    structureRules.push('Direct answer leading the response');
    structureRules.push('Structured sections with concise H2 headings');
    structureRules.push('Scannable bullets with meaningful emojis (💡, ⚠️, 🔑)');
    structureRules.push('Clear conclusion or actionable takeaway');
  }

  return {
    depth,
    tone,
    requiresCode,
    codeOnly,
    requiresTable,
    requiresSteps,
    citationRule,
    explicitConstraints,
    structureRules,
    requestedFormat: requestedFormat.format,
    strictCodeOnly: requestedFormat.strictCodeOnly,
  };
}
