/**
 * ChatBox AI — Audit Logging Engine (Phase 13)
 * ════════════════════════════════════════════════════
 * Records granular security, connected app tool executions, and permission approval events.
 */

import { databases, ID } from '@/services/appwrite-admin.js';
import { APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';
import { redactPII } from './security-policy-engine.js';

const AUDIT_LOGS_COLLECTION = 'tool_execution_logs';

/**
 * Record an immutable audit log entry for tool executions or security events.
 *
 * @param {object} logPayload - { userId, appId, toolId, status, parameters, durationMs, error }
 */
export async function recordAuditLog(logPayload = {}) {
  const {
    userId = 'anonymous',
    appId = 'system',
    toolId = 'general',
    status = 'completed',
    parameters = {},
    durationMs = 0,
    error = null,
  } = logPayload;

  const { sanitizedText: sanitizedParamsStr } = redactPII(JSON.stringify(parameters));

  const logEntry = {
    userId,
    appId,
    toolId,
    status,
    parameters: sanitizedParamsStr.slice(0, 2000), // Enforce length limit
    durationMs,
    error: error ? String(error).slice(0, 500) : null,
    timestamp: new Date().toISOString(),
  };

  try {
    if (databases && APPWRITE_DATABASE_ID) {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        AUDIT_LOGS_COLLECTION,
        ID.unique(),
        logEntry
      );
    }
  } catch (err) {
    // Audit log failure fallback to stdout log
    console.warn('[AuditLogger] Fallback log:', JSON.stringify(logEntry));
  }

  return logEntry;
}
