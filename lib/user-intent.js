/**
 * ChatBox AI — User Intent Engine (Phase 1 Foundation)
 * ════════════════════════════════════════════════════
 * Parses raw user requests into a structured UserIntent model.
 * Infers task type, explicit & inferred requirements, constraints,
 * confidence score, autonomy level, and success criteria.
 */

export const TASK_TYPES = {
  ANSWER:    'answer',
  RESEARCH:  'research',
  ANALYZE:   'analyze',
  CREATE:    'create',
  EDIT:      'edit',
  TRANSFORM: 'transform',
  EXECUTE:   'execute',
  AUTOMATE:  'automate',
  MONITOR:   'monitor',
};

export const AUTONOMY_LEVELS = {
  EXPLAIN:             0, // Explain only
  SUGGEST:             1, // Suggest next steps
  PREPARE:             2, // Prepare draft / sandbox
  EXECUTE_WITH_APPROV: 3, // High-impact action (send email, modify external state) requiring user approval
  EXECUTE_AUTO:        4, // Read-only or safe local action performed automatically
  MONITOR_AUTO:        5, // Continuous background monitoring & action
};

/**
 * Extract normalized UserIntent from a user prompt and optional context.
 *
 * @param {string} prompt
 * @param {object} [opts]
 * @returns {object}
 */
export function extractUserIntent(prompt, opts = {}) {
  const rawRequest = String(prompt || '').trim();
  const { hasAttachment = false, responseMode = 'search', connectedAppId = null } = opts;

  // 1. Identify Task Type
  let taskType = TASK_TYPES.ANSWER;
  let artifactType = null;

  if (responseMode === 'research' || /\b(research|deep dive|comprehensive study|investigate|survey|literature review)\b/i.test(rawRequest)) {
    taskType = TASK_TYPES.RESEARCH;
  } else if (/\b(create|generate|make|build|produce|design|prepare|write)\b.{0,30}\b(pdf|presentation|slide|ppt|workbook|spreadsheet|excel|doc|docx|word\s+document|report|website|diagram|code|script|component|app|summary)\b/i.test(rawRequest) || /\b(pdf|presentation|ppt|excel|xlsx|docx|website)\b/i.test(rawRequest)) {
    taskType = TASK_TYPES.CREATE;

    if (/\bpdf\b/i.test(rawRequest)) artifactType = 'pdf';
    else if (/\b(excel|spreadsheet|xlsx|csv)\b/i.test(rawRequest)) artifactType = 'excel';
    else if (/\b(powerpoint|presentation|ppt|slides)\b/i.test(rawRequest)) artifactType = 'powerpoint';
    else if (/\b(word\s+doc(?:ument)?|docx?)\b/i.test(rawRequest)) artifactType = 'word';
    else if (/\b(website|landing page|web page)\b/i.test(rawRequest)) artifactType = 'website';
  } else if (hasAttachment || /\b(analyze|read|parse|examine|inspect|look at|summarize this file|attachment|screenshot)\b/i.test(rawRequest)) {
    taskType = TASK_TYPES.ANALYZE;
  } else if (/\b(convert|transform|translate|reformat|turn this into|make this a)\b/i.test(rawRequest)) {
    taskType = TASK_TYPES.TRANSFORM;
  } else if (/\b(send|email|post|deploy|update|delete|create meeting|schedule|calendar)\b/i.test(rawRequest) || connectedAppId) {
    taskType = TASK_TYPES.EXECUTE;
  }

  // 2. Infer Autonomy Level
  let autonomyLevel = AUTONOMY_LEVELS.EXECUTE_AUTO;
  if (/\b(send|email|delete|post|overwrite|drop|destroy|purchase|pay)\b/i.test(rawRequest)) {
    autonomyLevel = AUTONOMY_LEVELS.EXECUTE_WITH_APPROV;
  }

  // 3. Extract Explicit & Inferred Requirements
  const explicitRequirements = [];
  const inferredRequirements = [];
  const constraints = [];

  if (rawRequest.length > 0) {
    explicitRequirements.push(`Address prompt: "${rawRequest.slice(0, 100)}${rawRequest.length > 100 ? '...' : ''}"`);
  }

  if (taskType === TASK_TYPES.RESEARCH) {
    inferredRequirements.push('Gather and synthesize multi-source evidence');
    inferredRequirements.push('Include citations and source URLs');
  } else if (taskType === TASK_TYPES.CREATE && artifactType) {
    inferredRequirements.push(`Ensure valid ${artifactType.toUpperCase()} document structure and clean layout`);
  } else if (taskType === TASK_TYPES.ANALYZE) {
    inferredRequirements.push('Extract key insights, data points, and actionable takeaways');
  }

  // 4. Define Success Criteria
  const successCriteria = [
    'Directly fulfills the user\'s intended goal',
    'Maintains factual accuracy and logical structure',
    'Follows correct output format and constraints',
  ];

  if (taskType === TASK_TYPES.RESEARCH) {
    successCriteria.push('Includes relevant citations and verifiable references');
  } else if (artifactType) {
    successCriteria.push(`Produces a valid, renderable ${artifactType} output`);
  }

  // 5. Confidence Score (0.0 to 1.0)
  let confidence = 0.9;
  const missingCriticalInformation = [];

  if (rawRequest.length < 5) {
    confidence = 0.4;
    missingCriticalInformation.push('Prompt is too brief to infer specific goal');
  } else if (/\b(make this better|fix this|do it|go ahead|help)\b/i.test(rawRequest) && !hasAttachment && !opts.conversationHistory?.length) {
    confidence = 0.5;
    missingCriticalInformation.push('Context or reference target is unspecified');
  }

  return {
    rawRequest,
    intent: `${taskType.toUpperCase()}_REQUEST`,
    goal: rawRequest,
    desiredOutcome: `Successfully complete ${taskType} task for the user`,
    taskType,
    artifactType,
    audience: 'user',
    explicitRequirements,
    inferredRequirements,
    constraints,
    assumptions: [],
    missingCriticalInformation,
    confidence,
    autonomyLevel,
    successCriteria,
    acceptanceCriteria: successCriteria,
  };
}

