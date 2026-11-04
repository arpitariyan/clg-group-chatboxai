/**
 * ChatBox AI — Proactive Next-Step Intelligence Engine (Phase 10)
 * ════════════════════════════════════════════════════════════════════
 * Suggests the single highest-leverage logical next step after completing a task.
 * Never spams the user with multiple options — focuses on one relevant recommendation.
 */

import { TASK_TYPES } from './user-intent.js';

/**
 * Predict the single next logical action based on task type and output artifacts.
 *
 * @param {object} userIntent
 * @param {object} [outputPayload]
 * @returns {{ hasNextStep: boolean, suggestion: string|null, actionPrompt: string|null, category: string }}
 */
export function predictNextStep(userIntent, outputPayload = {}) {
  const { taskType, artifactType } = userIntent || {};

  if (taskType === TASK_TYPES.CREATE && artifactType === 'pdf') {
    return {
      hasNextStep: true,
      suggestion: 'Would you like me to convert this PDF report into an executive PowerPoint presentation?',
      actionPrompt: 'Create a PowerPoint presentation version of this report',
      category: 'presentation_transform',
    };
  }

  if (taskType === TASK_TYPES.RESEARCH) {
    return {
      hasNextStep: true,
      suggestion: 'Would you like me to compile these research findings into a formatted PDF document or Notion page?',
      actionPrompt: 'Compile findings into a PDF document',
      category: 'artifact_export',
    };
  }

  if (taskType === TASK_TYPES.ANALYZE && (artifactType === 'excel' || /\b(csv|xlsx|spreadsheet)\b/i.test(userIntent.rawRequest))) {
    return {
      hasNextStep: true,
      suggestion: 'Would you like an executive summary report with visual charts derived from this data?',
      actionPrompt: 'Generate executive summary report with charts',
      category: 'chart_summary',
    };
  }

  if (taskType === TASK_TYPES.EXECUTE && /\b(meeting|briefing)\b/i.test(userIntent.rawRequest)) {
    return {
      hasNextStep: true,
      suggestion: 'Would you like me to draft follow-up email templates for meeting participants?',
      actionPrompt: 'Draft meeting follow-up email templates',
      category: 'email_followup',
    };
  }

  return {
    hasNextStep: false,
    suggestion: null,
    actionPrompt: null,
    category: 'none',
  };
}
