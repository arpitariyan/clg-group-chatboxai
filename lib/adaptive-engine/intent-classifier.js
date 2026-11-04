/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Intent Understanding & Classification (Phase 3)
 * ═══════════════════════════════════════════════════════════════
 * Classifies incoming user requests into fine-grained task categories,
 * evaluates request ambiguity, determines expected format/tone/depth,
 * and extracts explicit user constraints.
 */

export const ADAPTIVE_TASK_CATEGORIES = {
  GENERAL_CHAT:        'general_chat',
  FACTUAL_QUESTION:    'factual_question',
  EXPLANATION:         'explanation',
  RESEARCH:            'research',
  CODING:              'coding',
  DEBUGGING:           'debugging',
  ARCHITECTURE:        'architecture',
  MATHEMATICS:         'mathematics',
  ANALYSIS:            'analysis',
  WRITING:             'writing',
  REWRITING:           'rewriting',
  SUMMARIZATION:       'summarization',
  TRANSLATION:         'translation',
  BRAINSTORMING:       'brainstorming',
  PLANNING:            'planning',
  COMPARISON:          'comparison',
  TROUBLESHOOTING:     'troubleshooting',
  CREATIVE_GENERATION: 'creative_generation',
  MULTIMODAL_ANALYSIS: 'multimodal_analysis',
};

// ── Heuristic Signal Matchers ──────────────────────────────────────────────────

const CODING_REGEX = /\b(code|coding|function|class|method|api|endpoint|sql|script|algorithm|typescript|javascript|python|java|rust|go|react|next\.?js|html|css|bash|regex|docker|git)\b/i;
const DEBUG_REGEX = /\b(debug|fix|error|bug|exception|traceback|crash|failing|failed|issue|typeerror|syntaxerror|nullpointer|why is this not working)\b/i;
const ARCHITECTURE_REGEX = /\b(architecture|system design|scalable|microservices|distributed|database schema|data pipeline|infrastructure|caching strategy|load balancer|event-driven)\b/i;
const MATH_REGEX = /\b(calculate|compute|solve|equation|formula|derivative|integral|matrix|probability|algebra|statistics|theorem|arithmetic|\d+\s*[\+\-\*\/\^]\s*\d+)\b/i;
const RESEARCH_REGEX = /\b(research|synthesize|findings on|deep dive|comprehensive study|literature review|state of the art|empirical|historical analysis|whitepaper)\b/i;
const COMPARISON_REGEX = /\b(compare|versus|vs\.?|difference between|pros and cons|trade-?offs?|which is better|recommend between)\b/i;
const EXPLANATION_REGEX = /\b(explain|how does|what is the meaning of|concept of|demystify|walk me through|clarify)\b/i;
const FACTUAL_REGEX = /\b(when did|who is|where is|what year|capital of|height of|how many|current ceo of|birthday of|population of)\b/i;
const WRITING_REGEX = /\b(write (an?|a)? (essay|article|letter|email|proposal|speech|blog post|story|dialogue))\b/i;
const REWRITING_REGEX = /\b(rewrite|paraphrase|proofread|rephrase|improve this text|make it more professional|polish this)\b/i;
const SUMMARIZATION_REGEX = /\b(summarize|summary|tldr|key takeaways|executive summary|condense|digest|brief overview of this text)\b/i;
const TRANSLATION_REGEX = /\b(translate|how do you say|in spanish|in french|in german|in hindi|in japanese|in chinese)\b/i;
const BRAINSTORMING_REGEX = /\b(brainstorm|give me ideas|creative ideas|angles|suggest ways|possibilities|pitch ideas)\b/i;
const PLANNING_REGEX = /\b(plan|roadmap|step-by-step plan|timeline|milestones|project plan|schedule|launch checklist)\b/i;
const TROUBLESHOOTING_REGEX = /\b(troubleshoot|diagnose|resolve issue|why is my|not connecting|cannot access|stuck on)\b/i;
const CREATIVE_REGEX = /\b(poem|fiction|song lyrics|script for a movie|creative story|fable|haiku)\b/i;
const ANALYSIS_REGEX = /\b(analyze|analysis|evaluate risk|risk assessment|audit|assess|inspect data|breakdown|risk level)\b/i;

