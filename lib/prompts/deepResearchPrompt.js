/**
 * Deep Research Master Synthesis Prompts
 * Extracted and optimized from the Master System Prompt.
 * Trims out retrieval/tool usage to strictly focus on verifying, synthesizing, and formatting.
 *
 * Upgraded with PEARL Method (Parse, Extract, Approach, Resolve, Look Back) integration.
 */

export function getDeepResearchBlueprint(isSimplified = false) {
    if (isSimplified) {
        return `
Response Blueprint (Deep Research):
- Structure your response using markdown.
- Use short ## headings for each major section; prefix each heading with the right emoji (📋 Summary, 🔑 Key Details, ⚠️ Contradictions & Conflicts).
- Bullet points: prefix tip bullets with 💡, warning bullets with ⚠️, key-concept bullets with 🔑.
- CRITICAL: You MUST include citations for EVERY factual claim using bracketed numbers like [1], [2]. Do NOT invent URLs.
- CROSS-VERIFY: Actively compare claims across sources. If sources conflict, you MUST explicitly mention both viewpoints in the ⚠️ Contradictions & Conflicts section and explain why they differ (time difference, regional variance, source bias, etc.).
- CONFIDENCE GRADING: For each major finding, assess — High (multiple sources agree), Medium (one reliable source), or Low (uncertain/single source).
- End your response with exactly this line: ✅ FINAL CONFIDENCE LEVEL: [High / Medium / Low] (choose one based on overall source agreement).`;
    }

    return `
Response Blueprint (Deep Research):
- Structure your response using markdown.
- Use short ## headings for each major section; prefix each heading with the right emoji (📋 Executive Summary, 🔑 Detailed Analysis, 💡 Key Findings, ⚠️ Consensus & Contradictions).
- Bullet points: prefix tip bullets with 💡, warning bullets with ⚠️, key-concept bullets with 🔑.
- CRITICAL: You MUST include citations for EVERY factual claim, statistic, or specific detail using bracketed numbers like [1], [2] corresponding to the source ID. Do NOT invent URLs or footnote links.
- CROSS-VERIFY: Actively compare sources and explicitly detect and flag any discrepancies or contradictions in the ⚠️ Consensus & Contradictions section. For each conflict, explain WHY sources differ (e.g., different time periods, regional differences, methodological differences, source bias).
- CONFIDENCE GRADING: For each major finding, internally assess: High (multiple independent sources agree), Medium (one reliable source), or Low (uncertain, single source, or outdated).
- Synthesize information across sources. Do not just summarize sources sequentially — cross-reference and connect them.
- Structured output order: Brief overview (1-2 lines) → Structured sections with headings → Comparison table if applicable → Final recommendation/summary.
- End your response with exactly this line: ✅ FINAL CONFIDENCE LEVEL: [High / Medium / Low] (choose one based on overall source agreement).`;
}

export function getDeepResearchThinkingInstruction(isSimplified = false) {
    if (isSimplified) {
        return `
THINKING MODE ENABLED (PEARL Framework):
Before providing your final answer, write your step-by-step reasoning enclosed exactly within <think> and </think> tags.
Follow these stages in your thinking (keep it EXTREMELY CONCISE — maximum 150 words total):
1. PARSE: What is the user's actual intent? What sub-questions are hidden in the query?
2. EXTRACT: Key entities, constraints, and context identified.
3. APPROACH: Is this a simple fact or deep research? What angles must be covered?
4. LOOK BACK: Is the planned answer complete? Any unverified claims?
You MUST output the closing </think> tag before writing your final response.`;
    }

    return `
THINKING MODE ENABLED (PEARL Framework):
Before providing your final answer, write your step-by-step reasoning enclosed exactly within <think> and </think> tags.
Follow these 5 stages in your thinking (keep it CONCISE — maximum 200 words total):
1. PARSE: What is the user's true intent (information, comparison, decision, solution)? What sub-questions are hidden?
2. EXTRACT: Key entities, constraints, dates, and context from the query.
3. APPROACH: Break the query into 3-5 focused sub-questions covering different angles.
4. RESOLVE: How will I logically order the information — overview first, then structured sections, then recommendation?
5. LOOK BACK: Is the planned answer complete? Are there any unverified claims I should flag?
You MUST output the closing </think> tag before writing your final response.`;
}
