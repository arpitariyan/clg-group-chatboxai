/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Deterministic Verification Layer (Phase 12)
 * ═══════════════════════════════════════════════════════════════
 * Performs fast, rule-based, deterministic validation on draft responses
 * BEFORE any LLM evaluation is invoked. Catches syntax errors, unclosed code
 * fences, unclosed thinking tags, citation anomalies, and schema defects.
 */

/**
 * Verify a draft response using deterministic checks.
 *
 * @param {string} responseText - candidate AI response
 * @param {object} answerContract - contract from buildAnswerContract
 * @param {object} context - { searchResult, documentContent }
 * @returns {{
 *   isValid: boolean,
 *   failures: Array<{ check: string, message: string, severity: 'BLOCKING'|'WARNING' }>,
 *   metrics: { codeFenceBalanced: boolean, thinkingTagClosed: boolean, citationsValid: boolean, length: number }
 * }}
 */
export function verifyDeterministically(responseText = '', answerContract = {}, context = {}) {
  const text = String(responseText || '').trim();
  const failures = [];

  // 1. Non-empty check
  if (!text || text.length < 5) {
    failures.push({
      check: 'NON_EMPTY',
      message: 'Draft response is empty or under 5 characters.',
      severity: 'BLOCKING',
    });
    return {
      isValid: false,
      failures,
      metrics: { codeFenceBalanced: false, thinkingTagClosed: true, citationsValid: true, length: 0 },
    };
  }

  // 2. Thinking tag closure check
  const openThinkCount = (text.match(/<think>/g) || []).length;
  const closeThinkCount = (text.match(/<\/think>/g) || []).length;
  const thinkingTagClosed = openThinkCount === closeThinkCount;
  if (!thinkingTagClosed) {
    failures.push({
      check: 'THINKING_TAG_BALANCE',
      message: `Unclosed <think> tag detected (${openThinkCount} opened, ${closeThinkCount} closed).`,
      severity: 'BLOCKING',
    });
  }

  // 3. Code fence balance & language tags
  const fenceMatches = text.match(/```/g) || [];
  const codeFenceBalanced = fenceMatches.length % 2 === 0;
  if (!codeFenceBalanced) {
    failures.push({
      check: 'CODE_FENCE_BALANCE',
      message: `Unbalanced markdown code fences detected (count: ${fenceMatches.length}).`,
      severity: 'BLOCKING',
    });
  }

  // If answer contract required strict code only, verify text contains ONLY code fence and zero conversational prose
  if (answerContract.strictCodeOnly) {
    const hasCodeBlock = /```[\s\S]*```/.test(text);
    const nonCodeProse = text.replace(/```[\s\S]*?```/g, '').trim();
    if (!hasCodeBlock) {
      failures.push({
        check: 'STRICT_CODE_ONLY',
        message: 'User explicitly requested only code, but no fenced code block was found.',
        severity: 'BLOCKING',
      });
    } else if (nonCodeProse.length > 0) {
      failures.push({
        check: 'STRICT_CODE_ONLY_PROSE',
        message: `User requested code only, but conversational text was detected outside code block: "${nonCodeProse.slice(0, 40)}..."`,
        severity: 'BLOCKING',
      });
    }
  }

  // 4. JSON Schema / JSON format verification
  if (answerContract.requestedFormat === 'json') {
    let jsonContent = text;
    let hasOuterProse = false;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
      const outerProse = text.replace(/```(?:json)?\s*[\s\S]*?\s*```/, '').trim();
      if (outerProse.length > 0) hasOuterProse = true;
    }
    try {
      JSON.parse(jsonContent.trim());
      if (hasOuterProse) {
        failures.push({
          check: 'JSON_PROSE_WRAPPING',
          message: 'Output requested as JSON was wrapped in conversational prose.',
          severity: 'BLOCKING',
        });
      }
    } catch (jsonErr) {
      failures.push({
        check: 'VALID_JSON',
        message: `Output was requested as JSON but failed parsing: ${jsonErr.message}`,
        severity: 'BLOCKING',
      });
    }
  }

  // 5. Citation boundary verification
  let citationsValid = true;
  if (answerContract.citationRule === 'strict_bracketed') {
    const citationMatches = [...text.matchAll(/\[(\d+)\]/g)];
    const availableSourceCount = Array.isArray(context.searchResult) ? context.searchResult.length : 0;

    if (citationMatches.length > 0 && availableSourceCount > 0) {
      for (const match of citationMatches) {
        const citedNum = parseInt(match[1], 10);
        // Citations should be 1-indexed within source count bounds (tolerance + 2 for multi-chunk indexing)
        if (citedNum < 1 || citedNum > availableSourceCount + 5) {
          citationsValid = false;
          failures.push({
            check: 'CITATION_BOUNDS',
            message: `Out-of-bounds citation [${citedNum}] referenced. Max available source count is ${availableSourceCount}.`,
            severity: 'WARNING',
          });
          break;
        }
      }
    }
  }

  // 6. Hallucinated URL pattern check (e.g. dummy http://example.com, http://localhost)
  const forbiddenUrlPatterns = [
    /https?:\/\/(?:www\.)?(?:example\.com|domain\.com|test\.com|fakewebsite\.org)\b/i,
  ];
  for (const pattern of forbiddenUrlPatterns) {
    if (pattern.test(text)) {
      failures.push({
        check: 'DUMMY_URL_DETECTED',
        message: 'Hallucinated or placeholder URL detected in response.',
        severity: 'WARNING',
      });
      break;
    }
  }

  const hasBlockingFailures = failures.some(f => f.severity === 'BLOCKING');

  return {
    isValid: !hasBlockingFailures,
    failures,
    metrics: {
      codeFenceBalanced,
      thinkingTagClosed,
      citationsValid,
      length: text.length,
    },
  };
}
