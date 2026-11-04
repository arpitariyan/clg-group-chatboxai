/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Confidence Engine (Phase 14)
 * ═══════════════════════════════════════════════════════════════
 * Calibrates internal response confidence into HIGH, MEDIUM, or LOW tiers
 * based on evidence grounding, ambiguity, deterministic validity, and critic score.
 * Never fabricates false certainty.
 */

export const CONFIDENCE_LEVELS = {
  HIGH:   'HIGH',
  MEDIUM: 'MEDIUM',
  LOW:    'LOW',
};

/**
 * Calculate calibrated response confidence.
 *
 * @param {object} params
 * @param {object} params.intent - output from classifyAdaptiveIntent
 * @param {object} params.criticReport - output from critiqueResponse
 * @param {object} params.deterministicResult - output from verifyDeterministically
 * @param {object} [params.hallucinationResult] - output from defendAgainstHallucination
 * @returns {{
 *   level: 'HIGH'|'MEDIUM'|'LOW',
 *   score: number,
 *   epistemicNote: string|null,
 *   reasons: Array<string>
 * }}
 */
export function evaluateConfidence({
  intent = {},
  criticReport = {},
  deterministicResult = {},
  hallucinationResult = {},
}) {
  const reasons = [];
  let score = 0.90;

  // 1. Ambiguity Penalty
  if (intent.ambiguity?.isAmbiguous) {
    score -= 0.25;
    reasons.push('User query contained significant ambiguity or underspecified references.');
  }

  // 2. Deterministic Failures Penalty
  if (deterministicResult && !deterministicResult.isValid) {
    score -= 0.35;
    reasons.push('Response encountered blocking deterministic syntax or formatting errors.');
  }

  // 3. Hallucination Risk Penalty
  if (hallucinationResult && hallucinationResult.hasHallucinationRisk) {
    score -= 0.25;
    reasons.push('One or more factual claims lacked grounding in available evidence.');
  }

  // 4. Critic Score Alignment
  const criticScore = criticReport.overallScore || 0.85;
  if (criticScore < 0.75) {
    score -= 0.20;
    reasons.push(`Low quality critic evaluation score (${criticScore}).`);
  }

  const normalizedScore = Math.max(0.1, Math.min(1.0, Math.round(score * 100) / 100));

  let level = CONFIDENCE_LEVELS.HIGH;
  let epistemicNote = null;

  if (normalizedScore < 0.60) {
    level = CONFIDENCE_LEVELS.LOW;
    epistemicNote = 'Note: This response addresses a query with multiple possible interpretations or limited available evidence. Please verify key details for your specific environment.';
  } else if (normalizedScore < 0.82) {
    level = CONFIDENCE_LEVELS.MEDIUM;
  }

  return {
    level,
    score: normalizedScore,
    epistemicNote,
    reasons,
  };
}
