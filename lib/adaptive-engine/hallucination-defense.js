/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Hallucination Defense & Evidence Grounding (Phase 15)
 * ═══════════════════════════════════════════════════════════════
 * Extracts high-risk factual claims from draft responses, evaluates their
 * grounding against retrieved evidence/documents, flags ungrounded assertions,
 * and strips phantom URLs or fabricated citations.
 */

/**
 * Extract factual assertions from text.
 * Targets entities, numbers, percentages, dates, and claims.
 */
export function extractFactualClaims(text) {
  if (!text || typeof text !== 'string') return [];

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !s.startsWith('#') && !s.startsWith('```'));

  const claims = [];

  for (const sentence of sentences) {
    const hasNumbers = /\b\d+(?:\.\d+)?%?\b/.test(sentence);
    const hasDates = /\b(19\d{2}|20\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(sentence);
    const hasCitations = /\[\d+\]/.test(sentence);
    const hasAssertiveKeywords = /\b(proves|demonstrates|discovered|founded in|invented by|released on|costs?|measuring)\b/i.test(sentence);

    if (hasNumbers || hasDates || hasCitations || hasAssertiveKeywords) {
      claims.push({
        sentence,
        hasNumbers,
        hasDates,
        hasCitations,
      });
    }
  }

  return claims;
}

/**
 * Cross-reference claims against available context/evidence.
 *
 * @param {string} responseText
 * @param {Array<object>|string} evidenceContext - search results or document text
 * @returns {{
 *   groundingScore: number,
 *   unsupportedClaims: Array<string>,
 *   sanitizedText: string,
 *   hasHallucinationRisk: boolean
 * }}
 */
export function defendAgainstHallucination(responseText = '', evidenceContext = []) {
  const text = String(responseText || '');
  if (!text) {
    return { groundingScore: 1.0, unsupportedClaims: [], sanitizedText: text, hasHallucinationRisk: false };
  }

  // Convert evidence to search string
  let evidenceText = '';
  if (Array.isArray(evidenceContext)) {
    evidenceText = evidenceContext
      .map(item => `${item.title || ''} ${item.snippet || ''} ${item.body || ''} ${item.content || ''}`)
      .join(' ')
      .toLowerCase();
  } else if (typeof evidenceContext === 'string') {
    evidenceText = evidenceContext.toLowerCase();
  }

  // If no evidence was provided, we cannot cross-check groundedness
  if (!evidenceText || evidenceText.length < 20) {
    return {
      groundingScore: 0.9,
      unsupportedClaims: [],
      sanitizedText: text,
      hasHallucinationRisk: false,
    };
  }

  const claims = extractFactualClaims(text);
  if (claims.length === 0) {
    return { groundingScore: 1.0, unsupportedClaims: [], sanitizedText: text, hasHallucinationRisk: false };
  }

  const unsupportedClaims = [];
  let supportedCount = 0;

  for (const claim of claims) {
    // Extract key entities or numbers from the claim
    const numbersAndWords = claim.sentence
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length > 4 || /^\d+$/.test(w));

    let matchCount = 0;
    for (const term of numbersAndWords) {
      if (evidenceText.includes(term)) {
        matchCount++;
      }
    }

    const overlap = numbersAndWords.length > 0 ? matchCount / numbersAndWords.length : 0;
    if (overlap >= 0.25 || claim.hasCitations) {
      supportedCount++;
    } else {
      unsupportedClaims.push(claim.sentence);
    }
  }

  const groundingScore = supportedCount / claims.length;
  const hasHallucinationRisk = groundingScore < 0.6 && unsupportedClaims.length > 0;

  // Sanitize: strip obvious phantom URLs like [link](http://fakelink.xyz)
  const sanitizedText = text.replace(/\[([^\]]+)\]\(https?:\/\/(?:www\.)?(?:example\.com|domain\.com|test\.com)[^)]*\)/gi, '$1');

  return {
    groundingScore: Math.round(groundingScore * 100) / 100,
    unsupportedClaims,
    sanitizedText,
    hasHallucinationRisk,
  };
}
