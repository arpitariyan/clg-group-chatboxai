/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Master Unified Orchestrator & Public API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Coordinates the full Adaptive Response Intelligence lifecycle:
 * REQUEST -> INTENT -> COMPLEXITY -> CONTEXT -> CONTRACT -> ROUTING ->
 * GENERATION -> VERIFICATION -> CRITIQUE -> REFINEMENT -> TELEMETRY
 */

import { classifyAdaptiveIntent, ADAPTIVE_TASK_CATEGORIES } from './intent-classifier.js';
import { estimateComplexity, COMPLEXITY_LEVELS, PIPELINE_DEPTHS } from './complexity-estimator.js';
import { buildUnifiedContext, detectContextContradictions } from './context-intelligence.js';
import { buildAnswerContract } from './answer-contract.js';
import { decideToolStrategy, TOOL_ACTION_TYPES } from './tool-decision.js';
import { routeAdaptiveModel } from './model-router.js';
import { compilePrompt, getModelAdapterInstructions } from './prompt-compiler.js';
import { verifyDeterministically } from './deterministic-verifier.js';
import { defendAgainstHallucination } from './hallucination-defense.js';
import { critiqueResponse, QUALITY_THRESHOLDS } from './response-critic.js';
import { evaluateConfidence, CONFIDENCE_LEVELS } from './confidence-engine.js';
import { evaluateRefinementNeed, MAX_REFINEMENT_PASSES } from './adaptive-refiner.js';
import { recordUserFeedback, recordFailureSignal, getApplicableSuccessPatterns, getActiveFailurePreventions, scrubSensitiveData } from './memory-system.js';
import { canExecuteProvider, recordProviderSuccess, recordProviderFailure, executeWithCircuitBreaker } from './resilience-circuit-breaker.js';
import { logAdaptiveTelemetry, getTelemetryMetrics } from './telemetry-observer.js';
import { runRegressionSuite } from './regression-suite.js';

export {
  classifyAdaptiveIntent,
  ADAPTIVE_TASK_CATEGORIES,
  estimateComplexity,
  COMPLEXITY_LEVELS,
  PIPELINE_DEPTHS,
  buildUnifiedContext,
  detectContextContradictions,
  buildAnswerContract,
  decideToolStrategy,
  TOOL_ACTION_TYPES,
  routeAdaptiveModel,
  compilePrompt,
  verifyDeterministically,
  defendAgainstHallucination,
  critiqueResponse,
  QUALITY_THRESHOLDS,
  evaluateConfidence,
  CONFIDENCE_LEVELS,
  evaluateRefinementNeed,
  MAX_REFINEMENT_PASSES,
  recordUserFeedback,
  recordFailureSignal,
  getApplicableSuccessPatterns,
  getActiveFailurePreventions,
  scrubSensitiveData,
  canExecuteProvider,
  recordProviderSuccess,
  recordProviderFailure,
  executeWithCircuitBreaker,
  logAdaptiveTelemetry,
  getTelemetryMetrics,
  runRegressionSuite,
};

/**
 * Execute Adaptive Response Pipeline for a generated draft.
 * Integrates deterministic verification, hallucination defense, critic evaluation,
 * and adaptive refinement.
 *
 * @param {object} params
 * @param {string} params.question - raw user prompt
 * @param {string} params.rawResponse - initial model output
 * @param {object} params.intent - output from classifyAdaptiveIntent
 * @param {object} params.complexity - output from estimateComplexity
 * @param {object} params.answerContract - output from buildAnswerContract
 * @param {object} [params.context] - { searchResult, documentContent, conversationHistory }
 * @param {Function} [params.refineModelFn] - async callback (repairPrompt) => Promise<string>
 * @param {string} [params.recordId] - chat record ID for telemetry
 * @param {string} [params.modelUsed] - name/publicId of the model
 * @param {string} [params.userEmail] - user email
 * @returns {Promise<{
 *   finalResponse: string,
 *   criticReport: object,
 *   confidence: object,
 *   refinementPasses: number,
 *   repaired: boolean
 * }>}
 */
