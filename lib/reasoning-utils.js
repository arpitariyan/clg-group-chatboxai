/**
 * Heuristics to determine if a prompt requires deep reasoning (Thinking Mode).
 * Evaluates the prompt quickly without an LLM call.
 *
 * Upgraded with PEARL framework signals: comparison, decision, and research markers.
 */
export function requiresDeepReasoning(prompt) {
    if (!prompt || typeof prompt !== 'string') return false;

    const text = prompt.toLowerCase();
    
    // 1. Length Heuristic
    // Long prompts usually contain complex instructions or context
    if (text.length > 300) return true;
    
    const words = text.split(/\s+/);
    if (words.length > 50) return true;

    // 2. Logic & Analysis Markers (English & Hinglish)
    const logicMarkers = [
        'analyze', 'analyse', 'evaluate', 'compare', 'difference', 'reasoning', 
        'deduce', 'determine', 'explain', 'why', 'how', 'logic', 'think', 
        'step by step', 'plan', 'strategy', 'architecture', 'structure',
        'agar', 'toh', 'kyun', 'kaise', 'samjhao', 'fark', 'reason',
        'condition', 'assume', 'suppose'
    ];
    
    // Use word boundary check so "show" doesn't match "how"
    const hasLogicMarker = logicMarkers.some(marker => {
        const regex = new RegExp(`\\b${marker}\\b`, 'i');
        return regex.test(text);
    });

    if (hasLogicMarker) return true;

    // 3. Coding & Math Markers
    const mathCodingMarkers = [
        'calculate', 'solve', 'equation', 'math', 'code', 'function', 
        'algorithm', 'debug', 'error', 'refactor', 'optimize', 'regex',
        'database', 'query', 'sql', 'component', 'class', 'method'
    ];

    const hasMathCoding = mathCodingMarkers.some(marker => {
        const regex = new RegExp(`\\b${marker}\\b`, 'i');
        return regex.test(text);
    });

    if (hasMathCoding) return true;

    // 4. Complex Tasks
    const complexTasks = [
        'summarize', 'summary', 'extract', 'synthesis', 'review',
        'translate', 'convert'
    ];

    const hasComplexTask = complexTasks.some(marker => {
        const regex = new RegExp(`\\b${marker}\\b`, 'i');
        return regex.test(text);
    });

    if (hasComplexTask) return true;

    // 5. Comparison & Decision Markers (PEARL upgrade)
    // Detects when a user wants to compare options or make a decision.
    const comparisonMarkers = [
        'vs', 'versus', 'better', 'best', 'which one', 'which is',
        'recommend', 'recommendation', 'choose', 'choice', 'pick',
        'pros and cons', 'trade-off', 'difference between',
        // Hinglish comparison
        'konsa', 'konsa better', 'sabse acha', 'sabse best', 'kya farak',
        'suggest karo', 'batao konsa'
    ];

    const hasComparison = comparisonMarkers.some(marker => {
        const regex = new RegExp(`\\b${marker.replace('-', '\\-')}\\b`, 'i');
        return regex.test(text);
    });

    if (hasComparison) return true;

    // 6. Decision-Making Markers (PEARL upgrade)
    const decisionMarkers = [
        'should i', 'should we', 'worth it', 'is it worth',
        'kya karu', 'kya karun', 'kya lena chahiye', 'lena chahiye',
        'best option', 'right choice'
    ];

    const hasDecision = decisionMarkers.some(marker => {
        const regex = new RegExp(marker.replace(/\s+/g, '\\s+'), 'i');
        return regex.test(text);
    });

    if (hasDecision) return true;

    // 7. Research / Deep-dive Markers (PEARL upgrade)
    const researchMarkers = [
        'research', 'deep dive', 'detailed analysis', 'comprehensive',
        'in-depth', 'thorough', 'elaborate', 'breakdown'
    ];

    const hasResearch = researchMarkers.some(marker => {
        const regex = new RegExp(marker.replace(/\s+/g, '\\s+'), 'i');
        return regex.test(text);
    });

    if (hasResearch) return true;

    return false;
}
