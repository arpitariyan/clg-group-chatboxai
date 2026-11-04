/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Adaptive Model Router (Phase 8)
 * ═══════════════════════════════════════════════════════════════
 * Upgrades model selection by incorporating task category, complexity tier,
 * latency requirements, multimodal needs, and plan access controls.
 * Preserves the application's existing model registry and budget router.
 */

import { MODEL_REGISTRY, findModel } from '../models-registry.js';
import { ADAPTIVE_TASK_CATEGORIES } from './intent-classifier.js';
import { COMPLEXITY_LEVELS } from './complexity-estimator.js';

export const DEFAULT_MODELS = {
  FAST_FREE:        'chatboxai/llama-3.3-70b',
  MULTIMODAL_FREE:  'chatboxai/gemini-2.5-flash',
  REASONING_PRO:    'chatboxai/claude-3.7-sonnet',
  MULTIMODAL_PRO:   'chatboxai/gemini-2.0-pro',
};

/**
 * Route request to optimal model based on plan, intent, and complexity.
 *
 * @param {object} params
 * @param {string|object} [params.selectedModel] - requested model from user/UI
 * @param {string} [params.userPlan] - 'free' | 'pro' | 'max'
 * @param {object} [params.intent] - output from classifyAdaptiveIntent
 * @param {object} [params.complexityResult] - output from estimateComplexity
 * @param {boolean} [params.hasMultimodal] - whether images/files are attached
 * @returns {{
 *   model: object,
 *   isAutoSelected: boolean,
 *   routingReason: string,
 *   recommendedFallbackPublicId: string
 * }}
 */
export function routeAdaptiveModel({
  selectedModel,
  userPlan = 'free',
  intent = {},
  complexityResult = {},
  hasMultimodal = false,
}) {
  const isPro = userPlan === 'pro' || userPlan === 'max';
  const category = intent.category || ADAPTIVE_TASK_CATEGORIES.GENERAL_CHAT;
  const complexity = complexityResult.complexity || COMPLEXITY_LEVELS.MEDIUM;

  const rawModelId = typeof selectedModel === 'string'
    ? selectedModel
    : (selectedModel?.publicId || selectedModel?.modelApi || 'auto');

  const isAuto = !rawModelId ||
    rawModelId === 'auto' ||
    rawModelId === 'best' ||
    rawModelId === 'dr-auto' ||
    rawModelId === '1';

  // 1. Explicit model selection requested by user
  if (!isAuto) {
    const candidate = findModel(rawModelId);
    if (candidate) {
      // Validate access tier
      if (candidate.isPro && !isPro) {
        // User requested Pro model on Free plan -> Downgrade gracefully
        const freeFallback = findModel(DEFAULT_MODELS.FAST_FREE) || candidate;
        return {
          model: freeFallback,
          isAutoSelected: false,
          routingReason: `Requested model ${candidate.name} requires Pro plan. Gracefully routed to ${freeFallback.name}.`,
          recommendedFallbackPublicId: DEFAULT_MODELS.MULTIMODAL_FREE,
        };
      }

      return {
        model: candidate,
        isAutoSelected: false,
        routingReason: `User explicitly requested model ${candidate.name}.`,
        recommendedFallbackPublicId: isPro ? DEFAULT_MODELS.REASONING_PRO : DEFAULT_MODELS.FAST_FREE,
      };
    }
  }

  // 2. Intelligent Auto-Routing
  // Case A: Multimodal requirement
  if (hasMultimodal || category === ADAPTIVE_TASK_CATEGORIES.MULTIMODAL_ANALYSIS) {
    const targetPublicId = isPro ? DEFAULT_MODELS.MULTIMODAL_PRO : DEFAULT_MODELS.MULTIMODAL_FREE;
    const model = findModel(targetPublicId) || findModel(DEFAULT_MODELS.MULTIMODAL_FREE);
    return {
      model,
      isAutoSelected: true,
      routingReason: 'Routed to vision/multimodal-capable model for attachment analysis.',
      recommendedFallbackPublicId: DEFAULT_MODELS.FAST_FREE,
    };
  }

  // Case B: High/Critical Reasoning or Deep Research on Pro plan
  if (isPro && (complexity === COMPLEXITY_LEVELS.HIGH || complexity === COMPLEXITY_LEVELS.CRITICAL || category === ADAPTIVE_TASK_CATEGORIES.RESEARCH || category === ADAPTIVE_TASK_CATEGORIES.ARCHITECTURE)) {
    const targetPublicId = DEFAULT_MODELS.REASONING_PRO;
    const model = findModel(targetPublicId) || findModel(DEFAULT_MODELS.FAST_FREE);
    return {
      model,
      isAutoSelected: true,
      routingReason: 'Pro tier routed to deep-reasoning Claude/Gemini model for high-complexity analysis.',
      recommendedFallbackPublicId: DEFAULT_MODELS.FAST_FREE,
    };
  }

  // Case C: Coding / Debugging tasks
  if (category === ADAPTIVE_TASK_CATEGORIES.CODING || category === ADAPTIVE_TASK_CATEGORIES.DEBUGGING) {
    const targetPublicId = DEFAULT_MODELS.FAST_FREE; // Llama 3.3 70B Versatile on Groq is top-tier for coding speed & accuracy
    const model = findModel(targetPublicId) || findModel(DEFAULT_MODELS.MULTIMODAL_FREE);
    return {
      model,
      isAutoSelected: true,
      routingReason: 'Routed to high-throughput coding-capable model (Llama 3.3 70B).',
      recommendedFallbackPublicId: DEFAULT_MODELS.MULTIMODAL_FREE,
    };
  }

  // Case D: Standard Informational / Chat
  const standardPublicId = DEFAULT_MODELS.FAST_FREE;
  const model = findModel(standardPublicId) || findModel(DEFAULT_MODELS.MULTIMODAL_FREE);
  return {
    model,
    isAutoSelected: true,
    routingReason: 'Auto-routed to fast, cost-efficient baseline model.',
    recommendedFallbackPublicId: DEFAULT_MODELS.MULTIMODAL_FREE,
  };
}
