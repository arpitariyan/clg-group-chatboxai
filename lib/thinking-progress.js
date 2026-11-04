/**
 * ChatBox AI — Thinking & Progress Event Manager (Phase 1)
 * ════════════════════════════════════════════════════════════════
 * Emits safe user-visible progress events for long-running AI and
 * artifact generation tasks without exposing private chain-of-thought.
 */

export const PROGRESS_STAGES = {
  UNDERSTANDING: 'understanding',
  PLANNING: 'planning',
  RESEARCHING: 'researching',
  GENERATING_ARTIFACT: 'artifact_generation',
  VALIDATING: 'validation',
  FINALIZING: 'finalizing',
};

export const PROGRESS_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export class AIProgressEvent {
  constructor(data = {}) {
    this.eventId = data.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.taskId = data.taskId || `task_${Date.now()}`;
    this.type = 'thinking';
    this.status = data.status || PROGRESS_STATUS.RUNNING;
    this.stage = data.stage || PROGRESS_STAGES.UNDERSTANDING;
    this.message = data.message || 'Processing request...';
    this.progress = data.progress || 0; // 0 to 100%
    this.timestamp = data.timestamp || new Date().toISOString();
  }

  toJSON() {
    return {
      eventId: this.eventId,
      taskId: this.taskId,
      type: this.type,
      status: this.status,
      stage: this.stage,
      message: this.message,
      progress: this.progress,
      timestamp: this.timestamp,
    };
  }
}

export function buildProgressSequence(taskId = `task_${Date.now()}`, artifactType = 'pdf') {
  const normType = String(artifactType || 'pdf').toUpperCase();
  return [
    new AIProgressEvent({ taskId, stage: PROGRESS_STAGES.UNDERSTANDING, message: 'Understanding your request...', progress: 15 }),
    new AIProgressEvent({ taskId, stage: PROGRESS_STAGES.PLANNING, message: `Planning ${normType} document layout and structure...`, progress: 35 }),
    new AIProgressEvent({ taskId, stage: PROGRESS_STAGES.GENERATING_ARTIFACT, message: `Generating ${normType} content and tables...`, progress: 70 }),
    new AIProgressEvent({ taskId, stage: PROGRESS_STAGES.VALIDATING, message: `Validating ${normType} page flow and formula integrity...`, progress: 90 }),
    new AIProgressEvent({ taskId, stage: PROGRESS_STAGES.FINALIZING, status: PROGRESS_STATUS.COMPLETED, message: `${normType} document ready and verified.`, progress: 100 }),
  ];
}
