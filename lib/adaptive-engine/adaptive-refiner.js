/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Adaptive Refinement & Stopping Controller (Phase 13 & Phase 28)
 * ═════════════════════════════════════════════════════════════════════════════
 * Orchestrates closed-loop self-refinement:
 * If a draft response satisfies deterministic checks and quality thresholds,
 * it exits immediately (adaptive stopping). Otherwise, it generates targeted
 * repair directives and prompts the model for an improved draft (bounded to max 2 passes).
 */

import { verifyDeterministically } from './deterministic-verifier.js';
import { defendAgainstHallucination } from './hallucination-defense.js';
import { critiqueResponse } from './response-critic.js';

export const MAX_REFINEMENT_PASSES = 2;

/**
 * Determine whether a draft response requires adaptive refinement.
 *
 * @param {object} params
 * @param {string} params.prompt - user prompt
 * @param {string} params.draft - candidate draft
 * @param {object} params.intent - output from classifyAdaptiveIntent
 * @param {object} params.answerContract - output from buildAnswerContract
 * @param {object} [params.context] - { searchResult, documentContent }
 * @param {number} [params.currentPass] - current refinement pass index (0-indexed)
 * @param {number} [params.previousScore] - score from prior pass
 * @returns {{
 *   needsRefinement: boolean,
 *   reason: string,
 *   repairPrompt: string|null,
 *   criticReport: object,
 *   deterministicResult: object,
 *   hallucinationResult: object
 * }}
 */
export function evaluateRefinementNeed({
  prompt,
  draft,
  intent = {},
  answerContract = {},
  context = {},
  currentPass = 0,
  previousScore = 0,
}) {
  // Step 1: Run deterministic verifier
  const deterministicResult = verifyDeterministically(draft, answerContract, context);

  // Step 2: Run hallucination defense
  const hallucinationResult = defendAgainstHallucination(draft, context.searchResult || context.documentContent);

  // Step 3: Run multi-dimensional critic
  const criticReport = critiqueResponse({
    prompt,
    response: draft,
    intent,
    answerContract,
    deterministicResult,
    hallucinationResult,
  });

  // Check Pass Limits
  if (currentPass >= MAX_REFINEMENT_PASSES) {
    return {
      needsRefinement: false,
      reason: `Max refinement passes (${MAX_REFINEMENT_PASSES}) reached. Returning best available response.`,
      repairPrompt: null,
      criticReport,
      deterministicResult,
      hallucinationResult,
    };
  }

  // Check Adaptive Stopping (Quality target achieved)
  if (criticReport.passed && deterministicResult.isValid) {
    return {
      needsRefinement: false,
      reason: 'Draft passed all deterministic checks and quality thresholds.',
      repairPrompt: null,
      criticReport,
      deterministicResult,
      hallucinationResult,
    };
  }

  // Check Marginal Improvement (< 3% improvement after pass 1)
  if (currentPass > 0 && Math.abs(criticReport.overallScore - previousScore) < 0.03) {
    return {
      needsRefinement: false,
      reason: 'Adaptive stopping: marginal improvement < 3%. Halting refinement to save tokens.',
      repairPrompt: null,
      criticReport,
      deterministicResult,
      hallucinationResult,
    };
  }

  // Refinement needed: construct targeted repair prompt
  const repairParts = [
    `REFINEMENT REQUEST: Your previous draft had specific issues that must be corrected.`,
    `User Question: "${prompt}"`,
    `Previous Score: ${(criticReport.overallScore * 100).toFixed(0)}% (Target: ${(criticReport.threshold * 100).toFixed(0)}%)`,
    `\nSpecific Deficiencies Identified:`,
    ...criticReport.identifiedDefects.map((defect, i) => `${i + 1}. ${defect}`),
  ];

  if (!deterministicResult.isValid) {
    repairParts.push('\nCritical Formatting Rules:');
    repairParts.push('- All code fences MUST be properly balanced (count of ``` must be even).');
    repairParts.push('- Output MUST NOT leave <think> tags unclosed.');
  }

  repairParts.push('\nGenerate a REFINED, COMPLETE, and CORRECT version of the response directly fixing these issues.');

  return {
    needsRefinement: true,
    reason: `Draft score (${criticReport.overallScore}) below threshold (${criticReport.threshold}) or has ${criticReport.identifiedDefects.length} defect(s).`,
    repairPrompt: repairParts.join('\n'),
    criticReport,
    deterministicResult,
    hallucinationResult,
  };
}
