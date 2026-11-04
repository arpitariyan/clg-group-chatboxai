/**
 * PEARL System Prompt Module
 * =============================================================
 * Implements the PEARL framework (Parse, Extract, Approach, Resolve, Look Back)
 * for generating higher-quality, more accurate, and user-satisfying AI responses.
 *
 * All exported functions are gated behind feature flags in the caller.
 * Token budget: individual functions are validated; combined budget must not exceed 500 tokens.
 * The `getCondensedPearlInstruction()` fallback is pre-verified to stay < 150 tokens.
 */

/**
 * Search mode PEARL instructions, adapted by query complexity.
 * @param {'simple'|'medium'|'complex'} queryComplexity
 * @returns {string}
 */
export function getPearlSearchInstruction(queryComplexity = 'medium') {
  if (queryComplexity === 'simple') {
    // Minimal overhead for simple queries
    return `Search Quality Rules:
- Answer the question directly in the first sentence.
- If the query is ambiguous, address the most likely interpretation first, then briefly note alternatives.
- Do not pad with unnecessary context.`;
  }

  if (queryComplexity === 'complex') {
    return `Search Quality Protocol (Complex Query):
- PARSE: Identify all sub-questions hidden in the query. Address every one.
- RESOLVE: Arrange information logically — most important point first, supporting details after.
- If multiple perspectives exist, cover all major angles concisely.
- If the query is ambiguous, address the most likely interpretation first, then briefly note alternatives.
- VERIFY: Before finalizing, confirm every sub-question has been answered.`;
  }

  // medium (default)
  return `Search Quality Rules:
- PARSE: Identify the user's core intent and any hidden sub-questions.
- RESOLVE: Lead with the direct answer, then provide supporting details in logical order.
- If the query is ambiguous, address the most likely interpretation first, then briefly note alternatives.
- If multiple perspectives exist, cover the most important ones.`;
}

/**
 * Deep Research mode PEARL full protocol.
 * @returns {string}
 */
export function getPearlResearchInstruction() {
  return `Deep Research Quality Protocol (PEARL):
- PARSE: Identify the user's true intent (information, comparison, decision, solution) and all sub-questions.
- EXTRACT: Identify key entities, constraints, dates, and context from the query.
- APPROACH: Break the query into 3-5 focused sub-questions, each covering a different angle.
- RESOLVE: Synthesize information logically — overview first, then structured sections, then recommendation.
- LOOK BACK: Before outputting, verify every sub-question is answered and no factual claim is unverified.
- CROSS-VERIFY: Compare claims across all sources. For each major finding, assess: High (multiple sources agree), Medium (one reliable source), or Low (uncertain/single source).
- LANGUAGE: Match the user's language and tone exactly (English, Hindi, or Hinglish).`;
}

/**
 * Verification footer — a self-check checklist the AI must perform before outputting.
 * @param {'search'|'research'} mode
 * @returns {string}
 */
export function getVerificationFooter(mode = 'search') {
  if (mode === 'research') {
    return `Pre-Output Verification (Research):
☐ Every sub-question answered?
☐ Contradictions between sources explicitly flagged?
☐ No unverified facts stated as confirmed?
☐ Format clear and scannable (headings, bullets)?
☐ Confidence level included at the end?`;
  }

  return `Pre-Output Check (Search):
☐ Core question directly answered in the first sentence?
☐ No irrelevant padding or filler?
☐ Tone matches the user's language style?`;
}

/**
 * Edge case handling rules injected into the system contract.
 * @returns {string}
 */
export function getEdgeCaseRules() {
  return `Edge Case Handling:
- AMBIGUOUS query: Address the most likely intent first; note alternative interpretations briefly.
- OUTSIDE KNOWLEDGE: Honestly state "I don't have reliable information on this" — never guess confidently.
- MULTIPLE INTENTS: Address each intent separately — never skip one.
- FRUSTRATED USER (repeat ask / "samajh nahi aaya"): Switch approach — simpler language, different angle, add a concrete example.`;
}

/**
 * Condensed fallback — used when the combined PEARL additions exceed the 500-token budget.
 * Pre-verified to be well under 150 tokens.
 * @returns {string}
 */
export function getCondensedPearlInstruction() {
  return `Quality Rules: Answer directly, cover all sub-questions, match the user's language. For research: cross-verify sources, flag contradictions, include confidence level.`;
}