// ── Ambiguity Signals ─────────────────────────────────────────────────────────

const VAGUE_PATTERNS = [
  /^(help|help me|fix this|make it better|improve|do it|what do you think\??|check this|look at this)$/i,
  /^(why\??|how\??|what\??|test)$/i,
  /\b(it doesn't work|it broke|something is wrong|not working)\b$/i,
];

/**
 * Detect whether a user prompt has significant ambiguity.
 */
export function detectAmbiguity(prompt, context = {}) {
  const text = String(prompt || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const hasHistory = Array.isArray(context.conversationHistory) && context.conversationHistory.length > 0;
  const hasAttachments = Boolean(context.hasAttachment || context.searchResult?.length);

  // If query is extremely short and has no antecedents/attachments, it is ambiguous
  if (words.length <= 3 && !hasHistory && !hasAttachments) {
    if (VAGUE_PATTERNS.some(p => p.test(text))) {
      return {
        isAmbiguous: true,
        ambiguityScore: 0.85,
        reason: 'Prompt is an isolated vague request with no context or attachments.',
        clarificationNeeded: true,
      };
    }
  }

  // Pronoun references without clear subject in prompt
  const hasFloatingPronoun = /\b(this|that|it|these|those)\b/i.test(text) && words.length < 6 && !hasHistory && !hasAttachments;
  if (hasFloatingPronoun) {
    return {
      isAmbiguous: true,
      ambiguityScore: 0.65,
      reason: 'Prompt references "it/this/that" without preceding subject or attachment.',
      clarificationNeeded: false, // best effort with clarification note
    };
  }

  return {
    isAmbiguous: false,
    ambiguityScore: 0.1,
    reason: null,
    clarificationNeeded: false,
  };
}

/**
 * Detect explicit format requested by the user.
 */
export function detectRequestedFormat(prompt) {
  const lower = String(prompt || '').toLowerCase();

  if (/\b(only code|just code|no explanation|code only|give only the code)\b/.test(lower)) {
    return { format: 'raw_code', strictCodeOnly: true };
  }
  if (/\b(json|as a json object|json format|valid json)\b/.test(lower)) {
    return { format: 'json', strictCodeOnly: false };
  }
  if (/\b(table|in a table|comparison table|tabular format)\b/.test(lower)) {
    return { format: 'table', strictCodeOnly: false };
  }
  if (/\b(step[- ]by[- ]step|steps|numbered list|checklist)\b/.test(lower)) {
    return { format: 'numbered_steps', strictCodeOnly: false };
  }
  if (/\b(bullet points?|bulleted list|in bullets)\b/.test(lower)) {
    return { format: 'bullet_list', strictCodeOnly: false };
  }
  if (/\b(brief|one sentence|short answer|concise|tldr|in \d+ words?)\b/.test(lower)) {
    return { format: 'concise_direct', strictCodeOnly: false };
  }

  return { format: 'markdown_structured', strictCodeOnly: false };
}

/**
 * Detect expected tone based on prompt and task.
 */
export function detectTone(prompt, category) {
  const lower = String(prompt || '').toLowerCase();

  if (/\b(simple|for a beginner|like i'm 5|eli5|plain english|in simple terms)\b/.test(lower)) {
    return 'simple_accessible';
  }
  if (/\b(formal|executive|academic|professional|rigorous)\b/.test(lower)) {
    return 'formal_executive';
  }
  if (category === ADAPTIVE_TASK_CATEGORIES.CODING || category === ADAPTIVE_TASK_CATEGORIES.DEBUGGING) {
    return 'technical_precise';
  }
  if (category === ADAPTIVE_TASK_CATEGORIES.RESEARCH) {
    return 'objective_evidence_based';
  }

  return 'helpful_balanced';
}

/**
 * Main Intent Classifier
 * Determines category, ambiguity, format, tone, and verification requirements.
 */
export function classifyAdaptiveIntent(prompt, context = {}) {
  const text = String(prompt || '').trim();
  const lower = text.toLowerCase();
  const { responseMode = 'search', hasAttachment = false } = context;

  // Multimodal check
  if (hasAttachment || context.hasImages || context.hasDocuments) {
    return buildClassificationResult(ADAPTIVE_TASK_CATEGORIES.MULTIMODAL_ANALYSIS, prompt, context);
  }

  // Explicit research mode
  if (responseMode === 'research') {
    return buildClassificationResult(ADAPTIVE_TASK_CATEGORIES.RESEARCH, prompt, context);
  }

  // Category classification priority
  let category = ADAPTIVE_TASK_CATEGORIES.GENERAL_CHAT;

  const EXPLICIT_DEBUG_SIGNS = /\b(typeerror|syntaxerror|referenceerror|nullpointer|traceback|at\s+[a-z0-9_.\-]+\s*\([a-z0-9_.\-]+:\d+\)|unhandledpromiserejection|cannot read propert)\b/i;

  if (EXPLICIT_DEBUG_SIGNS.test(lower) || (DEBUG_REGEX.test(lower) && (CODING_REGEX.test(lower) || /\b(line \d+|undefined|null|stack trace)\b/i.test(lower)))) {
    category = ADAPTIVE_TASK_CATEGORIES.DEBUGGING;
  } else if (RESEARCH_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.RESEARCH;
  } else if (ARCHITECTURE_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.ARCHITECTURE;
  } else if (CODING_REGEX.test(lower) || /```/.test(text)) {
    category = ADAPTIVE_TASK_CATEGORIES.CODING;
  } else if (MATH_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.MATHEMATICS;
  } else if (COMPARISON_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.COMPARISON;
  } else if (TROUBLESHOOTING_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.TROUBLESHOOTING;
  } else if (PLANNING_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.PLANNING;
  } else if (BRAINSTORMING_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.BRAINSTORMING;
  } else if (TRANSLATION_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.TRANSLATION;
  } else if (SUMMARIZATION_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.SUMMARIZATION;
  } else if (REWRITING_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.REWRITING;
  } else if (WRITING_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.WRITING;
  } else if (CREATIVE_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.CREATIVE_GENERATION;
  } else if (EXPLANATION_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.EXPLANATION;
  } else if (ANALYSIS_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.ANALYSIS;
  } else if (FACTUAL_REGEX.test(lower)) {
    category = ADAPTIVE_TASK_CATEGORIES.FACTUAL_QUESTION;
  }

  return buildClassificationResult(category, prompt, context);
}

function buildClassificationResult(category, prompt, context) {
  const ambiguity = detectAmbiguity(prompt, context);
  const requestedFormat = detectRequestedFormat(prompt);
  const tone = detectTone(prompt, category);

  const requiresVerification = [
    ADAPTIVE_TASK_CATEGORIES.CODING,
    ADAPTIVE_TASK_CATEGORIES.DEBUGGING,
    ADAPTIVE_TASK_CATEGORIES.MATHEMATICS,
    ADAPTIVE_TASK_CATEGORIES.RESEARCH,
    ADAPTIVE_TASK_CATEGORIES.FACTUAL_QUESTION,
  ].includes(category);

  const requiresExternalSearch = [
    ADAPTIVE_TASK_CATEGORIES.RESEARCH,
    ADAPTIVE_TASK_CATEGORIES.FACTUAL_QUESTION,
  ].includes(category) && !context.hasDocuments;

  return {
    category,
    ambiguity,
    requestedFormat,
    tone,
    requiresVerification,
    requiresExternalSearch,
    confidence: ambiguity.isAmbiguous ? 0.55 : 0.92,
  };
}
