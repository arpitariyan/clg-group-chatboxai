/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Golden Evaluation Dataset (Phase 21)
 * ═══════════════════════════════════════════════════════════════
 * Curated, stratified evaluation dataset containing 18 distinct benchmarks:
 * - Simple queries
 * - Deep research
 * - Complex coding & debugging
 * - Ambiguous queries & clarifying edge cases
 * - Formatting constraints ("only code", JSON, tables)
 * - Multilingual & Hinglish requests
 * - Hallucination traps
 * - Contradiction detection & follow-ups
 *
 * Separates DEVELOPMENT examples from HOLDOUT/VALIDATION examples.
 */

export const GOLDEN_DATASET_DEV = [
  {
    id: 'DEV_01_SIMPLE_FACT',
    category: 'factual_question',
    prompt: 'What is the capital of France?',
    expectedComplexity: 'LOW',
    expectedFormat: 'concise_direct',
    targetThreshold: 0.85,
    description: 'Simple factual lookup testing zero-bloat conciseness.',
  },
  {
    id: 'DEV_02_REACT_HOOKS',
    category: 'explanation',
    prompt: 'Explain the difference between useEffect and useLayoutEffect in React with a small code example.',
    expectedComplexity: 'MEDIUM',
    expectedFormat: 'markdown_structured',
    requiresCode: true,
    targetThreshold: 0.88,
    description: 'Conceptual and practical frontend explanation with code block.',
  },
  {
    id: 'DEV_03_FORMAT_ONLY_CODE',
    category: 'coding',
    prompt: 'Write a TypeScript function to debounce an async callback. Give only code.',
    expectedComplexity: 'HIGH',
    expectedFormat: 'raw_code',
    strictCodeOnly: true,
    targetThreshold: 0.90,
    description: 'Strict format constraint test: zero conversational text allowed outside code fence.',
  },
  {
    id: 'DEV_04_RESEARCH_SYNTHESIS',
    category: 'research',
    prompt: 'Synthesize the trade-offs between Monolithic, Microservices, and Modular Monolith architectures.',
    expectedComplexity: 'HIGH',
    expectedFormat: 'markdown_structured',
    requiresTable: true,
    targetThreshold: 0.88,
    description: 'Deep architectural research requiring comparison table and objective trade-offs.',
  },
  {
    id: 'DEV_05_AMBIGUOUS_QUERY',
    category: 'general_chat',
    prompt: 'Fix it',
    expectedComplexity: 'LOW',
    isAmbiguous: true,
    targetThreshold: 0.80,
    description: 'High ambiguity trap testing graceful clarification and non-hallucination.',
  },
  {
    id: 'DEV_06_DEBUGGING_NODE',
    category: 'debugging',
    prompt: 'UnhandledPromiseRejection: TypeError: Cannot read properties of undefined (reading "map") at renderList (App.tsx:42). How do I fix this?',
    expectedComplexity: 'HIGH',
    expectedFormat: 'markdown_structured',
    requiresCode: true,
    targetThreshold: 0.90,
    description: 'Diagnosis and drop-in code fix for null pointer exception.',
  },
  {
    id: 'DEV_07_CALCULATION_MATH',
    category: 'mathematics',
    prompt: 'Calculate: 145 * 12 + 450 / 5',
    expectedComplexity: 'LOW',
    expectedFormat: 'concise_direct',
    targetThreshold: 0.90,
    description: 'Deterministic arithmetic evaluation.',
  },
  {
    id: 'DEV_08_JSON_SCHEMA',
    category: 'analysis',
    prompt: 'Analyze user risk for an account with 5 failed logins and return as a JSON object with keys: riskLevel, recommendedAction.',
    expectedComplexity: 'MEDIUM',
    expectedFormat: 'json',
    targetThreshold: 0.88,
    description: 'Strict JSON output schema validation.',
  },
];

export const GOLDEN_DATASET_HOLDOUT = [
  {
    id: 'HOLD_01_CONTRADICTION_FOLLOWUP',
    category: 'coding',
    prompt: 'Actually, switch to Python and rewrite the solution using asyncio instead of Node.',
    conversationHistory: [
      { userSearchInput: 'Write a scraper in Node.js with puppeteer', aiResp: 'Here is the Node.js scraper...' },
    ],
    expectedComplexity: 'HIGH',
    hasContradictionOverride: true,
    targetThreshold: 0.90,
    description: 'Explicit mid-dialogue technology shift where newest instruction overrides history.',
  },
  {
    id: 'HOLD_02_HALLUCINATION_TRAP',
    category: 'research',
    prompt: 'Tell me about the 2029 quantum breakthrough discovered by Professor Alistair Vance at Oxford.',
    expectedComplexity: 'HIGH',
    isHallucinationTrap: true,
    targetThreshold: 0.88,
    description: 'Fictional/future entity test: model must state information is unverified rather than fabricating.',
  },
  {
    id: 'HOLD_03_CRITICAL_ARCHITECTURE',
    category: 'architecture',
    prompt: 'Design a distributed rate limiter supporting 500,000 requests per second across 3 continents with Redis, sliding window log, and fallback circuit breakers.',
    expectedComplexity: 'CRITICAL',
    requiresPlanning: true,
    targetThreshold: 0.92,
    description: 'Critical complexity test requiring deep multi-region architectural specification.',
  },
  {
    id: 'HOLD_04_MULTILINGUAL_HINGLISH',
    category: 'explanation',
    prompt: 'Mujhe React Server Components aur Client Components ka difference simple Hinglish me samjhao.',
    expectedComplexity: 'MEDIUM',
    targetThreshold: 0.85,
    description: 'Natural multilingual Hinglish tone matching and conceptual clarity.',
  },
];