/**
 * Detects whether a user prompt or chat genuinely requests an exportable document artifact (PDF, Word, etc.).
 * Prevents false positives where prompts merely contain conversational words like "report", "document", "word", or "doc".
 *
 * @param {string} prompt
 * @param {object} [intent]
 * @returns {boolean}
 */
export function isDocumentArtifactRequest(prompt, intent = null) {
  if (!prompt || typeof prompt !== 'string') return false;
  const raw = prompt.trim();
  if (!raw) return false;

  // 1. Explicit file formats combined with document-creation/export verbs
  const hasExplicitFileAction = /\b(create|generate|make|build|produce|export|download|prepare|format|convert\s+to|save\s+as)\b.{0,35}\b(pdf|docx?|word\s+doc(?:ument)?|excel|spreadsheet|xlsx|powerpoint|presentation|ppt|pptx)\b/i.test(raw);

  // 2. Explicit file format designations
  const hasExplicitFileFormat = /\b(?:in|as|to|into)\s+(?:a\s+|an\s+)?(pdf|docx?|word\s+doc(?:ument)?|excel|spreadsheet|xlsx|powerpoint|pptx?)\b/i.test(raw) ||
                                /\b\d+[- ]page\s+(pdf|word\s+doc(?:ument)?|doc)\b/i.test(raw) ||
                                /\bpdf\s+(report|document|file|summary|deck|presentation)\b/i.test(raw) ||
                                /\b(word|docx?)\s+(document|file|report)\b/i.test(raw) ||
                                /\b(excel|spreadsheet|xlsx)\s+(sheet|workbook|file)\b/i.test(raw) ||
                                /\b(powerpoint|pptx?)\s+(presentation|deck|slides)\b/i.test(raw);

  if (hasExplicitFileAction || hasExplicitFileFormat) {
    return true;
  }

  // 3. If explicit artifactType is detected with CREATE task, verify target matches
  if (intent?.artifactType && intent.taskType === TASK_TYPES.CREATE) {
    const target = String(intent.artifactType).toLowerCase();
    if (target === 'pdf' && /\bpdf\b/i.test(raw)) return true;
    if (target === 'word' && /\b(word\s+doc(?:ument)?|docx?)\b/i.test(raw)) return true;
    if (target === 'excel' && /\b(excel|spreadsheet|xlsx|csv\s+sheet)\b/i.test(raw)) return true;
    if (target === 'powerpoint' && /\b(powerpoint|pptx?|presentation\s+slides?|slide\s+deck)\b/i.test(raw)) return true;
  }

  return false;
}
