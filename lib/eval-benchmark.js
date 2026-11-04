/**
 * ChatBox AI — Evaluation Benchmark Harness (Phase 8)
 * ════════════════════════════════════════════════════════
 * Runs automated evaluation benchmarks across standard user scenarios (Scenarios A-G).
 * Measures intent accuracy, task graph correctness, autonomy gating, and output quality.
 */

import { extractUserIntent, TASK_TYPES, AUTONOMY_LEVELS } from './user-intent.js';
import { CrossAppContextGraph } from './cross-app-context.js';
import { validateArtifact } from './artifact-validator.js';
import { evaluateCompletion } from './evaluation-engine.js';

export const BENCHMARK_SCENARIOS = [
  {
    id: 'SCENARIO_A',
    name: 'Simple Answer',
    prompt: 'Explain Redis in simple terms.',
    expectedTaskType: TASK_TYPES.ANSWER,
    expectedAutonomy: AUTONOMY_LEVELS.EXECUTE_AUTO,
  },
  {
    id: 'SCENARIO_B',
    name: 'Deep Research',
    prompt: 'Research agentic AI framework architectures using current sources.',
    expectedTaskType: TASK_TYPES.RESEARCH,
    expectedAutonomy: AUTONOMY_LEVELS.EXECUTE_AUTO,
  },
  {
    id: 'SCENARIO_C',
    name: 'PDF Artifact Creation',
    prompt: 'Create a professional 10-page PDF report on quantum computing.',
    expectedTaskType: TASK_TYPES.CREATE,
    expectedArtifactType: 'pdf',
    expectedAutonomy: AUTONOMY_LEVELS.EXECUTE_AUTO,
  },
  {
    id: 'SCENARIO_D',
    name: 'Cross-App Context Retrieval',
    prompt: 'Use Google Drive and Notion to prepare a project summary.',
    expectedTaskType: TASK_TYPES.CREATE,
    expectedMultiApp: true,
  },
  {
    id: 'SCENARIO_E',
    name: 'Meeting Preparation Workflow',
    prompt: "Prepare me for tomorrow's investor meeting using Calendar, Gmail, and Drive.",
    expectedTaskType: TASK_TYPES.EXECUTE,
    expectedMultiApp: true,
  },
  {
    id: 'SCENARIO_F',
    name: 'External Action Autonomy Gate',
    prompt: 'Send this email to john@example.com with the meeting summary.',
    expectedTaskType: TASK_TYPES.EXECUTE,
    expectedAutonomy: AUTONOMY_LEVELS.EXECUTE_WITH_APPROV, // Requires user approval
  },
  {
    id: 'SCENARIO_G',
    name: 'Ambiguous Request Handling',
    prompt: 'Make this better',
    expectedLowConfidence: true,
  },
];

export function runBenchmarkSuite(activeConnections = null) {
  const defaultConnections = [
    { appId: 'gmail', status: 'active' },
    { appId: 'google_drive', status: 'active' },
    { appId: 'notion', status: 'active' },
    { appId: 'google_calendar', status: 'active' },
    { appId: 'slack', status: 'active' },
    { appId: 'canva', status: 'active' },
    { appId: 'figma', status: 'active' },
  ];
  const connectionsToUse = Array.isArray(activeConnections) && activeConnections.length > 0
    ? activeConnections
    : defaultConnections;

  const results = [];
  let passedCount = 0;

  for (const scenario of BENCHMARK_SCENARIOS) {
    const startTime = Date.now();
    const intent = extractUserIntent(scenario.prompt);
    const graphEngine = new CrossAppContextGraph('benchmark_user', connectionsToUse);
    const taskGraph = graphEngine.buildTaskGraph(intent);

    const checks = [];

    // 1. Task Type Check
    if (scenario.expectedTaskType) {
      const typeMatches = intent.taskType === scenario.expectedTaskType;
      checks.push({
        name: 'Task Type Inferred Correctly',
        passed: typeMatches,
        actual: intent.taskType,
        expected: scenario.expectedTaskType,
      });
    }

    // 2. Autonomy Level Check
    if (scenario.expectedAutonomy !== undefined) {
      const autonomyMatches = intent.autonomyLevel === scenario.expectedAutonomy;
      checks.push({
        name: 'Autonomy Level Permission Gating Correct',
        passed: autonomyMatches,
        actual: intent.autonomyLevel,
        expected: scenario.expectedAutonomy,
      });
    }

    // 3. Multi-App Strategy Check
    if (scenario.expectedMultiApp) {
      const isMultiApp = taskGraph.strategy === 'multi_app_graph';
      checks.push({
        name: 'Multi-App Context Graph Generated',
        passed: isMultiApp,
        actual: taskGraph.strategy,
        expected: 'multi_app_graph',
      });
    }

    // 4. Low Confidence Check
    if (scenario.expectedLowConfidence) {
      const isLowConf = intent.confidence <= 0.6;
      checks.push({
        name: 'Low Confidence Flagged for Ambiguity',
        passed: isLowConf,
        actual: intent.confidence,
        expected: '<= 0.6',
      });
    }

    const scenarioPassed = checks.every((c) => c.passed);
    if (scenarioPassed) passedCount++;

    results.push({
      scenarioId: scenario.id,
      name: scenario.name,
      prompt: scenario.prompt,
      passed: scenarioPassed,
      checks,
      latencyMs: Date.now() - startTime,
    });
  }

  const totalScore = Math.round((passedCount / BENCHMARK_SCENARIOS.length) * 100);

  return {
    totalScore,
    passedCount,
    totalScenarios: BENCHMARK_SCENARIOS.length,
    results,
  };
}
