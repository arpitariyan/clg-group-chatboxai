/**
 * Tool Router - Analyzes user prompts to determine if a connected app action is needed
 * Uses keyword matching + LLM-assisted classification for ambiguous cases
 */

import { getAppById, serializeToolsForLLM } from './app-registry.js';
import { extractUserIntent } from './user-intent.js';
import { CrossAppContextGraph } from './cross-app-context.js';

// Action keywords mapped to app tool categories
const ACTION_KEYWORDS = {
  email: [
    'send email', 'compose email', 'write email', 'reply to', 'forward email',
    'check email', 'read email', 'inbox', 'mail', 'schedule email', 'send later',
    'auto reply', 'auto-reply', 'out of office', 'follow up email', 'reminder email',
    'apology email', 'meeting invite', 'announcement email', 'sales email',
    'support email', 'draft email', 'email to', 'send to', 'message to',
    'mark as read', 'mark as unread', 'archive email', 'move email', 'trash email',
  ],
  calendar: ['schedule', 'create event', 'add event', 'meeting', 'appointment', 'calendar', 'remind me'],
  messaging: ['send message', 'post message', 'slack', 'notify', 'dm', 'channel message'],
  files: ['create file', 'upload file', 'list files', 'find file', 'google drive', 'save to drive', 'share file'],
  notes: ['create page', 'create note', 'add to notion', 'update page', 'search notion', 'write note', 'append to page', 'add content', 'query database', 'duplicate page', 'copy page', 'delete block'],
  design: ['create design', 'make poster', 'design', 'canva', 'figma', 'diagram'],
  code: ['deploy', 'run workflow', 'trigger', 'build', 'kubernetes', 'netlify'],
  data: ['stock price', 'market data', 'quote', 'crm', 'invoice', 'ticket'],
  sms: ['send sms', 'text message', 'call'],
  music: ['play', 'spotify', 'playlist', 'song', 'music'],
};

// Map keywords to likely app IDs
const KEYWORD_APP_MAP = {
  'gmail': 'gmail', 'email': 'gmail', 'mail': 'gmail', 'inbox': 'gmail',
  'outlook': 'microsoft_365', 'onedrive': 'microsoft_365', 'sharepoint': 'microsoft_365', 'teams': 'microsoft_365', 'microsoft': 'microsoft_365', 'ms365': 'microsoft_365',
  'drive': 'google_drive', 'google drive': 'google_drive',
  'slack': 'slack', 'channel': 'slack',
  'notion': 'notion', 'page': 'notion', 'database': 'notion', 'workspace': 'notion',
  'calendar': 'google_calendar', 'event': 'google_calendar', 'schedule': 'google_calendar', 'meeting': 'google_calendar',
  'canva': 'canva', 'design': 'canva',
  'figma': 'figma',
  'shopify': 'shopify', 'product': 'shopify', 'order': 'shopify',
  'spotify': 'spotify', 'play': 'spotify', 'music': 'spotify',
  'sms': 'twilio', 'text message': 'twilio',
  'jira': 'atlassian_rovo', 'confluence': 'atlassian_rovo',
  'invoice': 'zoho_books', 'crm': 'zoho_crm',
  'deploy': 'netlify', 'netlify': 'netlify',
  'domain': 'godaddy',
  'n8n': 'n8n', 'workflow': 'n8n', 'automation': 'n8n',
  'hugging face': 'hugging_face', 'inference': 'hugging_face', 'ml model': 'hugging_face',
};

/**
 * Analyze a user prompt to determine if it requires a connected app tool call
 * @param {string} prompt - User's message
 * @param {Array} connectedApps - User's connected apps [{appId, status, grantedScopes}]
 * @param {Array} conversationContext - Recent conversation messages
 * @returns {{ requiresToolCall: boolean, appId?: string, toolId?: string, confidence: number }}
 */
