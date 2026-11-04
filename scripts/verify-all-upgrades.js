/**
 * Comprehensive Upgrade & PDF Generation End-to-End Test Suite
 */

import { extractUserIntent, TASK_TYPES, AUTONOMY_LEVELS } from '../lib/user-intent.js';
import { discoverAppCapabilities } from '../lib/app-capability-discovery.js';
import { CrossAppContextGraph } from '../lib/cross-app-context.js';
import { analyzePrompt } from '../lib/tool-router.js';
import { CanonicalDocument } from '../lib/canonical-content-model.js';
import { validateArtifact } from '../lib/artifact-validator.js';
import { transformArtifact, TRANSFORMATION_TYPES } from '../lib/artifact-transformation.js';
import { ProjectBrain } from '../lib/project-brain.js';
import { evaluateCompletion } from '../lib/evaluation-engine.js';
import { runBenchmarkSuite } from '../lib/eval-benchmark.js';
import { globalLLMCache } from '../lib/llm-cache.js';
import { predictNextStep } from '../lib/next-step-intelligence.js';
import { redactPII, classifyDataSensitivity } from '../lib/security-policy-engine.js';
import { classifyExecutionError, diagnoseAndRepair } from '../lib/self-healing-engine.js';

async function runEndToEndVerification() {
  console.log('=== STARTING COMPLETE CHATBOX AI UPGRADE VERIFICATION ===\n');

  const testResults = [];

  // ── TEST 1: PDF Artifact Generation Pipeline ──
  try {
    const pdfPrompt = 'Create a professional 10-page PDF report on AI Trends 2026';
    const intent = extractUserIntent(pdfPrompt);
    
    const transformation = transformArtifact(TRANSFORMATION_TYPES.RESEARCH_TO_PDF, {
      title: 'AI Trends 2026 Report',
      content: 'Executive summary on agentic AI capabilities, market growth, and enterprise adoption.',
    });

    const pdfValidation = validateArtifact('pdf', transformation.pdfSpec);

    const pdfPassed = intent.taskType === TASK_TYPES.CREATE && 
                      intent.artifactType === 'pdf' && 
                      pdfValidation.isValid && 
                      pdfValidation.qualityScore === 100;

    testResults.push({
      testName: 'PDF Generation & Artifact Quality Validation',
      passed: pdfPassed,
      details: `Quality Score: ${pdfValidation.qualityScore}%, Section Count: ${transformation.pdfSpec.sectionsCount}`,
    });
  } catch (err) {
    testResults.push({ testName: 'PDF Generation', passed: false, error: err.message });
  }

  // ── TEST 2: Word & Presentation Format Transformations ──
  try {
    const pptTransformation = transformArtifact(TRANSFORMATION_TYPES.RESEARCH_TO_POWERPOINT, {
      title: 'AI Strategy 2026',
      content: 'Strategic roadmap for AI adoption',
    });
    const pptValidation = validateArtifact('powerpoint', pptTransformation.pptSpec);

    testResults.push({
      testName: 'Format Transformations (PDF → PowerPoint Spec)',
      passed: pptValidation.isValid,
      details: `Slides Count: ${pptTransformation.pptSpec.slides.length}, Quality Score: ${pptValidation.qualityScore}%`,
    });
  } catch (err) {
    testResults.push({ testName: 'Format Transformations', passed: false, error: err.message });
  }

  // ── TEST 3: Multi-App Task Graph & Capability Discovery ──
  try {
    const activeApps = [
      { appId: 'gmail', status: 'active' },
      { appId: 'google_calendar', status: 'active' },
      { appId: 'google_drive', status: 'active' },
    ];
    const capabilities = discoverAppCapabilities(activeApps);
    const multiAppAnalysis = analyzePrompt('Prepare tomorrow meeting briefing using Calendar, Gmail, Drive', activeApps);

    const graphPassed = capabilities.length > 0 && 
                        multiAppAnalysis.taskGraph?.strategy === 'multi_app_graph' &&
                        multiAppAnalysis.taskGraph?.tasks?.length >= 3;

    testResults.push({
      testName: 'Connected Apps & Task Graph Engine',
      passed: graphPassed,
      details: `Capabilities Discovered: ${capabilities.length}, Task Pipeline Steps: ${multiAppAnalysis.taskGraph?.tasks?.length}`,
    });
  } catch (err) {
    testResults.push({ testName: 'Connected Apps & Task Graph Engine', passed: false, error: err.message });
  }

  // ── TEST 4: Benchmark Suite (Scenarios A–G) ──
  try {
    const benchmarkResult = runBenchmarkSuite();
    testResults.push({
      testName: 'Automated Benchmark Suite (Scenarios A–G)',
      passed: benchmarkResult.totalScore === 100,
      details: `Score: ${benchmarkResult.totalScore}% (${benchmarkResult.passedCount}/${benchmarkResult.totalScenarios} scenarios passed)`,
    });
  } catch (err) {
    testResults.push({ testName: 'Automated Benchmark Suite', passed: false, error: err.message });
  }

  // ── TEST 5: Security PII Scrubbing & Self-Healing Engine ──
  try {
    const redacted = redactPII('Send key sk-1234567890abcdef1234567890abcdef to email');
    const authRepair = diagnoseAndRepair(new Error('401 Unauthorized token expired'));
    const paramRepair = diagnoseAndRepair('400 Invalid Parameter', { parameters: { page_id: 'abc-123' } });

    const secPassed = redacted.redactedCount === 1 && 
                      authRepair.category === 'auth_expired' && 
                      paramRepair.repairedParameters.pageId === 'abc-123';

    testResults.push({
      testName: 'Enterprise Security PII Scrubbing & Self-Healing Engine',
      passed: secPassed,
      details: `Redacted Types: ${redacted.detectedTypes.join(', ')}, Param Repair: page_id → pageId`,
    });
  } catch (err) {
    testResults.push({ testName: 'Security & Self-Healing Engine', passed: false, error: err.message });
  }

  console.log('=== VERIFICATION SUMMARY ===');
  let allPassed = true;
  testResults.forEach((r, idx) => {
    const statusSymbol = r.passed ? '✅ PASSED' : '❌ FAILED';
    if (!r.passed) allPassed = false;
    console.log(`${idx + 1}. [${statusSymbol}] ${r.testName}`);
    console.log(`   Details: ${r.details || r.error}`);
  });

  console.log(`\nFinal Verdict: ${allPassed ? 'ALL UPGRADE SYSTEMS FULLY OPERATIONAL AND VERIFIED 100%' : 'SOME TESTS FAILED'}`);
}

runEndToEndVerification();