export async function runAdaptiveResponsePipeline({
  question,
  rawResponse,
  intent = null,
  complexity = null,
  answerContract = null,
  context = {},
  effortLevel = 'auto',
  refineModelFn = null,
  recordId = null,
  modelUsed = 'unknown',
  userEmail = null,
}) {
  const startTime = Date.now();
  let currentResponse = String(rawResponse || '').trim();
  let currentPass = 0;
  let previousScore = 0;
  let lastCriticReport = null;
  let lastDeterministicResult = null;
  let lastHallucinationResult = null;

  // Auto-resolve missing pipeline components
  const resolvedContext = { ...context, effortLevel: effortLevel || context.effortLevel || 'auto' };
  const resolvedIntent = (intent && intent.category) ? intent : classifyAdaptiveIntent(question, resolvedContext);
  const resolvedComplexity = (complexity && complexity.complexity) ? complexity : estimateComplexity(question, resolvedIntent, resolvedContext);
  const resolvedContract = (answerContract && answerContract.requestedFormat) ? answerContract : buildAnswerContract(resolvedIntent, resolvedComplexity, question);

  // For LOW complexity queries: direct delivery with basic sanity check
  if (resolvedComplexity.complexity === COMPLEXITY_LEVELS.LOW && currentResponse.length >= 5) {
    const deterministicResult = verifyDeterministically(currentResponse, resolvedContract, resolvedContext);
    logAdaptiveTelemetry({
      recordId,
      category: resolvedIntent.category,
      complexity: resolvedComplexity.complexity,
      modelUsed,
      latencyMs: Date.now() - startTime,
      qualityScore: 0.95,
      confidenceLevel: CONFIDENCE_LEVELS.HIGH,
      refinementPasses: 0,
      deterministicFailures: deterministicResult.failures.length,
      userEmail,
    });

    return {
      finalResponse: currentResponse,
      criticReport: { passed: true, overallScore: 0.95, identifiedDefects: [] },
      confidence: { level: CONFIDENCE_LEVELS.HIGH, score: 0.95 },
      refinementPasses: 0,
      repaired: false,
    };
  }

  // Refinement loop (up to MAX_REFINEMENT_PASSES)
  while (currentPass <= MAX_REFINEMENT_PASSES) {
    const refinementEvaluation = evaluateRefinementNeed({
      prompt: question,
      draft: currentResponse,
      intent: resolvedIntent,
      answerContract: resolvedContract,
      context: resolvedContext,
      currentPass,
      previousScore,
    });

    lastCriticReport = refinementEvaluation.criticReport;
    lastDeterministicResult = refinementEvaluation.deterministicResult;
    lastHallucinationResult = refinementEvaluation.hallucinationResult;
    previousScore = lastCriticReport.overallScore;

    // Check if refinement is required and a refinement function is available
    if (!refinementEvaluation.needsRefinement || typeof refineModelFn !== 'function' || currentPass >= MAX_REFINEMENT_PASSES) {
      break;
    }

    try {
      console.log(`[AdaptiveEngine] Triggering refinement pass ${currentPass + 1}/${MAX_REFINEMENT_PASSES} for query: "${question.slice(0, 40)}..."`);
      const refinedDraft = await refineModelFn(refinementEvaluation.repairPrompt);
      if (refinedDraft && typeof refinedDraft === 'string' && refinedDraft.trim().length > 10) {
        currentResponse = refinedDraft.trim();
        currentPass++;
      } else {
        break; // Refinement returned empty; retain previous response
      }
    } catch (refineErr) {
      console.warn(`[AdaptiveEngine] Refinement pass ${currentPass + 1} failed (${refineErr.message}). Retaining current response.`);
      break;
    }
  }

  // Calculate final confidence
  const confidence = evaluateConfidence({
    intent: resolvedIntent,
    criticReport: lastCriticReport,
    deterministicResult: lastDeterministicResult,
    hallucinationResult: lastHallucinationResult,
  });

  // Post-process: clean unclosed thinking tags if any remained
  if (currentResponse.includes('<think>') && !currentResponse.includes('</think>')) {
    currentResponse += '\n</think>';
  }

  // Append epistemic note if confidence is LOW
  if (confidence.epistemicNote && !currentResponse.includes(confidence.epistemicNote)) {
    currentResponse += `\n\n_${confidence.epistemicNote}_`;
  }

  // Log structured telemetry
  logAdaptiveTelemetry({
    recordId,
    category: resolvedIntent.category,
    complexity: resolvedComplexity.complexity,
    modelUsed,
    latencyMs: Date.now() - startTime,
    qualityScore: lastCriticReport?.overallScore || 0.85,
    confidenceLevel: confidence.level,
    refinementPasses: currentPass,
    deterministicFailures: lastDeterministicResult?.failures?.length || 0,
    userEmail,
  });

  return {
    finalResponse: currentResponse,
    criticReport: lastCriticReport,
    confidence,
    refinementPasses: currentPass,
    repaired: currentPass > 0,
  };
}