export function analyzePrompt(prompt, connectedApps = [], conversationContext = []) {
  if (!prompt || connectedApps.length === 0) {
    return { requiresToolCall: false, confidence: 0 };
  }

  const promptLower = prompt.toLowerCase().trim();
  const activeApps = connectedApps.filter(c => c.status === 'active');
  if (activeApps.length === 0) {
    return { requiresToolCall: false, confidence: 0 };
  }

  // Build set of connected app IDs for quick lookup
  const connectedAppIds = new Set(activeApps.map(c => c.appId));

  // Score each connected app's tools against the prompt
  const candidates = [];

  for (const connection of activeApps) {
    const app = getAppById(connection.appId);
    if (!app) continue;

    for (const tool of app.tools) {
      const score = calculateToolScore(promptLower, app, tool);
      if (score > 0) {
        candidates.push({
          appId: app.id,
          toolId: tool.id,
          confidence: score,
          appName: app.name,
          toolName: tool.name,
        });
      }
    }
  }

  if (candidates.length === 0) {
    // Check if prompt mentions an app that's NOT connected
    const suggestedApp = findUnconnectedAppSuggestion(promptLower, connectedAppIds);
    if (suggestedApp) {
      return {
        requiresToolCall: false,
        confidence: 0,
        suggestedApp,
        message: `To perform this action, you need to connect ${suggestedApp.name}. Would you like to connect it?`,
      };
    }
    return { requiresToolCall: false, confidence: 0 };
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];
  const userIntent = extractUserIntent(prompt);
  const graphEngine = new CrossAppContextGraph('user', activeApps);
  const taskGraph = graphEngine.buildTaskGraph(userIntent);

  return {
    requiresToolCall: best.confidence >= 0.3,
    appId: best.appId,
    toolId: best.toolId,
    confidence: best.confidence,
    appName: best.appName,
    toolName: best.toolName,
    alternatives: candidates.slice(1, 3),
    userIntent,
    taskGraph,
  };
}

/**
 * Detect email-specific style signals from a prompt.
 * Returns a style string or null if no clear signal.
 */
