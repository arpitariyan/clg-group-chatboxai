/**
 * Computes a complexity score for a search query.
 * Replaces the length-based unbounded scoring with a capped contribution.
 * @param {string} query 
 * @returns {number} complexity score from 0 to 100
 */
export function computeComplexityScore(query) {
    if (!query) return 0;
    const lowerQuery = query.toLowerCase();
    let score = 0;

    const complexKeywords = ['compare', 'vs', 'latest', 'benchmark', 'pricing', 'best', '2025', '2026', 'difference'];
    complexKeywords.forEach(kw => {
        if (lowerQuery.includes(kw)) score += 15;
    });

    const commas = (lowerQuery.match(/,/g) || []).length;
    score += Math.min(commas * 10, 20); // entity-count contribution capped

    const words = lowerQuery.split(/\s+/).length;
    // Length sirf ek nudge de, poora score na decide kare
    score += Math.min(Math.max(0, words - 12) * 2, 20);

    return Math.min(score, 100);
}

/**
 * Determines if a query requires an internet search, or if it's a reasoning/puzzle 
 * that the model can answer directly without search.
 * @param {string} query 
 * @returns {boolean}
 */
export function needsSearch(query) {
    if (!query) return false;
    const lowerQuery = query.toLowerCase();

    const factualMarkers = ['latest', 'news', '2024', '2025', '2026', 'update', 'price', 'who', 'where', 'when', 'which', 'vs', 'compare', 'review', 'best', 'buy', 'how to'];
    const hasFactualMarker = factualMarkers.some(kw => lowerQuery.includes(kw));

    const reasoningPatterns = [
        /agar\s+.+\s+(toh|to)\b/i,        // Hindi "agar...toh" conditional
        /\bsuppose\b/i,
        /\bimagine\b/i,
        /\bwhat\s+would\s+happen\s+if\b/i,
        /\bthought\s+experiment\b/i,
        /\bcalculate\b/i,
        /\bprove\b/i,
    ];
    const hasReasoningPattern = reasoningPatterns.some(rx => rx.test(query));

    if (hasReasoningPattern && !hasFactualMarker) return false;
    if (lowerQuery.length > 150 && !hasFactualMarker) return false;

    return true;
}
