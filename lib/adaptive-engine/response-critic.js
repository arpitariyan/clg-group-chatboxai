/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Response Quality Critic & Multi-Dimensional Scoring (Phase 10, 11 & 26)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Evaluates draft responses using task-aware quality dimensions and calibrated
 * thresholds. Combines deterministic signals with heuristic criteria to yield
 * an actionable CriticReport containing overall score and targeted repair directives.
 */

import { ADAPTIVE_TASK_CATEGORIES } from './intent-classifier.js';

export const QUALITY_THRESHOLDS = {
  [ADAPTIVE_TASK_CATEGORIES.GENERAL_CHAT]:        0.82,
  [ADAPTIVE_TASK_CATEGORIES.FACTUAL_QUESTION]:    0.85,
  [ADAPTIVE_TASK_CATEGORIES.EXPLANATION]:         0.84,
  [ADAPTIVE_TASK_CATEGORIES.RESEARCH]:            0.88,
  [ADAPTIVE_TASK_CATEGORIES.CODING]:              0.90,
  [ADAPTIVE_TASK_CATEGORIES.DEBUGGING]:           0.90,
  [ADAPTIVE_TASK_CATEGORIES.ARCHITECTURE]:        0.88,
  [ADAPTIVE_TASK_CATEGORIES.MATHEMATICS]:         0.90,
  [ADAPTIVE_TASK_CATEGORIES.ANALYSIS]:            0.85,
  [ADAPTIVE_TASK_CATEGORIES.WRITING]:             0.82,
  [ADAPTIVE_TASK_CATEGORIES.REWRITING]:           0.85,
  [ADAPTIVE_TASK_CATEGORIES.SUMMARIZATION]:       0.85,
  [ADAPTIVE_TASK_CATEGORIES.TRANSLATION]:         0.88,
  [ADAPTIVE_TASK_CATEGORIES.BRAINSTORMING]:       0.80,
  [ADAPTIVE_TASK_CATEGORIES.PLANNING]:            0.85,
  [ADAPTIVE_TASK_CATEGORIES.COMPARISON]:          0.88,
  [ADAPTIVE_TASK_CATEGORIES.TROUBLESHOOTING]:     0.88,
  [ADAPTIVE_TASK_CATEGORIES.CREATIVE_GENERATION]: 0.80,
  [ADAPTIVE_TASK_CATEGORIES.MULTIMODAL_ANALYSIS]: 0.86,
};

/**
 * Multi-dimensional Critic Evaluation
 *
 * @param {object} params
 * @param {string} params.prompt - user prompt
 * @param {string} params.response - candidate AI response
 * @param {object} params.intent - output from classifyAdaptiveIntent
 * @param {object} params.answerContract - contract from buildAnswerContract
 * @param {object} [params.deterministicResult] - output from verifyDeterministically
 * @param {object} [params.hallucinationResult] - output from defendAgainstHallucination
 * @returns {object} CriticReport
 */
