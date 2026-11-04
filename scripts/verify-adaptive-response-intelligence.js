/**
 * ChatBox AI — Comprehensive Verification Test Suite
 * Adaptive Response Intelligence Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * Validates all core subsystems, intent classification, complexity intelligence,
 * answer contract generation, deterministic verification, hallucination defense,
 * multi-dimensional critique, confidence calibration, and golden dataset regression.
 */

import {
  classifyAdaptiveIntent,
  ADAPTIVE_TASK_CATEGORIES,
  estimateComplexity,
  COMPLEXITY_LEVELS,
  PIPELINE_DEPTHS,
  buildUnifiedContext,
  detectContextContradictions,
  buildAnswerContract,
  decideToolStrategy,
  TOOL_ACTION_TYPES,
  routeAdaptiveModel,
  compilePrompt,
  verifyDeterministically,
  defendAgainstHallucination,
  critiqueResponse,
  evaluateConfidence,
  CONFIDENCE_LEVELS,
  evaluateRefinementNeed,
  scrubSensitiveData,
  canExecuteProvider,
  recordProviderSuccess,
  recordProviderFailure,
  logAdaptiveTelemetry,
  getTelemetryMetrics,
  runRegressionSuite,
  runAdaptiveResponsePipeline,
} from '../lib/adaptive-engine/index.js';

