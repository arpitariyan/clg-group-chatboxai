/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Structured Observability, Telemetry & Security Redaction (Phases 33 & 36)
 * ══════════════════════════════════════════════════════════════════════════════════
 * Emits redacted structured telemetry events capturing the execution metrics
 * of every request through the Adaptive Response Pipeline.
 * Enforces zero-leakage security of API keys, auth tokens, and sensitive PII.
 */

import { scrubSensitiveData } from './memory-system.js';

const IN_MEMORY_TELEMETRY_LOGS = [];
const MAX_TELEMETRY_RECORDS = 500;

/**
 * Log structured telemetry event for an AI generation cycle.
 *
 * @param {object} eventData
 */
export function logAdaptiveTelemetry({
  recordId,
  category,
  complexity,
  modelUsed,
  latencyMs,
  tokensEstimated = 0,
  qualityScore = 1.0,
  confidenceLevel = 'HIGH',
  refinementPasses = 0,
  deterministicFailures = 0,
  circuitBreakerTripped = false,
  userEmail = null,
}) {
  const telemetryRecord = {
    recordId: recordId || `rec_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: category || 'general_chat',
    complexity: complexity || 'MEDIUM',
    modelUsed: modelUsed || 'unknown',
    latencyMs: Math.max(0, latencyMs || 0),
    tokensEstimated,
    qualityScore: Math.round(qualityScore * 100) / 100,
    confidenceLevel,
    refinementPasses,
    deterministicFailures,
    circuitBreakerTripped,
    userRef: userEmail ? scrubSensitiveData(userEmail) : 'anonymous',
  };

  IN_MEMORY_TELEMETRY_LOGS.push(telemetryRecord);
  if (IN_MEMORY_TELEMETRY_LOGS.length > MAX_TELEMETRY_RECORDS) {
    IN_MEMORY_TELEMETRY_LOGS.shift(); // Evict oldest
  }

  // Development & Audit Log (clean single line)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Telemetry][AdaptiveEngine] id=${telemetryRecord.recordId} cat=${telemetryRecord.category} comp=${telemetryRecord.complexity} model=${telemetryRecord.modelUsed} score=${telemetryRecord.qualityScore} conf=${telemetryRecord.confidenceLevel} passes=${telemetryRecord.refinementPasses} time=${telemetryRecord.latencyMs}ms`);
  }

  return telemetryRecord;
}

/**
 * Get aggregated telemetry metrics for monitoring.
 */
export function getTelemetryMetrics() {
  const total = IN_MEMORY_TELEMETRY_LOGS.length;
  if (total === 0) {
    return {
      totalRequests: 0,
      avgQualityScore: 0,
      avgLatencyMs: 0,
      refinementRate: '0%',
    };
  }

  const avgQualityScore = Math.round((IN_MEMORY_TELEMETRY_LOGS.reduce((acc, r) => acc + r.qualityScore, 0) / total) * 100) / 100;
  const avgLatencyMs = Math.round(IN_MEMORY_TELEMETRY_LOGS.reduce((acc, r) => acc + r.latencyMs, 0) / total);
  const refinedCount = IN_MEMORY_TELEMETRY_LOGS.filter(r => r.refinementPasses > 0).length;

  return {
    totalRequests: total,
    avgQualityScore,
    avgLatencyMs,
    refinementRate: `${Math.round((refinedCount / total) * 100)}%`,
  };
}