export function critiqueResponse({
  prompt,
  response,
  intent = {},
  answerContract = {},
  deterministicResult = null,
  hallucinationResult = null,
}) {
  const text = String(response || '').trim();
  const category = intent.category || ADAPTIVE_TASK_CATEGORIES.GENERAL_CHAT;
  const threshold = QUALITY_THRESHOLDS[category] || 0.82;

  const identifiedDefects = [];
  const dimensionScores = {};

  // 1. Relevance Score ($s_r$)
  const STOP_WORDS = new Set([
    'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
    'write', 'give', 'only', 'just', 'tell', 'show', 'explain', 'create', 'make',
    'calculate', 'compute', 'solve', 'provide', 'help', 'with', 'about', 'from',
    'this', 'that', 'these', 'those', 'please', 'does', 'have', 'been', 'between', 'into'
  ]);
  const promptTokens = String(prompt || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => (w.length > 2 || /^\d+$/.test(w)) && !STOP_WORDS.has(w));
  const responseTokens = new Set(text.toLowerCase().split(/[^a-z0-9]+/));
  let tokenOverlap = 0;
  for (const token of promptTokens) {
    if (responseTokens.has(token)) {
      tokenOverlap++;
      continue;
    }
    // Check root/stem match for words >= 4 chars (e.g. synthesize -> synthesis, architecture -> architectural, trade-offs -> trade)
    if (token.length >= 4) {
      const stem = token.slice(0, Math.min(token.length - 1, 5));
      const hasStemMatch = Array.from(responseTokens).some(rt => rt.length >= 4 && (rt.startsWith(stem) || stem.startsWith(rt.slice(0, 4))));
      if (hasStemMatch) {
        tokenOverlap++;
        continue;
      }
    }
  }
  const relevance = promptTokens.length > 0 ? Math.min(1.0, (tokenOverlap / promptTokens.length) + 0.35) : 0.95;
  dimensionScores.relevance = Math.round(relevance * 100) / 100;

  if (dimensionScores.relevance < 0.4) {
    identifiedDefects.push('Response appears off-topic or tangential to the primary query.');
  }

  // 2. Instruction Following Score ($s_i$)
  let instructionFollowing = 0.95;
  if (answerContract.strictCodeOnly) {
    const nonCodeProse = text.replace(/```[\s\S]*?```/g, '').trim();
    if (!/```/.test(text) || nonCodeProse.length > 0) {
      instructionFollowing -= 0.45;
      identifiedDefects.push('Violated strict code-only requirement with conversational text or missing code block.');
    }
  }
  if (answerContract.requestedFormat === 'json') {
    const trimmed = text.trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      const outerProse = trimmed.replace(/```(?:json)?\s*[\s\S]*?\s*```/, '').trim();
      if (outerProse.length > 0) {
        instructionFollowing -= 0.35;
        identifiedDefects.push('Violated strict JSON format requirement with conversational prose.');
      }
    } else {
      // Raw JSON without markdown fence
      try {
        JSON.parse(trimmed);
        // Valid clean JSON with no conversational text
      } catch {
        instructionFollowing -= 0.35;
        identifiedDefects.push('Violated strict JSON format requirement: content is neither valid fenced JSON nor valid raw JSON.');
      }
    }
  }
  if (answerContract.requiresTable && !/\|.*\|[\r\n]+\|[-:| ]+\|/.test(text)) {
    instructionFollowing -= 0.25;
    identifiedDefects.push('Comparison table was required by contract but missing from response.');
  }
  if (answerContract.requiresSteps && !/^\s*(?:\d+\.|\-|\*)\s+/m.test(text)) {
    instructionFollowing -= 0.2;
    identifiedDefects.push('Structured steps or checklist missing.');
  }
  dimensionScores.instructionFollowing = Math.max(0, Math.round(instructionFollowing * 100) / 100);

  // 3. Completeness Score ($s_m$)
  let completeness = 0.9;
  if (text.length < 80 && (category === ADAPTIVE_TASK_CATEGORIES.RESEARCH || category === ADAPTIVE_TASK_CATEGORIES.ARCHITECTURE)) {
    completeness = 0.45;
    identifiedDefects.push('Response is too superficial for a complex research/architecture task.');
  }
  dimensionScores.completeness = Math.round(completeness * 100) / 100;

  // 4. Formatting & Structure Score ($s_s$)
  let formatting = 0.95;
  if (deterministicResult && !deterministicResult.isValid) {
    formatting -= 0.3;
    identifiedDefects.push(...deterministicResult.failures.map(f => f.message));
  }
  dimensionScores.formatting = Math.max(0, Math.round(formatting * 100) / 100);

  // 5. Correctness & Grounding Score ($s_c$)
  let correctness = 0.92;
  if (hallucinationResult && hallucinationResult.hasHallucinationRisk) {
    correctness -= 0.25;
    identifiedDefects.push(`Unsupported factual assertions detected: ${hallucinationResult.unsupportedClaims.slice(0, 2).join('; ')}`);
  }
  dimensionScores.correctness = Math.round(correctness * 100) / 100;

  // 6. Task Specific Scores ($s_t$)
  let taskSpecific = 0.9;
  if (category === ADAPTIVE_TASK_CATEGORIES.CODING || category === ADAPTIVE_TASK_CATEGORIES.DEBUGGING) {
    const hasCodeFences = /```[a-z0-9_]*\n[\s\S]*?\n```/i.test(text);
    if (!hasCodeFences) {
      taskSpecific = 0.5;
      identifiedDefects.push('Coding answer lacks properly tagged fenced code blocks.');
    }
  } else if (category === ADAPTIVE_TASK_CATEGORIES.RESEARCH) {
    const hasCitations = /\[\d+\]/.test(text);
    if (!hasCitations && answerContract.citationRule === 'strict_bracketed') {
      taskSpecific = 0.6;
      identifiedDefects.push('Research response lacks bracketed source citations.');
    }
  }
  dimensionScores.taskSpecific = Math.round(taskSpecific * 100) / 100;

  // Weighted overall calculation
  const overallScore = Math.round(
    (dimensionScores.relevance * 0.20 +
      dimensionScores.instructionFollowing * 0.20 +
      dimensionScores.completeness * 0.15 +
      dimensionScores.formatting * 0.15 +
      dimensionScores.correctness * 0.15 +
      dimensionScores.taskSpecific * 0.15) * 100
  ) / 100;

  const passed = overallScore >= threshold && identifiedDefects.length === 0;

  // Build targeted repair advice
  let repairAdvice = '';
  if (!passed && identifiedDefects.length > 0) {
    repairAdvice = `Refinement Directives:\n${identifiedDefects.map((d, i) => `${i + 1}. ${d}`).join('\n')}\nEnsure all code fences are properly balanced and explicit constraints are strictly fulfilled.`;
  }

  return {
    passed,
    overallScore,
    threshold,
    category,
    dimensionScores,
    identifiedDefects,
    repairAdvice,
  };
}