function detectEmailStyleSignal(promptLower) {
  const patterns = [
    { style: 'follow_up',    re: /\b(follow[- ]?up|following up|checking in|circling back|as discussed|per our)\b/ },
    { style: 'apology',      re: /\b(apologi[sz]e|sorry|regret|mistake|error|inconvenience)\b/ },
    { style: 'meeting',      re: /\b(meeting invite|schedule a call|calendar invite|agenda|conference)\b/ },
    { style: 'announcement', re: /\b(announce|announcing|launch|introducing|exciting news)\b/ },
    { style: 'reminder',     re: /\b(remind(?:er)?|don'?t forget|action required|time[- ]sensitive|overdue)\b/ },
    { style: 'support',      re: /\b(support ticket|issue|complaint|resolve|troubleshoot)\b/ },
    { style: 'sales',        re: /\b(sales pitch|proposal|discount|deal|pricing|demo request)\b/ },
    { style: 'auto_reply',   re: /\b(out of office|auto[- ]?reply|vacation|on leave|away message)\b/ },
    { style: 'casual',       re: /\b(casual|informally|quick note|hey there)\b/ },
    { style: 'formal',       re: /\b(formally|official letter|hereby|on behalf of)\b/ },
  ];
  for (const { style, re } of patterns) {
    if (re.test(promptLower)) return style;
  }
  return null;
}

/**
 * Detect if the prompt signals scheduling intent.
 */
function detectScheduleSignal(promptLower) {
  return /\b(schedule|send later|send at|send tomorrow|send next|in \d+ (hour|minute|day)|tomorrow at|next (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/.test(promptLower);
}


/**
 * Calculate a confidence score for how well a prompt matches a specific tool
 */
function calculateToolScore(promptLower, app, tool) {
  let score = 0;

  // Direct app name mention (high signal)
  if (promptLower.includes(app.name.toLowerCase())) {
    score += 0.4;
  }

  // Tool description keyword matching
  const toolWords = tool.description.toLowerCase().split(/\s+/);
  const promptWords = promptLower.split(/\s+/);
  const matchingWords = toolWords.filter(w => w.length > 3 && promptWords.includes(w));
  score += Math.min(matchingWords.length * 0.1, 0.3);

  // Action keyword matching
  for (const [category, keywords] of Object.entries(ACTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (promptLower.includes(keyword)) {
        // Check if this app handles this category
        if (isAppInCategory(app.id, category)) {
          score += 0.25;
          break;
        }
      }
    }
  }

  // Direct keyword-to-app mapping
  for (const [keyword, appId] of Object.entries(KEYWORD_APP_MAP)) {
    if (promptLower.includes(keyword) && app.id === appId) {
      score += 0.3;
      break;
    }
  }

  // Tool parameter hints in prompt
  for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
    if (paramDef.required && promptLower.includes(paramName.toLowerCase())) {
      score += 0.05;
    }
  }

  // ── Gmail smart tool boosting ───────────────────────────────────────────
  if (app.id === 'gmail') {
    const emailStyleSignal = detectEmailStyleSignal(promptLower);
    const scheduleSignal = detectScheduleSignal(promptLower);

    // Boost gmail_send_smart over gmail_send_email when style signals are present
    if (tool.id === 'gmail_send_smart' && emailStyleSignal) {
      score += 0.2;
    }
    // Boost gmail_schedule_email when scheduling intent is detected
    if (tool.id === 'gmail_schedule_email' && scheduleSignal) {
      score += 0.3;
    }
    // Boost gmail_smart_reply for reply intents with thread context
    if (tool.id === 'gmail_smart_reply' &&
      (promptLower.includes('reply') || promptLower.includes('respond') || promptLower.includes('answer'))) {
      score += 0.15;
    }
    // Boost gmail_auto_reply for auto-reply intents
    if (tool.id === 'gmail_auto_reply' && detectEmailStyleSignal(promptLower) === 'auto_reply') {
      score += 0.35;
    }
    // Boost gmail_mark_read for read/unread marking
    if (tool.id === 'gmail_mark_read' &&
      (promptLower.includes('mark as read') || promptLower.includes('mark as unread') || promptLower.includes('mark read'))) {
      score += 0.4;
    }
    // Boost gmail_move_email for archive/trash/move intents
    if (tool.id === 'gmail_move_email' &&
      (promptLower.includes('archive') || promptLower.includes('trash') || promptLower.includes('move email') || promptLower.includes('delete email'))) {
      score += 0.4;
    }
  }

  return Math.min(score, 1.0);
}

function isAppInCategory(appId, category) {
  const categoryMap = {
    email: ['gmail', 'microsoft_365', 'mailtrap'],
    calendar: ['google_calendar', 'fantastical'],
    messaging: ['slack', 'twilio'],
    files: ['google_drive', 'microsoft_365'],
    notes: ['notion', 'apple_notes'],
    design: ['canva', 'figma', 'eraser', 'blender'],
    code: ['netlify', 'kubernetes_mcp', 'hugging_face', 'n8n'],
    data: ['massive_market_data', 'zoho_crm', 'zoho_books', 'zoho_desk'],
    sms: ['twilio'],
    music: ['spotify'],
  };
  return categoryMap[category]?.includes(appId) || false;
}

function findUnconnectedAppSuggestion(promptLower, connectedAppIds) {
  for (const [keyword, appId] of Object.entries(KEYWORD_APP_MAP)) {
    if (promptLower.includes(keyword) && !connectedAppIds.has(appId)) {
      const app = getAppById(appId);
      if (app) return { id: app.id, name: app.name };
    }
  }
  return null;
}

/**
 * LLM-assisted classification for ambiguous prompts (confidence 0.3-0.7)
 * Sends a lightweight classification prompt to Groq
 * @param {string} prompt - User's message
 * @param {Array} connectedApps - Connected apps
 * @param {Array} conversationContext - Recent messages
 * @param {Function} llmCall - Function to call LLM (injected to avoid circular deps)
 * @returns {{ appId: string, toolId: string, confidence: number, extractedParams: object }}
 */
export async function classifyWithLLM(prompt, connectedApps, conversationContext, llmCall) {
  const tools = serializeToolsForLLM(connectedApps);
  if (tools.length === 0) return { requiresToolCall: false, confidence: 0 };

  const toolList = tools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n');

  const classificationPrompt = `You are a tool routing classifier. Given the user's message, determine which tool (if any) should be used.

Available tools:
${toolList}

User message: "${prompt}"

${conversationContext.length > 0 ? `Recent context:\n${conversationContext.slice(-5).map(m => `${m.role}: ${m.content?.slice(0, 100)}`).join('\n')}` : ''}

Respond with ONLY a JSON object:
- If a tool should be used: {"toolCall": true, "toolId": "<tool_id>", "confidence": <0.0-1.0>, "params": {<extracted parameters>}}
- If no tool is needed: {"toolCall": false, "confidence": 0}`;

  try {
    const response = await llmCall(classificationPrompt, 'tool_classification');
    const parsed = JSON.parse(response);
    if (parsed.toolCall && parsed.toolId) {
      // Find the app that owns this tool
      const tool = tools.find(t => t.function.name === parsed.toolId);
      if (tool) {
        const appId = findAppIdForTool(parsed.toolId, connectedApps);
        return {
          requiresToolCall: true,
          appId,
          toolId: parsed.toolId,
          confidence: Math.min(parsed.confidence || 0.8, 1.0),
          extractedParams: parsed.params || {},
        };
      }
    }
    return { requiresToolCall: false, confidence: 0 };
  } catch (err) {
    console.warn('[ToolRouter] LLM classification failed:', err.message);
    return { requiresToolCall: false, confidence: 0 };
  }
}

function findAppIdForTool(toolId, connectedApps) {
  for (const conn of connectedApps) {
    const app = getAppById(conn.appId);
    if (app?.tools.some(t => t.id === toolId)) return conn.appId;
  }
  return null;
}

/**
 * Extract parameters from prompt using LLM
 * @param {string} prompt
 * @param {object} toolSchema - The tool's action schema
 * @param {Function} llmCall
 * @returns {object} Extracted parameters
 */
export async function extractParameters(prompt, toolSchema, conversationContext, llmCall) {
  const paramDescriptions = Object.entries(toolSchema.parameters)
    .map(([key, def]) => `- ${key} (${def.type}${def.required ? ', required' : ', optional'}): ${def.description}`)
    .join('\n');

  // Build email-specific guidance if this is a Gmail tool
  const isGmailTool = toolSchema.id?.startsWith('gmail_');
  const gmailGuidance = isGmailTool ? `

## Email-Specific Extraction Rules
- **CC detection**: If the user says "cc [name/email]", "copy [name]", "also send to", extract the CC email address(es) into the \`cc\` parameter as an array.
- **BCC detection**: If the user says "bcc [name/email]", "blind copy", extract BCC email(s) into \`bcc\` as an array.
- **Schedule time**: If the user says "send later", "schedule for", "send tomorrow", "send at 3pm", "send next Monday", extract the scheduling expression EXACTLY as written into \`scheduledTime\`. Do NOT convert to ISO — keep the natural language (e.g., "tomorrow at 9am").
- **Email style**: Detect the appropriate \`emailStyle\` from context:
  - "professionally", "formal", "business email" → \`professional\`
  - "casually", "informal" → \`casual\`
  - "friendly", "warm" → \`friendly\`
  - "apologize", "sorry" → \`apology\`
  - "follow up", "checking in" → \`follow_up\`
  - "meeting", "calendar" → \`meeting\`
  - "remind", "reminder" → \`reminder\`
  - "announce", "launch" → \`announcement\`
  - "sales", "pitch", "offer" → \`sales\`
  - "support", "issue", "ticket" → \`support\`
  - "out of office", "auto reply" → \`auto_reply\`
  - Default: \`professional\`
- **Recipient extraction**: If the user mentions a name without an email, use the name as-is; the full email address is preferred if mentioned.
- **Auto-reply style**: For gmail_auto_reply, detect \`autoReplyStyle\`:
  - "out of office", "vacation", "away" → \`out_of_office\`
  - "acknowledge", "received" → \`acknowledgment\`
  - "busy", "high volume", "delayed" → \`busy_response\`
  - Otherwise → \`acknowledgment\`
` : '';

  const extractionPrompt = `Extract the parameters for the "${toolSchema.name}" tool from the user's message.

Parameters needed:
${paramDescriptions}${gmailGuidance}

User message: "${prompt}"

${conversationContext.length > 0 ? `Context:\n${conversationContext.slice(-3).map(m => `${m.role}: ${m.content?.slice(0, 150)}`).join('\n')}` : ''}

Respond with ONLY a JSON object containing the extracted parameter values. Use null for parameters you cannot determine from the message.`;

  try {
    const response = await llmCall(extractionPrompt, 'parameter_extraction');
    return JSON.parse(response);
  } catch (err) {
    console.warn('[ToolRouter] Parameter extraction failed:', err.message);
    return {};
  }
}
