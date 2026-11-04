/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Complexity Intelligence & Adaptive Compute Depth (Phase 4 & Phase 27)
 * ════════════════════════════════════════════════════════════════════════════════
 * Evaluates the cognitive, structural, and computational complexity of requests.
 * Maps tasks into 4 tiers (LOW, MEDIUM, HIGH, CRITICAL) and selects proportional
 * pipeline depth to prevent wasting tokens on simple queries while applying deep
 * verification to mission-critical ones.
 */

import { ADAPTIVE_TASK_CATEGORIES, classifyAdaptiveIntent } from './intent-classifier.js';

export const COMPLEXITY_LEVELS = {
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
};

export const PIPELINE_DEPTHS = {
  DIRECT:        'DIRECT',        // Generate directly, no critic pass
  EVALUATE:      'EVALUATE',      // Generate -> Deterministic & Quality evaluation
  REFINED:       'REFINED',       // Generate -> Evaluate -> Verify -> Adaptive Refine (max 2)
  DEEP_GATE:     'DEEP_GATE',     // Plan -> Generate -> Multi-check -> Refine -> Final Gate
};

/**
 * Estimate task complexity from prompt, intent, and context.
 *
 * @param {string} prompt
 * @param {object} [intent] - output of classifyAdaptiveIntent (auto-derived if omitted)
 * @param {object} [context] - { hasAttachment, conversationHistory, responseMode }
 * @returns {{
 *   complexity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL',
 *   pipelineDepth: string,
 *   maxRefinements: number,
 *   requiresPlanning: boolean,
 *   tokenBudgetMultiplier: number,
 *   reasoning: string
 * }}
 */
export function estimateComplexity(prompt, intent = null, context = {}) {
  const text = String(prompt || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const resolvedIntent = (intent && intent.category) ? intent : classifyAdaptiveIntent(prompt, context);
  const category = resolvedIntent.category || ADAPTIVE_TASK_CATEGORIES.GENERAL_CHAT;
  const effort = String(context.effortLevel || context.reasoningEffort || 'auto').toLowerCase();

  // Explicit User Effort Override
  if (effort === 'low') {
    return {
      complexity: COMPLEXITY_LEVELS.LOW,
      pipelineDepth: PIPELINE_DEPTHS.DIRECT,
      maxRefinements: 0,
      requiresPlanning: false,
      tokenBudgetMultiplier: 0.6,
      reasoning: 'User selected Low Reasoning Effort (fast, direct pass).',
    };
  }
  if (effort === 'medium') {
    return {
      complexity: COMPLEXITY_LEVELS.MEDIUM,
      pipelineDepth: PIPELINE_DEPTHS.EVALUATE,
      maxRefinements: 1,
      requiresPlanning: false,
      tokenBudgetMultiplier: 1.0,
      reasoning: 'User selected Medium Reasoning Effort (standard validation).',
    };
  }
  if (effort === 'high') {
    return {
      complexity: COMPLEXITY_LEVELS.HIGH,
      pipelineDepth: PIPELINE_DEPTHS.REFINED,
      maxRefinements: 2,
      requiresPlanning: false,
      tokenBudgetMultiplier: 1.25,
      reasoning: 'User selected High Reasoning Effort (multi-pass verification and refinement).',
    };
  }
  if (effort === 'max') {
    return {
      complexity: COMPLEXITY_LEVELS.CRITICAL,
      pipelineDepth: PIPELINE_DEPTHS.DEEP_GATE,
      maxRefinements: 2,
      requiresPlanning: true,
      tokenBudgetMultiplier: 1.5,
      reasoning: 'User selected Max Reasoning Effort (deep multi-gate validation).',
    };
  }

  // 1. Check for CRITICAL complexity signals
  const criticalSignals = [
    /\b(audit|refactor entire|migrate|security vulnerability|production deployment|disaster recovery|distributed architecture)\b/i.test(text),
    /\b(identify .* issues? and (propose|implement|fix) .* test .* compare)\b/i.test(text),
    wordCount > 60 && (category === ADAPTIVE_TASK_CATEGORIES.ARCHITECTURE || category === ADAPTIVE_TASK_CATEGORIES.DEBUGGING),
    context.hasMultipleFiles || (context.hasDocuments && context.hasImages),
  ];

  if (criticalSignals.some(Boolean)) {
    return {
      complexity: COMPLEXITY_LEVELS.CRITICAL,
      pipelineDepth: PIPELINE_DEPTHS.DEEP_GATE,
      maxRefinements: 2,
      requiresPlanning: true,
      tokenBudgetMultiplier: 1.5,
      reasoning: 'Multi-stage architectural, cross-file, or high-risk task requiring deep validation.',
    };
  }

  // 2. Check for HIGH complexity signals
  const highSignals = [
    category === ADAPTIVE_TASK_CATEGORIES.ARCHITECTURE,
    category === ADAPTIVE_TASK_CATEGORIES.RESEARCH,
    category === ADAPTIVE_TASK_CATEGORIES.COMPARISON && wordCount > 8,
    category === ADAPTIVE_TASK_CATEGORIES.CODING && (wordCount > 6 || /```|\b(debounce|typescript|function|algorithm|class|api|handler)\b/i.test(text)),
    category === ADAPTIVE_TASK_CATEGORIES.DEBUGGING,
    context.responseMode === 'research',
    wordCount > 40,
  ];

  if (highSignals.some(Boolean)) {
    return {
      complexity: COMPLEXITY_LEVELS.HIGH,
      pipelineDepth: PIPELINE_DEPTHS.REFINED,
      maxRefinements: 2,
      requiresPlanning: false,
      tokenBudgetMultiplier: 1.25,
      reasoning: 'In-depth reasoning, synthesis, or non-trivial coding task requiring verification and refinement.',
    };
  }

  // 3. Check for LOW complexity signals
  const lowSignals = [
    wordCount <= 4 && /^(hi|hello|hey|thanks|thank you|good morning|who are you|ok|okay)\b/i.test(text),
    /^\s*\d+\s*[\+\-\*\/]\s*\d+\s*\??\s*$/.test(text), // Simple arithmetic: 2 + 2?
    wordCount <= 6 && /^(what is|who is|where is|when was|capital of|define)\b/i.test(text) && !/architecture|quantum|paradox|system|hook|react/i.test(text),
    category === ADAPTIVE_TASK_CATEGORIES.GENERAL_CHAT && wordCount <= 5,
  ];

  if (lowSignals.some(Boolean)) {
    return {
      complexity: COMPLEXITY_LEVELS.LOW,
      pipelineDepth: PIPELINE_DEPTHS.DIRECT,
      maxRefinements: 0,
      requiresPlanning: false,
      tokenBudgetMultiplier: 0.6,
      reasoning: 'Direct factual, conversational, or elementary query requiring zero verification overhead.',
    };
  }

  // 4. Default: MEDIUM complexity
  return {
    complexity: COMPLEXITY_LEVELS.MEDIUM,
    pipelineDepth: PIPELINE_DEPTHS.EVALUATE,
    maxRefinements: 1,
    requiresPlanning: false,
    tokenBudgetMultiplier: 1.0,
    reasoning: 'Standard informational or explanatory task needing basic output validation.',
  };
}
