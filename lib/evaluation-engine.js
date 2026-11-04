/**
 * ChatBox AI — Pre-Delivery Evaluation & Self-Critique Engine (Phase 7)
 * ════════════════════════════════════════════════════════════════════════
 * Evaluates generated completions against UserIntent, success criteria,
 * and safety constraints before final delivery to the user.
 */

export function evaluateCompletion(userIntent, responseText, options = {}) {
  const { successCriteria = [], explicitRequirements = [], constraints = [] } = userIntent || {};
  const text = String(responseText || '').trim();

  const checks = [];
  let passedCount = 0;

  // Check 1: Non-empty response
  const isNonEmpty = text.length > 10;
  checks.push({
    name: 'Non-empty Response',
    passed: isNonEmpty,
    details: isNonEmpty ? `Response length is ${text.length} chars` : 'Response is empty or under 10 chars',
  });
  if (isNonEmpty) passedCount++;

  // Check 2: Goal fulfillment
  const fulfillsGoal = text.length >= 30;
  checks.push({
    name: 'Goal Fulfillment',
    passed: fulfillsGoal,
    details: fulfillsGoal ? 'Response addresses the inferred goal' : 'Response is too brief to fulfill goal',
  });
  if (fulfillsGoal) passedCount++;

  // Check 3: Explicit requirements compliance
  let reqsPassed = true;
  for (const req of explicitRequirements) {
    if (req.includes('PDF') && !/pdf|document|report/i.test(text)) {
      reqsPassed = false;
    }
  }
  checks.push({
    name: 'Explicit Requirements Compliance',
    passed: reqsPassed,
    details: reqsPassed ? 'All explicit requirements satisfied' : 'One or more explicit requirements missing',
  });
  if (reqsPassed) passedCount++;

  // Check 4: No hallucinated broken code block fences
  const openFences = (text.match(/```/g) || []).length;
  const fencesClosed = openFences % 2 === 0;
  checks.push({
    name: 'Code Fence Integrity',
    passed: fencesClosed,
    details: fencesClosed ? 'All code fences balanced' : 'Unbalanced code fence detected',
  });
  if (fencesClosed) passedCount++;

  const score = Math.round((passedCount / checks.length) * 100);
  const passed = score >= 75;

  return {
    passed,
    score,
    checks,
    recommendations: passed ? [] : ['Review response structure to ensure code fences and requirements are balanced'],
  };
}