async function runAdaptiveEngineVerification() {
  console.log('=== STARTING ADAPTIVE RESPONSE INTELLIGENCE ENGINE VERIFICATION ===\n');

  const testResults = [];

  // ── TEST 1: Intent Understanding & Classification ──
  try {
    const testCases = [
      { prompt: 'Write a python script to parse CSV files', expected: ADAPTIVE_TASK_CATEGORIES.CODING },
      { prompt: 'TypeError: Cannot read properties of undefined at line 42', expected: ADAPTIVE_TASK_CATEGORIES.DEBUGGING },
      { prompt: 'Design a high throughput microservices event bus', expected: ADAPTIVE_TASK_CATEGORIES.ARCHITECTURE },
      { prompt: 'Synthesize recent findings on quantum computing architectures', expected: ADAPTIVE_TASK_CATEGORIES.RESEARCH },
      { prompt: 'Compare PostgreSQL vs MongoDB for user analytics', expected: ADAPTIVE_TASK_CATEGORIES.COMPARISON },
      { prompt: 'Calculate: 50 * 20 - 150', expected: ADAPTIVE_TASK_CATEGORIES.MATHEMATICS },
      { prompt: 'What is the capital of Japan?', expected: ADAPTIVE_TASK_CATEGORIES.FACTUAL_QUESTION },
    ];

    let passedCount = 0;
    for (const tc of testCases) {
      const intent = classifyAdaptiveIntent(tc.prompt);
      if (intent.category === tc.expected) passedCount++;
    }

    testResults.push({
      testName: 'Intent Understanding Across Task Categories',
      passed: passedCount === testCases.length,
      details: `${passedCount}/${testCases.length} categories classified correctly.`,
    });
  } catch (err) {
    testResults.push({ testName: 'Intent Understanding', passed: false, error: err.message });
  }

  // ── TEST 2: Ambiguity Detection ──
  try {
    const vaguePrompt = 'Fix it';
    const clearPrompt = 'Fix the React hydration error in app/layout.tsx';

    const vagueIntent = classifyAdaptiveIntent(vaguePrompt);
    const clearIntent = classifyAdaptiveIntent(clearPrompt);

    const passed = vagueIntent.ambiguity.isAmbiguous === true && clearIntent.ambiguity.isAmbiguous === false;

    testResults.push({
      testName: 'Ambiguity Detection & Clarification Gating',
      passed,
      details: `Vague detected: ${vagueIntent.ambiguity.isAmbiguous}, Clear detected: ${!clearIntent.ambiguity.isAmbiguous}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Ambiguity Detection', passed: false, error: err.message });
  }

  // ── TEST 3: Complexity Estimation & Dynamic Compute Depth ──
  try {
    const lowTask = estimateComplexity('2 + 2?');
    const medTask = estimateComplexity('Explain React hooks in simple terms');
    const highTask = estimateComplexity('Design a scalable AI architecture with Redis caching');
    const critTask = estimateComplexity('Audit all files, identify architectural issues, refactor entire pipeline, and test performance');

    const passed = lowTask.complexity === COMPLEXITY_LEVELS.LOW &&
      lowTask.pipelineDepth === PIPELINE_DEPTHS.DIRECT &&
      medTask.complexity === COMPLEXITY_LEVELS.MEDIUM &&
      highTask.complexity === COMPLEXITY_LEVELS.HIGH &&
      critTask.complexity === COMPLEXITY_LEVELS.CRITICAL &&
      critTask.pipelineDepth === PIPELINE_DEPTHS.DEEP_GATE;

    testResults.push({
      testName: 'Complexity Intelligence (LOW, MEDIUM, HIGH, CRITICAL)',
      passed,
      details: `LOW=${lowTask.pipelineDepth}, MED=${medTask.pipelineDepth}, HIGH=${highTask.pipelineDepth}, CRIT=${critTask.pipelineDepth}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Complexity Intelligence', passed: false, error: err.message });
  }

  // ── TEST 4: Context Intelligence & Contradiction Resolution ──
  try {
    const history = [
      { userSearchInput: 'We use AWS for cloud hosting', aiResp: 'AWS configuration noted.' },
      { userSearchInput: 'Let us set up S3 buckets', aiResp: 'S3 steps provided.' },
    ];
    const newPrompt = 'Actually switch to Google Cloud instead of AWS. Show me Cloud Storage setup.';

    const contradiction = detectContextContradictions(newPrompt, history);
    const unifiedContext = buildUnifiedContext({
      currentRequest: newPrompt,
      conversationHistory: history,
      userPreferences: { codeStyle: 'TypeScript' },
    });

    const passed = contradiction.hasOverrides === true &&
      unifiedContext.unifiedContextBlock.includes('[PRIORITY DIRECTIVE]') &&
      unifiedContext.unifiedContextBlock.toLowerCase().includes('switch to google cloud');

    testResults.push({
      testName: 'Context Intelligence & Contradiction Resolution',
      passed,
      details: `Overrides detected: ${contradiction.hasOverrides}, Newest instruction prioritized in context.`,
    });
  } catch (err) {
    testResults.push({ testName: 'Context Intelligence', passed: false, error: err.message });
  }

  // ── TEST 5: Answer Contract Specification ──
  try {
    const codePrompt = 'Write a binary search function. Give only code.';
    const intent = classifyAdaptiveIntent(codePrompt);
    const complexity = estimateComplexity(codePrompt, intent);
    const contract = buildAnswerContract(intent, complexity, codePrompt);

    const passed = contract.strictCodeOnly === true &&
      contract.codeOnly === true &&
      contract.requiresCode === true;

    testResults.push({
      testName: 'Answer Contract Generation (Strict Constraints)',
      passed,
      details: `Format: ${contract.requestedFormat}, CodeOnly: ${contract.codeOnly}, Depth: ${contract.depth}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Answer Contract Generation', passed: false, error: err.message });
  }

  // ── TEST 6: Tool & Web Search Decision Layer ──
  try {
    const liveQuery = decideToolStrategy('What was the closing stock price of Apple today?');
    const selfContainedQuery = decideToolStrategy('Explain how merge sort works.');
    const docQuery = decideToolStrategy('Summarize the document', {}, { hasAttachment: true });

    const passed = liveQuery.needsLiveSearch === true &&
      selfContainedQuery.needsLiveSearch === false &&
      docQuery.needsDocumentRAG === true;

    testResults.push({
      testName: 'Intentional Tool & Web Search Decision Gating',
      passed,
      details: `LiveSearch: ${liveQuery.actionType}, Parametric: ${selfContainedQuery.actionType}, DocRAG: ${docQuery.actionType}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Tool Decision Gating', passed: false, error: err.message });
  }

  // ── TEST 7: Deterministic Verification Layer ──
  try {
    const validDraft = '```typescript\nconst x: number = 42;\n```';
    const brokenDraft = '```typescript\nconst x: number = 42;'; // Unclosed code fence
    const unclosedThinkDraft = '<think>I need to solve this\nHere is the answer.'; // Unclosed <think> tag

    const validResult = verifyDeterministically(validDraft);
    const brokenResult = verifyDeterministically(brokenDraft);
    const unclosedThinkResult = verifyDeterministically(unclosedThinkDraft);

    const passed = validResult.isValid === true &&
      brokenResult.isValid === false &&
      brokenResult.failures.some(f => f.check === 'CODE_FENCE_BALANCE') &&
      unclosedThinkResult.isValid === false &&
      unclosedThinkResult.failures.some(f => f.check === 'THINKING_TAG_BALANCE');

    testResults.push({
      testName: 'Deterministic Verification (Code Fences & Thinking Tags)',
      passed,
      details: `Balanced fence valid: ${validResult.isValid}, Unbalanced caught: ${!brokenResult.isValid}, Unclosed think caught: ${!unclosedThinkResult.isValid}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Deterministic Verification', passed: false, error: err.message });
  }

  // ── TEST 8: Hallucination Defense & Evidence Grounding ──
  try {
    const evidence = [
      { title: 'Next.js 16 Release', body: 'Next.js 16 introduces Turbopack as default and React 19 support.' },
    ];
    const groundedResponse = 'Next.js 16 includes Turbopack as default [1].';
    const hallucinatedResponse = 'In 2029, Next.js version 25 was released with quantum compilation on [fakelink](https://www.example.com).';

    const groundedCheck = defendAgainstHallucination(groundedResponse, evidence);
    const hallucinatedCheck = defendAgainstHallucination(hallucinatedResponse, evidence);

    const passed = groundedCheck.hasHallucinationRisk === false &&
      hallucinatedCheck.hasHallucinationRisk === true &&
      hallucinatedCheck.sanitizedText.includes('fakelink') &&
      !hallucinatedCheck.sanitizedText.includes('https://www.example.com');

    testResults.push({
      testName: 'Hallucination Defense & Evidence Grounding',
      passed,
      details: `Grounded Score: ${groundedCheck.groundingScore}, Hallucination Risk Detected: ${hallucinatedCheck.hasHallucinationRisk}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Hallucination Defense', passed: false, error: err.message });
  }

  // ── TEST 9: Multi-Dimensional Critic & Scoring ──
  try {
    const prompt = 'Explain closures in JavaScript';
    const intent = classifyAdaptiveIntent(prompt);
    const contract = buildAnswerContract(intent, { complexity: 'MEDIUM' }, prompt);
    const goodDraft = 'A closure is the combination of a function bundled together with references to its surrounding state.\n\n```javascript\nfunction outer() {\n  const x = 10;\n  return () => x;\n}\n```\n\n💡 Closures allow inner functions to access outer scope variables.';

    const criticReport = critiqueResponse({
      prompt,
      response: goodDraft,
      intent,
      answerContract: contract,
    });

    const passed = criticReport.passed === true && criticReport.overallScore >= 0.85;

    testResults.push({
      testName: 'Multi-Dimensional Response Critic Evaluation',
      passed,
      details: `Score: ${criticReport.overallScore} (Threshold: ${criticReport.threshold}), Relevance: ${criticReport.dimensionScores.relevance}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Response Critic', passed: false, error: err.message });
  }

  // ── TEST 10: Confidence Engine ──
  try {
    const intent = classifyAdaptiveIntent('What is 2 + 2?');
    const criticReport = { overallScore: 0.95 };
    const deterministicResult = { isValid: true, failures: [] };

    const conf = evaluateConfidence({ intent, criticReport, deterministicResult });
    const passed = conf.level === CONFIDENCE_LEVELS.HIGH && conf.score >= 0.85;

    testResults.push({
      testName: 'Calibrated Confidence Engine',
      passed,
      details: `Level: ${conf.level}, Score: ${conf.score}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Confidence Engine', passed: false, error: err.message });
  }

  // ── TEST 11: Production Circuit Breaker ──
  try {
    const provider = 'test_failing_provider';
    recordProviderFailure(provider, new Error('Timeout 1'));
    recordProviderFailure(provider, new Error('Timeout 2'));
    recordProviderFailure(provider, new Error('Timeout 3'));

    const isBlocked = canExecuteProvider(provider) === false;
    recordProviderSuccess(provider);
    const isRestored = canExecuteProvider(provider) === true;

    const passed = isBlocked && isRestored;

    testResults.push({
      testName: 'Production Resilience Circuit Breaker',
      passed,
      details: `Tripped on 3 failures: ${isBlocked}, Reset on success: ${isRestored}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Circuit Breaker', passed: false, error: err.message });
  }

  // ── TEST 12: Security PII & Secret Scrubbing ──
  try {
    const dirty = 'Here is the key cbx_live_9876543210abcdef98765 and email user@example.com with password="superSecret123"';
    const clean = scrubSensitiveData(dirty);

    const passed = !clean.includes('cbx_live_9876543210abcdef98765') &&
      !clean.includes('superSecret123') &&
      clean.includes('[REDACTED_SECRET]') &&
      clean.includes('[REDACTED_EMAIL]');

    testResults.push({
      testName: 'Zero-Leakage Security & PII Redaction',
      passed,
      details: `Cleaned string verified: ${clean}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Security Redaction', passed: false, error: err.message });
  }

  // ── TEST 13: Golden Dataset Regression Suite (Dev & Holdout) ──
  try {
    const devRegression = runRegressionSuite(false);
    const holdoutRegression = runRegressionSuite(true);

    const passed = devRegression.allPassed === true &&
      holdoutRegression.allPassed === true &&
      devRegression.overallScoreImprovement > 0;

    testResults.push({
      testName: 'Golden Dataset Regression Suite (Dev & Holdout Benchmarks)',
      passed,
      details: `Dev Score: ${devRegression.adaptiveAvgScore} vs Legacy ${devRegression.baselineAvgScore} (+${devRegression.overallScoreImprovement}), Holdout Score: ${holdoutRegression.adaptiveAvgScore}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Golden Dataset Regression Suite', passed: false, error: err.message });
  }

  // ── TEST 14: End-to-End Pipeline Execution with Adaptive Refinement ──
  try {
    let refineCallCount = 0;
    const result = await runAdaptiveResponsePipeline({
      question: 'Write a debounce function in TypeScript. Give only code.',
      rawResponse: 'Here is your function:\n\n```typescript\nfunction debounce() {}\n```\nHope it helps!', // Imperfect draft with chatty preamble
      intent: classifyAdaptiveIntent('Write a debounce function in TypeScript. Give only code.'),
      complexity: estimateComplexity('Write a debounce function in TypeScript. Give only code.'),
      answerContract: buildAnswerContract(
        classifyAdaptiveIntent('Write a debounce function in TypeScript. Give only code.'),
        estimateComplexity('Write a debounce function in TypeScript. Give only code.'),
        'Write a debounce function in TypeScript. Give only code.'
      ),
      refineModelFn: async (repairPrompt) => {
        refineCallCount++;
        // Model repairs its draft by removing conversational text
        return '```typescript\nexport function debounce(fn: Function, ms: number) {\n  let id: any;\n  return (...args: any[]) => {\n    clearTimeout(id);\n    id = setTimeout(() => fn(...args), ms);\n  };\n}\n```';
      },
      recordId: 'test_rec_001',
      modelUsed: 'chatboxai/llama-3.3-70b',
    });

    const passed = result.repaired === true &&
      refineCallCount === 1 &&
      result.finalResponse.startsWith('```typescript') &&
      result.criticReport.overallScore >= 0.88;

    testResults.push({
      testName: 'End-to-End Pipeline with Adaptive Self-Refinement',
      passed,
      details: `Refinement executed: ${result.repaired}, Passes: ${result.refinementPasses}, Final Score: ${result.criticReport.overallScore}`,
    });
  } catch (err) {
    testResults.push({ testName: 'End-to-End Pipeline', passed: false, error: err.message });
  }

  // ── REPORT SUMMARY ──
  console.log('=== ADAPTIVE RESPONSE INTELLIGENCE ENGINE VERIFICATION SUMMARY ===\n');
  let allTestsPassed = true;
  testResults.forEach((res, i) => {
    const status = res.passed ? '✅ PASSED' : '❌ FAILED';
    if (!res.passed) allTestsPassed = false;
    console.log(`${i + 1}. [${status}] ${res.testName}`);
    if (res.details) console.log(`   Details: ${res.details}`);
    if (res.error) console.log(`   Error: ${res.error}`);
  });

  console.log(`\nFinal Verdict: ${allTestsPassed ? 'ALL SYSTEMS FULLY OPERATIONAL AND VERIFIED 100%' : 'FAILURES DETECTED'}\n`);

  return { allTestsPassed, testResults };
}

runAdaptiveEngineVerification().then(({ allTestsPassed }) => {
  if (!allTestsPassed) {
    process.exit(1);
  }
});
