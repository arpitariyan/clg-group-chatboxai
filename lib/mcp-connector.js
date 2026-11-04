/**
 * MCP Connector - Model Context Protocol style tool integration
 * 
 * This module works like Claude's MCP system:
 * 1. Fetches user's connected apps
 * 2. Injects their tools as function definitions into the AI system prompt
 * 3. When AI responds with a tool_call, executes it automatically
 * 4. Returns the tool result back to the AI for final response generation
 * 
 * The AI decides WHEN to use tools based on the user's message - no separate routing needed.
 */

import { getUserConnections } from './oauth-manager.js';
import { getAppById, serializeToolsForLLM } from './app-registry.js';
import { execute } from './tool-executor.js';
import { databases, DB_ID } from '@/services/appwrite-admin.js';
import { CHATS_COLLECTION_ID } from '@/services/appwrite-collections.js';

const CANVA_JOB_POLL_INTERVAL_MS = 3000;
const CANVA_JOB_MAX_ATTEMPTS = 60;
const CANVA_DESIGN_MARKER_REGEX = /<!--CANVA_DESIGN:[\s\S]*?-->/g;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRenderableCanvaPayload = (payload = {}) => Boolean(
  payload.imageUrl
  || payload.thumbnailUrl
  || payload.downloadUrl
  || payload.editUrl
  || payload.designId
);

const buildCanvaPayload = (payload = {}, prompt = '') => {
  const imageUrl = payload.imageUrl || payload.thumbnailUrl || null;
  const editUrl = payload.editUrl || payload.viewUrl || null;
  const downloadUrl = payload.downloadUrl || imageUrl || null;

  return {
    ...payload,
    status: 'completed',
    stage: 'completed',
    prompt: payload.prompt || prompt || '',
    imageUrl,
    thumbnailUrl: payload.thumbnailUrl || imageUrl,
    downloadUrl,
    editUrl,
    _canvaDesign: true,
    _canvaFinalized: true,
  };
};

const buildCanvaPendingPayload = (payload = {}, prompt = '') => ({
  ...payload,
  status: 'in_progress',
  stage: payload.stage || 'queued',
  prompt: payload.prompt || prompt || '',
  _canvaDesign: false,
  _canvaPending: true,
});

const serializeCanvaMarker = (payload) => `<!--CANVA_DESIGN:${JSON.stringify(payload)}-->`;

const mergeCanvaMarker = (existingAiResp = '', payload = {}) => {
  const marker = serializeCanvaMarker(payload);
  const current = String(existingAiResp || '');
  CANVA_DESIGN_MARKER_REGEX.lastIndex = 0;
  if (CANVA_DESIGN_MARKER_REGEX.test(current)) {
    CANVA_DESIGN_MARKER_REGEX.lastIndex = 0;
    return current.replace(CANVA_DESIGN_MARKER_REGEX, marker);
  }
  return current ? `${current}\n\n${marker}` : marker;
};

async function persistCanvaMarker(recordId, payload) {
  if (!recordId || !payload) return;

  const existing = await databases.getDocument(DB_ID, CHATS_COLLECTION_ID, recordId);
  if (!existing || typeof existing.aiResp !== 'string') return;

  const nextAiResp = mergeCanvaMarker(existing.aiResp, payload);
  if (nextAiResp !== existing.aiResp) {
    await databases.updateDocument(DB_ID, CHATS_COLLECTION_ID, recordId, { aiResp: nextAiResp });
  }
}

async function waitForCanvaGenerationCompletion({ userId, appId = 'canva', jobId, prompt = '' }) {
  if (!jobId) return null;

  for (let attempt = 0; attempt < CANVA_JOB_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(CANVA_JOB_POLL_INTERVAL_MS);
    }

    const statusExec = await execute(userId, appId, 'canva_get_design_generation_job', { jobId }, { confirmed: true });
    const statusPayload = statusExec?.result || statusExec?.data || statusExec;

    if (!statusPayload) {
      continue;
    }

    if (statusPayload.status === 'failed') {
      throw new Error(statusPayload.error || 'Canva generation failed.');
    }

    if (statusPayload.status === 'completed' && isRenderableCanvaPayload(statusPayload)) {
      return buildCanvaPayload(statusPayload, prompt);
    }

    if (statusPayload.status === 'success' && isRenderableCanvaPayload(statusPayload)) {
      return buildCanvaPayload({ ...statusPayload, status: 'completed' }, prompt);
    }

    if (statusPayload.currentStatus === 'completed' && isRenderableCanvaPayload(statusPayload.statusDetails || statusPayload)) {
      return buildCanvaPayload(statusPayload.statusDetails || statusPayload, prompt);
    }
  }

  throw new Error('Canva generation timed out before a final design was produced.');
}

/**
 * Get all available tools for a user based on their connected apps
 * Returns tools in OpenAI function-calling format
 * @param {string} userIdOrEmail - Firebase UID or email
 * @returns {{ tools: Array, hasTools: boolean, connectedApps: Array }}
 */
export async function getUserTools(userIdOrEmail) {
  if (!userIdOrEmail) return { tools: [], hasTools: false, connectedApps: [] };

  let connections = [];
  try {
    connections = await getUserConnections(userIdOrEmail);
  } catch {
    return { tools: [], hasTools: false, connectedApps: [] };
  }

  const activeConnections = (connections || []).filter(c => c.status === 'active');
  if (activeConnections.length === 0) {
    return { tools: [], hasTools: false, connectedApps: [] };
  }

  const tools = serializeToolsForLLM(activeConnections);
  return { tools, hasTools: tools.length > 0, connectedApps: activeConnections };
}

/**
/**
 * Build Canva-specific system prompt for the AI
 * This is used when ONLY Canva tools are available (user selected Canva app)
 */
function buildCanvaSystemPrompt(tools, toolDescriptions) {
  return `

## CANVA DESIGN TOOLS

You are connected to Canva and can create, search, export, and manage designs. When the user asks you to create or work with designs, use the Canva tools below.

Available Canva tools:
${toolDescriptions}

### How to call a tool:
When you need to use a Canva tool, include this EXACT JSON block in your response:
\`\`\`tool_call
{"tool": "<tool_name>", "parameters": {<parameters as JSON>}}
\`\`\`

### CANVA DESIGN GENERATION RULES:

1. **canva_generate_design** — Use this to create NEW designs from a text description.
   - ALWAYS provide a detailed \`prompt\` that describes the design clearly
   - Include style, colors, content, layout preferences in the prompt
   - Optionally specify \`designType\`: instagram_post, presentation, poster, logo, flyer, resume, menu, invitation, business_card, youtube_thumbnail, facebook_cover, linkedin_banner
   - Optionally specify \`style\`: modern, minimalist, vintage, bold, professional, fun, elegant, corporate
   - Optionally specify \`colorScheme\`: specific colors like "purple and gold" or hex codes "#FF5733,#3498DB"
   - Example:
\`\`\`tool_call
{"tool": "canva_generate_design", "parameters": {"prompt": "Create an energetic esports gaming tournament poster with neon cyberpunk atmosphere, glowing purple and red lights, futuristic gaming setup, modern typography", "designType": "poster", "style": "bold", "colorScheme": "purple and red neon"}}
\`\`\`

2. **canva_search_designs** — Search user's saved designs by name or type
3. **canva_search** — Search Canva's template library for inspiration
4. **canva_get_design** — Get details about a specific design (name, type, pages, thumbnail)
5. **canva_get_design_pages** — Get all pages of a multi-page design
6. **canva_get_design_content** — Analyze design elements (text, images, colors, fonts)
7. **canva_export_design** — Export a design as PNG, JPG, PDF, SVG, MP4, or GIF
8. **canva_get_export_formats** — Check available export formats for a design
9. **canva_get_design_export_status** — Check export job progress
10. **canva_create_folder** — Create a folder to organize designs
11. **canva_move_item_to_folder** — Move a design into a folder
12. **canva_list_folder_items** — List contents of a folder
13. **canva_add_comment_thread_to_design** — Add a comment to a design
14. **canva_import_design_from_url** — Import a design from a shared Canva URL
15. **canva_get_design_import_from_url_status** — Check import progress
16. **canva_get_design_generation_job** — Check design generation progress
17. **canva_fetch** — Fetch data from a Canva URL

### WORKFLOW FOR DESIGN CREATION:
When the user asks to create/generate/make a design:
1. Call \`canva_generate_design\` with a detailed prompt based on the user's request
2. Treat \`canva_generate_design\` as the start of an async Canva workflow, not the final output
3. Use \`canva_get_design_generation_job\` to check progress and wait for the generated design to become ready
4. Once ready, present the design with edit/download links and, if needed, call \`canva_export_design\` for a downloadable file

### IMPORTANT RULES:
- ONLY use the Canva tools listed above. Do NOT call notion_search, gmail_send_email, or any other non-Canva tool.
- When the user describes a design they want, ALWAYS use canva_generate_design — don't just describe what you would create.
- Be creative with the prompt — add details about style, colors, layout, typography, and mood.
- If the user asks to export, use canva_export_design with the designId and desired format.
- If the user asks to search their designs, use canva_search_designs.
- If the user asks for templates/inspiration, use canva_search.

`;
}

/**
 * Build the MCP system prompt addition that tells the AI about available tools
 * This gets appended to the existing system prompt
 * @param {Array} tools - Tools in function-calling format
 * @returns {string} System prompt addition
 */
export function buildMCPSystemPrompt(tools) {
  if (!tools || tools.length === 0) return '';

  const toolDescriptions = tools.map(t => 
    `- **${t.function.name}**: ${t.function.description}`
  ).join('\n');

  // Detect which app's tools are present
  const hasCanvaTools = tools.some(t => t.function.name.startsWith('canva_'));
  const hasGmailTools = tools.some(t => t.function.name.startsWith('gmail_'));
  const hasNotionTools = tools.some(t => t.function.name.startsWith('notion_'));
  const hasSlackTools = tools.some(t => t.function.name.startsWith('slack_'));
  const hasCalendarTools = tools.some(t => t.function.name.startsWith('calendar_'));
  const hasDriveTools = tools.some(t => t.function.name.startsWith('drive_'));

  // If ONLY Canva tools are present, use a Canva-specific prompt
  if (hasCanvaTools && !hasGmailTools && !hasNotionTools && !hasSlackTools && !hasCalendarTools && !hasDriveTools) {
    return buildCanvaSystemPrompt(tools, toolDescriptions);
  }

  return `

## CONNECTED APPS (MCP Tools)

You have access to the following connected app tools. When the user's request requires using one of these tools, respond with a JSON tool call block. You can use multiple tools in sequence if needed.

**CRITICAL: You can ONLY use the tools listed below. Do NOT use any tool that is not in this list. If a tool name is mentioned in the rules below but is NOT in the Available tools list, IGNORE it completely.**

Available tools:
${toolDescriptions}

### How to call a tool:
When you need to use a tool, include this EXACT JSON block in your response:
\`\`\`tool_call
{"tool": "<tool_name>", "parameters": {<parameters as JSON>}}
\`\`\`

### EMAIL COMPOSITION RULES (gmail_send_email):
When composing emails, you MUST follow these rules:
1. **Extract names properly** — If the user mentions a person's name (e.g., "mera friend Sambit Suman Jeythi"), use that EXACT name in the email greeting and body. Never send a generic email without the person's name.
2. **Write with deep emotion and feeling** — Emails should feel warm, personal, and deeply human. For wishes (birthday, anniversary, congratulations), write heartfelt content with genuine emotion — not robotic templates. Use poetic language, metaphors, and personal touches. Make the recipient feel truly special.
3. **Use beautiful HTML email template** — Always use a complete, styled HTML email body. Here is the EXACT format you must use:

\`\`\`
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 3px; border-radius: 16px;">
  <div style="background: #ffffff; border-radius: 14px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">🎉 [OCCASION TITLE] 🎉</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin-top: 8px;">[Subtitle or date]</p>
    </div>
    <div style="padding: 35px 30px;">
      <p style="font-size: 16px; color: #333; line-height: 1.8; margin-bottom: 20px;">Dear <strong>[Name]</strong>,</p>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin-bottom: 16px;">[Emotional paragraph 1 — heartfelt opening with genuine warmth]</p>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin-bottom: 16px;">[Emotional paragraph 2 — specific wishes, memories, or blessings]</p>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin-bottom: 16px;">[Emotional paragraph 3 — closing thoughts with love]</p>
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px;">
        <p style="font-size: 18px; color: #5b21b6; font-weight: 600; margin: 0; font-style: italic;">"[A beautiful quote or blessing relevant to the occasion]"</p>
      </div>
      <p style="font-size: 15px; color: #444; line-height: 1.8;">With all my love and warmest wishes,</p>
      <p style="font-size: 16px; color: #333; font-weight: 600; margin-top: 8px;">[Sender's name or "Your Friend"]</p>
    </div>
    <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #888; margin: 0;">Sent with ❤️ via ChatBox AI</p>
    </div>
  </div>
</div>
\`\`\`

   IMPORTANT: Adapt the gradient colors based on the occasion:
   - Anniversary/Love: #e91e63 → #9c27b0 (pink to purple)
   - Birthday: #ff6b35 → #f7c948 (orange to gold)
   - Congratulations: #00b894 → #00cec9 (green to teal)
   - Professional: #2d3436 → #636e72 (dark gray)
   - General warm: #667eea → #764ba2 (blue to purple)

4. **Match the tone** — If the user writes casually (Hinglish/Hindi), understand the intent but compose the email in the appropriate language (usually English unless specified otherwise). The email should match the occasion's formality.
5. **Subject line** — Write a compelling, specific subject line that matches the occasion (e.g., "Happy 2nd Anniversary, Sambit & Family! 🎉" not just "Anniversary Wish")
6. **Sign off** — NEVER use "[Your Name]". If the user's name is known from context, use it. Otherwise use "Your Friend" or "With Love" as the sign-off. Ask the user's name if critical.
7. **Content depth** — Write at least 3-4 meaningful paragraphs. Each paragraph should have genuine emotional content, not filler. Include specific references to the occasion (e.g., "2 wonderful years of togetherness" for a 2nd anniversary).

### EMAIL REPLY RULES (gmail_reply_email):
When replying to emails, follow these rules:
1. **If you have the threadId** — Use \`gmail_get_thread\` first to read the full conversation, then reply with the threadId and messageId for proper threading.
2. **If you DON'T have the threadId** — You can still reply! Just use \`gmail_reply_email\` with the recipient's email, "Re: [subject]" as subject, and your reply body. It will be sent as a new message to them. This is perfectly fine for most reply scenarios.
3. **Generate natural reply** — Write a reply that sounds like a real human wrote it:
   - Match the tone of the original (formal → formal, casual → casual)
   - Reference specific points from their message if known
   - Be contextual — don't repeat what they already know
   - Keep it conversational and natural
4. **Use proper reply format** — The subject should start with "Re: ". 
5. **HTML formatting for replies** — Use clean, simple HTML for replies (not the full template used for new emails):
\`\`\`
<div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.7;">
  <p>[Your reply content here — natural, conversational paragraphs]</p>
  <p>[Additional paragraph if needed]</p>
  <p style="margin-top: 16px;">Best,<br>[Name or "Thanks"]</p>
</div>
\`\`\`

### IMPORTANT — DO NOT FABRICATE IDs:
- NEVER make up or guess a threadId or messageId. If you don't have them from a previous tool call result, leave them empty/omit them.
- If the user says "reply to that email" but you haven't read any emails in this conversation, just send the reply as a new email using gmail_reply_email with only to, subject, and body.

### EMAIL READING & SEARCH RULES:
- **gmail_read_emails** — Read recent emails with full content (body, subject, from, to, date). Use query param for filtering:
  - By sender: \`from:someone@email.com\`
  - By recipient: \`to:someone@email.com\`
  - By subject: \`subject:invoice\`
  - By status: \`is:unread\`, \`is:starred\`, \`is:important\`
  - By date: \`after:2024/01/01\`, \`before:2024/12/31\`, \`newer_than:7d\`, \`older_than:3m\`
  - By attachment: \`has:attachment\`, \`filename:pdf\`
  - By label: \`label:work\`, \`in:sent\`, \`in:trash\`
  - Combined: \`from:boss newer_than:14d is:unread\`
- **gmail_get_thread** — Get full conversation thread with ALL messages. Use this to:
  - Read an entire email chain before replying
  - Summarize a long conversation
  - Extract action items or decisions from a discussion
  - Understand context before a meeting
  - Requires a real threadId from gmail_read_emails or gmail_search_threads
- **gmail_search_threads** — Search threads/conversations. Returns thread summaries (subject, participants, dates, message count). Use for:
  - Finding specific conversations: \`from:john subject:meeting\`
  - Finding old emails: \`project deadline older_than:3m\`
  - Finding attachments: \`has:attachment from:client\`
  - Date-based search: \`after:2024/07/01 before:2024/07/31\`
- **gmail_list_labels** — List all labels/folders with hierarchy. Use when user asks "show my labels", "what folders do I have", or needs to understand their email organization.
- **gmail_list_drafts** — List saved drafts with content preview. Shows pending/unsent emails.
- **gmail_get_draft** — Read a specific draft's full content. Use after gmail_list_drafts.
- **gmail_create_draft** — Save an email as draft without sending. Use when user says "draft", "save for later", "don't send yet", or "write a reply but don't send"

### GMAIL SUMMARIZATION RULES:
When the user asks to summarize emails or threads:
1. **Single email summary** — Extract key points: who sent it, what they want, any deadlines, action items
2. **Thread summary** — Read the full thread with gmail_get_thread, then provide:
   - Brief overview (1-2 sentences)
   - Key decisions made
   - Action items with owners and deadlines
   - Timeline of events
   - Different perspectives if it's a discussion
3. **Multiple email summary** — Search with gmail_read_emails, then summarize each briefly
4. **Meeting prep** — Search for relevant threads, summarize key points, list pending items

### GMAIL DRAFT WORKFLOW:
When user wants to compose but not send:
1. Understand what they want to write (tone, content, recipient)
2. Compose the email with appropriate tone and formatting
3. Call gmail_create_draft to save it
4. Tell the user: "Draft saved! You can find it in your Drafts folder to review and send when ready."

### REPLY WORKFLOW (when threadId is available):
1. Call \`gmail_search_threads\` or \`gmail_read_emails\` to find the email
2. Call \`gmail_get_thread\` with the threadId to read the full conversation
3. Generate a contextual, natural reply based on the conversation
4. Call \`gmail_reply_email\` with threadId, messageId, to, subject (Re: ...), and body

### REPLY WORKFLOW (when threadId is NOT available — most common case):
1. User says "reply to [person]" about [topic]
2. Just call \`gmail_reply_email\` with to (their email), subject ("Re: [topic]"), and body (your reply)
3. It will be sent as a new message — this is fine!

### GMAIL TONE MATCHING:
When composing replies or drafts, match the appropriate tone:
- **Professional/Formal** — For clients, bosses, official communication. Use proper salutations, formal language.
- **Casual/Friendly** — For teammates, friends. Relaxed language, shorter sentences.
- **Apologetic** — Accept responsibility, offer solution, provide future assurance.
- **Urgent** — Convey urgency, provide timeline, assure quick action.
- **Follow-up** — Reference previous discussion, provide updates, clarify next steps.
- **Declining politely** — Express gratitude, state reason, suggest alternatives.

### DISPLAY RULES:
After a tool executes successfully, provide a brief, friendly confirmation to the user. For emails, mention:
- Who it was sent to
- A brief summary of what was written
- The subject line used

For email reads/searches, present results in a clean, readable format:
- Show sender, subject, date, and a brief snippet
- Highlight unread emails
- Note if there are attachments
- For threads, show message count and participants

Do NOT dump raw JSON or technical details to the user.

### GOOGLE DRIVE RULES:
When working with Google Drive:
1. **drive_search_files** — Search by name, content, or type. The query uses Drive search syntax:
   - Name search: \`name contains 'report'\`
   - Full text: \`fullText contains 'budget'\`
   - Type filter: \`mimeType='application/vnd.google-apps.document'\`
   - Combine: \`name contains 'Q4' and mimeType='application/vnd.google-apps.spreadsheet'\`
   - Common types: document, spreadsheet, presentation, folder, pdf
2. **drive_list_recent_files** — Shows recently viewed/modified files. Good for "show my recent files" or "what was I working on"
3. **drive_read_file_content** — Reads Google Docs/Sheets/Slides content as text. Use fileId from search results. For Sheets, use mimeType='text/csv' to get data.
4. **drive_download_file_content** — Downloads non-Google files (uploaded PDFs, text files, etc.)
5. **drive_get_file_metadata** — Gets file details (size, owner, modified date, sharing). Use when user asks "who owns this file" or "when was it modified"
6. **drive_get_file_permissions** — Shows who has access. Use when user asks "who can see this file" or "is this shared"
7. **drive_create_file** — Creates new Google Docs or Sheets. Use mimeType:
   - Google Doc: \`application/vnd.google-apps.document\` (content as HTML)
   - Google Sheet: \`application/vnd.google-apps.spreadsheet\` (content as CSV)
   - Plain text: \`text/plain\`

### CRITICAL — DRIVE TOOL SEQUENCING:
- **NEVER call drive_read_file_content or drive_download_file_content without a REAL fileId.**
- If you need to find a file AND read/download it, call ONLY drive_search_files first. Then in your response, tell the user you found the file and show the results. The user can then ask you to read/download it, and you'll have the real fileId.
- **DO NOT call two Drive tools in the same response if the second depends on the first's result.**
- **NEVER fabricate or guess a fileId.** Only use IDs returned from drive_search_files or drive_list_recent_files.

### DRIVE WORKFLOW:
- "Find my budget spreadsheet" → Call ONLY drive_search_files. Show results with file names and IDs.
- "Read that file" (after search) → Now call drive_read_file_content with the real fileId from previous results.
- "Show my recent docs" → drive_list_recent_files
- "Create a new doc with meeting notes" → drive_create_file with name, content (HTML), mimeType=document
- "Who has access to this file?" → drive_get_file_permissions with fileId
- "Find and download viral story 1" → Call ONLY drive_search_files first. Then tell user you found it and provide the download link (webViewLink). Do NOT try to download it in the same turn.

### SLACK RULES:
When working with Slack:
1. **slack_send_message** — Send to any channel (#general), private channel, or DM. Use chat:write.public to send to channels the bot isn't in. Supports Slack mrkdwn: *bold*, _italic_, \`code\`, >quote. Use thread_ts to reply in a thread.
2. **slack_search_messages** — Full-text search across all channels/DMs. Supports: from:@user, in:#channel, has:link, has:reaction, before:2024-01-01, after:2024-01-01, during:today/week/month
3. **slack_search_files** — Search shared files. Supports: type:pdf, type:image, from:@user, in:#channel
4. **slack_search_users** — Find users by name.
5. **slack_search_channels** — Find channels by name or topic. Returns channel IDs needed for other tools.
6. **slack_read_channel** — Read recent messages from a channel/DM. Needs channel ID (get from slack_search_channels first).
7. **slack_read_thread** — Read thread replies. Needs channel ID + thread_ts (get from slack_read_channel).
8. **slack_read_user_profile** — Get user details (name, title, status, timezone). Needs user ID.
9. **slack_join_channel** — Join a public channel so the bot can post there.
10. **slack_open_dm** — Open a DM conversation with a user. Returns the DM channel ID needed for sending DMs.
11. **slack_list_members** — List all members of a channel.
12. **slack_set_topic** — Set or update a channel's topic.
13. **slack_add_reaction** — Add an emoji reaction to a message (e.g., thumbsup, heart, fire).
14. **slack_get_permalink** — Get a shareable link to a specific message.

### SLACK DM WORKFLOW (IMPORTANT):
To send a Direct Message to a user:
1. First call \`slack_search_users\` to find the user and get their user ID
2. Then call \`slack_open_dm\` with the user ID — this returns the DM channel ID
3. Then call \`slack_send_message\` with channel = DM channel ID and your message text
The system handles this multi-step flow automatically — just call slack_search_users and the follow-up will complete the send.

### SLACK REPLY WORKFLOW:
To reply to a message in a thread:
1. Call \`slack_read_channel\` to see recent messages and find the message timestamp (ts)
2. Call \`slack_send_message\` with channel ID + thread_ts = the message's ts value

### SLACK CHANNEL WORKFLOW:
- "What channels do we have?" → slack_search_channels
- "Join #marketing" → First slack_search_channels to get ID, then slack_join_channel
- "Who is in #dev?" → First slack_search_channels to get ID, then slack_list_members
- "Set topic for #general" → slack_set_topic with channel ID and topic text

### SLACK SEARCH WORKFLOW:
- "Find messages about the project" → slack_search_messages with query="project"
- "Find messages from John about budget" → slack_search_messages with query="from:@john budget"
- "Find PDF files shared recently" → slack_search_files with query="type:pdf"
- "What did John say yesterday?" → slack_search_messages with query="from:@john during:yesterday"

### SLACK MESSAGE FORMATTING:
When composing Slack messages, use mrkdwn formatting:
- *bold* for emphasis
- _italic_ for subtle emphasis
- \`code\` for inline code
- \`\`\`code block\`\`\` for multi-line code
- > for blockquotes
- • for bullet points (use the bullet character)
- <url|display text> for links
- :emoji_name: for emojis (e.g., :wave:, :thumbsup:, :fire:)

### NOTION RULES:
When working with Notion:
1. **notion_search** — Search pages and databases by title/content. Use filter="page" or filter="database" to narrow results.
2. **notion_fetch** — Read the full content of a page (all blocks). Needs page ID from search.
3. **notion_create_page** — Create a new page with markdown content. Content is auto-converted to Notion blocks (headings, lists, code, quotes, todos, callouts).
4. **notion_update_page** — Update title, icon, archive/unarchive, OR update any database property (Status, Priority, etc.). For database properties, use the "properties" parameter with JSON like: {"Status":{"select":{"name":"In Process"}}}
5. **notion_move_page** — Move a page to a different parent.
6. **notion_duplicate_page** — Create a full copy of a page (fetches original content and duplicates it).
7. **notion_create_database** — Create a table/database with custom columns. Properties format: {"Name":{"title":{}},"Status":{"select":{"options":[{"name":"Todo"},{"name":"Done"}]}},"Due":{"date":{}}}
8. **notion_update_database** — Update database title, description, or columns.
9. **notion_create_comment** — Add a comment to a page.
10. **notion_get_comments** — Read all comments on a page.
11. **notion_get_users** — List all workspace members.
12. **notion_get_self** — Get the bot's own user info.
13. **notion_get_user** — Get details about a specific user.
14. **notion_append_blocks** — Append new content to an existing page without replacing existing content. Content is markdown.
15. **notion_delete_block** — Delete a specific block from a page. Get block IDs from notion_fetch.
16. **notion_query_database** — Query a database with filters and sorts. Filter format: {"property":"Status","select":{"equals":"Done"}}. Sorts format: [{"property":"Created","direction":"descending"}]
17. **notion_get_page** — Get page metadata/properties without content blocks (title, icon, parent, timestamps).
18. **notion_get_database** — Get database schema (title, description, property definitions).
19. **notion_add_database_entry** — Add a new entry/row to a database (new task, project, meeting, etc.). Needs databaseId, title, and optional properties JSON.

### NOTION WORKFLOW:
**CRITICAL SEARCH RULE**: When user mentions a parent workspace/section like "Team HQ", "Projects", "Tasks", etc., ALWAYS search for the ACTUAL ITEM NAME, not the parent name.
- "Team HQ ke andar all app testing" → search query="all app testing" (NOT "Team HQ")
- "Projects mein Website Redesign" → search query="Website Redesign" (NOT "Projects")
- "Tasks mein Publish" → search query="Publish" (NOT "Tasks")
- The parent name is just context — search for the specific page/task/item name.

- "Find my meeting notes" → notion_search with query="meeting notes"
- "Read that page" → notion_fetch with pageId from search results
- "Create a new page about project plan" → notion_create_page with title and markdown content
- "Add more content to that page" → notion_append_blocks with pageId and markdown content
- "Archive that page" → notion_update_page with archived=true
- "Change status to In Process" → notion_update_page with pageId and properties={"Status":{"status":{"name":"In Process"}}}
- "Set priority to High" → notion_update_page with pageId and properties={"Priority":{"select":{"name":"High"}}}
- "Mark as done" → notion_update_page with pageId and properties={"Status":{"status":{"name":"Done"}}}
- "Create a task database" → notion_create_database with properties for Name, Status, Priority, Due Date
- "Show me all done tasks" → notion_query_database with filter={"property":"Status","select":{"equals":"Done"}}
- "Add a comment" → notion_create_comment with pageId and text
- "Who's in the workspace?" → notion_get_users
- "Copy that page" → notion_duplicate_page with pageId
- "Delete that paragraph" → notion_delete_block with blockId (from notion_fetch results)
- "What columns does this database have?" → notion_get_database with databaseId
- "Add a new task called 'Fix bugs'" → First notion_search with filter="database" to find Tasks database, then notion_add_database_entry with databaseId, title, and properties
- "Add new project 'Mobile App'" → notion_add_database_entry with databaseId and title="Mobile App"

### NOTION PROPERTY UPDATE FORMAT:
IMPORTANT: Notion has TWO different property types for status-like fields:
- **"status" type** (most common for Status fields): {"Status": {"status": {"name": "In Process"}}}
- **"select" type** (for dropdown selects like Stage, Priority): {"Stage": {"select": {"name": "Complete"}}}

The system will automatically try both formats if one fails. So either works:
- {"Status": {"status": {"name": "In Process"}}}
- {"Status": {"select": {"name": "In Process"}}}

ALWAYS prefer "status" type for fields named "Status". Use "select" for other dropdowns.

Other property formats:
- Multi-select: {"Tags": {"multi_select": [{"name": "Tag1"}, {"name": "Tag2"}]}}
- Checkbox: {"Done": {"checkbox": true}}
- Number: {"Score": {"number": 85}}
- Date: {"Due": {"date": {"start": "2025-01-15"}}}
- URL: {"Link": {"url": "https://example.com"}}
- Email: {"Contact": {"email": "test@example.com"}}
- Rich text: {"Notes": {"rich_text": [{"text": {"content": "Some text"}}]}}
- People/Assignee: {"Assignee": {"people": [{"id": "user-id-here"}]}}

IMPORTANT: The property name must EXACTLY match the column name in the Notion database (case-sensitive).

### NOTION CONTENT FORMAT:
When creating or appending content, write in markdown. The system converts it to Notion blocks:
- # Heading 1, ## Heading 2, ### Heading 3
- - Bullet points, * Bullet points
- 1. Numbered lists
- > Blockquotes
- \`\`\`code blocks\`\`\`
- - [ ] Todo items, - [x] Completed items
- --- Dividers
- **bold**, *italic*, ~~strikethrough~~, \`inline code\`
- [link text](url)
- 💡 Emoji at start creates a callout block
- >> Toggle text (creates collapsible toggle)

### GOOGLE CALENDAR RULES:
When working with Google Calendar:
1. **calendar_list_events** — List upcoming events. Defaults to next 7 days from now. Use timeMin/timeMax for specific ranges. Use \`q\` param for keyword search (e.g., "standup", "1:1").
2. **calendar_get_event** — Get full details of a specific event (attendees, description, meet link, etc.). Needs eventId from calendar_list_events.
3. **calendar_create_event** — Create a new event. Requires summary, startTime, endTime (ISO 8601 format). Set conferenceData=true to auto-create a Google Meet link. Add attendees as email array.
4. **calendar_update_event** — Update an existing event (change time, title, add attendees, etc.). Only include fields you want to change. Needs eventId.
5. **calendar_delete_event** — Delete/cancel an event. Sends cancellation notifications to attendees by default.
6. **calendar_find_free_time** — Check free/busy status for one or more people. Pass email addresses in items array. Returns busy time blocks — free time is everything NOT in the busy blocks.
7. **calendar_list_calendars** — List all calendars the user has access to (personal, shared, subscribed). Returns calendar IDs needed for other tools.
8. **calendar_respond_to_event** — Accept, decline, or tentatively accept an event invitation. Response values: "accepted", "declined", "tentative".

### CALENDAR TIME FORMAT:
- Always use ISO 8601 format: \`2025-06-15T10:00:00-05:00\` (with timezone offset) or \`2025-06-15T15:00:00Z\` (UTC)
- For all-day events, use date format: \`2025-06-15\` (no time component)
- When user says "tomorrow at 3pm", calculate the correct ISO timestamp based on context
- Default event duration is 1 hour if end time is not specified

### CALENDAR WORKFLOW:
- "What's on my calendar today?" → calendar_list_events with timeMin=today start, timeMax=today end
- "Show my meetings this week" → calendar_list_events with timeMin=now, timeMax=end of week
- "Schedule a meeting with john@example.com tomorrow at 2pm" → calendar_create_event with attendees
- "Cancel my 3pm meeting" → First calendar_list_events to find the event, then calendar_delete_event with eventId
- "Move my standup to 10am" → First calendar_list_events with q="standup", then calendar_update_event
- "Am I free Friday afternoon?" → calendar_find_free_time with timeMin/timeMax for Friday 12pm-6pm
- "When are John and I both free?" → calendar_find_free_time with items=["primary", "john@example.com"]
- "Accept the team dinner invite" → First calendar_list_events with q="team dinner", then calendar_respond_to_event with response="accepted"
- "Add a Google Meet link to my meeting" → calendar_update_event (or use conferenceData=true when creating)
- "Set up a weekly 1:1 with Sarah" → calendar_create_event with recurrence=["RRULE:FREQ=WEEKLY"] and attendees
- "Which calendars do I have?" → calendar_list_calendars

### CALENDAR DISPLAY RULES:
After listing events, format them clearly:
- Show date, time range, title, and location (if any)
- Indicate if there's a Google Meet link
- Show attendee count for meetings
- Group events by day when showing multiple days
- For free/busy results, calculate and show the FREE slots (not just busy ones)

### CRITICAL — CALENDAR TOOL SEQUENCING:
- **NEVER call calendar_update_event, calendar_delete_event, or calendar_respond_to_event without a REAL eventId.**
- If you need to find an event first, call calendar_list_events. Then use the eventId from the results.
- **DO NOT fabricate event IDs.** Only use IDs returned from calendar_list_events or calendar_get_event.

### MICROSOFT 365 RULES:
When working with Microsoft 365 (SharePoint, OneDrive, Outlook, Teams):

**IMPORTANT:** Microsoft 365 is READ-ONLY. You can search, read, and analyze — but CANNOT create, edit, delete, or send anything. The only exception is ms365_send_email.

1. **sharepoint_search** — Search documents across ALL SharePoint sites and libraries. Supports Word, Excel, PowerPoint, PDF, OneNote. Searches file names, content, metadata, and tags.
   - Use for: "Find Q2 budget spreadsheet", "Marketing presentations from April", "Documents about Project X"
   - The query parameter searches across file names AND content inside files.

2. **sharepoint_folder_search** — Browse files within a SPECIFIC SharePoint site/folder. Requires siteId.
   - Use for: "Show files in HR folder", "What's in the Finance > Reports folder?"
   - First use sharepoint_search to find the site, then use this to browse within it.

3. **outlook_email_search** — Search Outlook emails by sender, subject, content, date, attachments, folder.
   - Use for: "Emails from boss about budget", "Unread emails with attachments", "Invoice emails from last month"
   - Supports: query (keyword), folder (inbox/sentitems/drafts), from (sender email), hasAttachments (boolean)
   - Results include: subject, sender, date, body preview, attachment status

4. **outlook_calendar_search** — Search calendar events by date range, subject, attendees.
   - Use for: "Today's meetings", "Next week's client meetings", "Meetings with Sarah"
   - Supports: query (subject search), startDate/endDate (ISO 8601), maxResults
   - Results include: subject, start/end time, location, organizer, attendees, online meeting link

5. **find_meeting_availability** — Find common free time slots for multiple people.
   - Use for: "When are John and Sarah both free this week?", "Find 1-hour slot tomorrow for team meeting"
   - Requires: attendees (comma-separated emails), startDate, endDate
   - Optional: duration (minutes, default 30)
   - Returns suggested available time slots

6. **chat_message_search** — Search Teams chat and channel messages.
   - Use for: "Messages about project deadline in Teams", "What did marketing team discuss about campaign?"
   - Supports: query (keyword), chatId (specific chat), from (sender), maxResults

7. **ms365_read_resource** — Read FULL content of a specific item by ID. Use AFTER searching.
   - resourceType options: "file", "email", "event", "chat"
   - Use for: "Read that email fully", "Show me the complete document", "Get meeting details"
   - ALWAYS get the resourceId from a previous search result first.

8. **ms365_send_email** — Send email via Outlook (ONLY write action available).
   - Requires: to, subject, body (supports HTML)
   - Optional: cc, importance (low/normal/high)

### MICROSOFT 365 WORKFLOWS:

**Morning Briefing:**
- "Show today's meetings" → outlook_calendar_search
- "Important unread emails" → outlook_email_search with query and folder="inbox"
- "Pending action items from Teams" → chat_message_search

**Document Discovery:**
- "Find sales report" → sharepoint_search
- "Read that document" → ms365_read_resource with resourceId from search

**Meeting Scheduling:**
- "When is everyone free?" → find_meeting_availability with attendee emails
- "Check my calendar for conflicts" → outlook_calendar_search with date range

**Cross-Platform Research:**
- "Everything about Project X" → Use sharepoint_search + outlook_email_search + chat_message_search together
- Combine results to give comprehensive overview

### MICROSOFT 365 DISPLAY RULES:
- For emails: Show sender, subject, date, and preview. Indicate if has attachments.
- For calendar: Show date, time, title, location, and attendee count.
- For documents: Show file name, type, last modified, and location (site/folder).
- For Teams messages: Show sender, channel/chat name, date, and message preview.
- For availability: Show available time slots clearly with date and time range.

### CRITICAL — MICROSOFT 365 SEQUENCING:
- **NEVER call ms365_read_resource without a REAL resourceId from a previous search.**
- **DO NOT fabricate IDs.** Only use IDs returned from search results.
- For multi-step tasks: Search first → then read/analyze specific items.
- sharepoint_folder_search requires a siteId — get it from sharepoint_search first if unknown.

### FIGMA RULES:
When working with Figma:
1. **figma_get_file** — Get a Figma file's full structure (pages, frames, components). Requires the file key from the Figma URL.
2. **figma_get_nodes** — Get specific nodes by their IDs from a file.
3. **figma_get_images** — Render nodes as images (PNG, JPG, SVG, PDF).
4. **figma_get_styles** — Get all published styles (colors, text, effects).
5. **figma_get_variables** — Get local variables and collections (Enterprise only).
6. **figma_get_team_projects** — List all projects for a team.
7. **figma_get_user_info** — Get the authenticated user's profile.
8. **figma_convert_to_code** — Convert a design node to React/Tailwind code.
9. **figma_extract_design_system** — Extract the full design system (colors, typography, spacing).
- **NEVER call any Figma tool without a REAL file key from the user.**
- A Figma file key is an alphanumeric string (like "ABC123xyz") extracted from a Figma URL: https://www.figma.com/design/ABC123xyz/My-File
- If the user provides a project NAME (like "PMS", "Dashboard", "My App") but NOT a URL or file key:
  - **DO NOT call any Figma tool.** Instead, ask the user to provide their Figma file URL.
  - Say something like: "I can analyze your Figma file! Please share the file URL from Figma (e.g., https://www.figma.com/design/ABC123/Your-File). You can copy it from your browser's address bar when the file is open."
- **DO NOT use placeholder values** like "your_figma_file_id", "[PMS]", "file_key_here", or any made-up string.
- **DO NOT call figma_get_file, figma_get_nodes, or any Figma tool** until you have a valid file key or URL from the user.
- A valid file key is 10+ alphanumeric characters. If what you have doesn't match this, ask for the URL.

### FIGMA WORKFLOW:
- User says "Analyze my Figma file for PMS" → **DO NOT call any tool.** Ask for the Figma file URL.
- User provides URL "https://www.figma.com/design/xYz123abc/PMS" → Extract key "xYz123abc", call figma_get_file with fileKey="xYz123abc"
- User provides just the key "xYz123abc" → Call figma_get_file with fileKey="xYz123abc"
- "Extract design system" → Ask for URL if not already provided, then call figma_extract_design_system
- "Convert this component to code" → Need both fileKey AND nodeId. Ask for URL first, then use figma_get_file to find nodes.

### FIGMA DISPLAY RULES:
- Show file structure as a tree (pages → frames → components)
- For design systems, present colors as swatches, typography as a scale
- For code conversion, show the generated React component in a code block
- Always mention the file name and last modified date

### General Rules:
- Only call tools when the user's request clearly requires it
- **You CAN call multiple tools in one response** when the user's intent is clear and you have all the data needed. For example: if user says "send a message to #general", just call slack_send_message directly.
- **For multi-step workflows** (search → then act): Call the search/lookup tool first. The system will automatically follow up with the action tool using the results.
- **IMPORTANT FOR NOTION**: When the user asks to update/edit/change/add/delete something in Notion and you don't have the page ID yet, call notion_search first. The system will AUTOMATICALLY execute the update action after getting the search results. You do NOT need to call both tools yourself.
- If a tool requires confirmation (sending emails, creating files, making purchases), tell the user what you're about to do and include the tool call
- After a tool executes, incorporate the result naturally into your response
- If a tool is not available for what the user needs, suggest they connect the relevant app
- Always explain what you did after a tool call completes
- **NEVER fabricate IDs, tokens, or identifiers.** Only use values returned from previous tool calls.
- **For Slack DMs**: If user says "send DM to [person]", call slack_search_users first to get their user ID. The system will automatically send the message in a follow-up step.
`;
}

/**
 * Parse tool calls from AI response text
 * Looks for ```tool_call JSON blocks in the response
 * @param {string} aiResponse - Raw AI response text
 * @returns {{ hasToolCalls: boolean, toolCalls: Array, cleanResponse: string }}
 */
export function parseToolCalls(aiResponse) {
  if (!aiResponse) return { hasToolCalls: false, toolCalls: [], cleanResponse: '' };

  const toolCalls = [];
  let match;

  const addToolCall = (parsed, rawBlock) => {
    if (parsed.tool && parsed.parameters && typeof parsed.tool === 'string') {
      const toolId = parsed.tool.trim();
      if (!toolId) return; // Skip empty tool names
      // Avoid duplicates
      if (!toolCalls.some(tc => tc.toolId === toolId && JSON.stringify(tc.parameters) === JSON.stringify(parsed.parameters))) {
        toolCalls.push({ toolId, parameters: parsed.parameters, rawBlock });
      }
    }
  };

  // Pattern 1: ```tool_call ... ``` or ```TOOL_CALL ... ``` blocks (case-insensitive)
  const backtickRegex = /```\s*(?:tool_call|TOOL_CALL|Tool_Call)\s*\n?([\s\S]*?)\n?```/g;
  while ((match = backtickRegex.exec(aiResponse)) !== null) {
    try { addToolCall(JSON.parse(match[1].trim()), match[0]); } catch { /* skip */ }
  }

  // Pattern 2: tool_call / TOOL_CALL on its own line followed by JSON (no backticks)
  const plainRegex = /(?:^|\n)\s*(?:tool_call|TOOL_CALL|Tool_Call)\s*\n\s*(\{[\s\S]*?\})\s*(?:\n|$)/gi;
  while ((match = plainRegex.exec(aiResponse)) !== null) {
    try { addToolCall(JSON.parse(match[1].trim()), match[0]); } catch { /* skip */ }
  }

  // Pattern 3: Any JSON object with "tool" and "parameters" keys anywhere in the text
  // Use a more robust approach: find all JSON-like objects
  const jsonBlockRegex = /\{[^{}]*"tool"\s*:\s*"[^"]+?"[^{}]*"parameters"\s*:\s*\{[\s\S]*?\}\s*\}/g;
  while ((match = jsonBlockRegex.exec(aiResponse)) !== null) {
    try { addToolCall(JSON.parse(match[0]), match[0]); } catch { /* skip */ }
  }

  // Pattern 4: JSON inside a generic code block (```\n{...}\n```) that contains tool+parameters
  const genericCodeBlockRegex = /```(?:\w*)\s*\n(\{[\s\S]*?"tool"[\s\S]*?"parameters"[\s\S]*?\})\s*\n?```/g;
  while ((match = genericCodeBlockRegex.exec(aiResponse)) !== null) {
    try { addToolCall(JSON.parse(match[1].trim()), match[0]); } catch { /* skip */ }
  }

  // Pattern 4b: Truncated/incomplete JSON tool calls — AI ran out of tokens mid-JSON
  // e.g., {"tool": "notion_update_page", "parameters": {"pageId": "abc-123", "properties": "{\"Status\":{\"status\":{\"name\":\"In Pro
  // Try to detect and repair these
  const truncatedJsonRegex = /\{\s*"tool"\s*:\s*"([a-z_]+)"\s*,\s*"parameters"\s*:\s*\{([^}]*?)$/gm;
  let truncMatch;
  while ((truncMatch = truncatedJsonRegex.exec(aiResponse)) !== null) {
    const toolName = truncMatch[1];
    const partialParams = truncMatch[2];
    
    // Try to extract whatever params we can from the partial JSON
    const params = {};
    // Match complete key-value pairs: "key": "value" or "key": true/false/number
    const kvRegex = /"(\w+)"\s*:\s*(?:"([^"]*?)"|(\d+(?:\.\d+)?)|(\btrue\b|\bfalse\b))/g;
    let kv;
    while ((kv = kvRegex.exec(partialParams)) !== null) {
      const key = kv[1];
      if (kv[2] !== undefined) params[key] = kv[2];
      else if (kv[3] !== undefined) params[key] = Number(kv[3]);
      else if (kv[4] !== undefined) params[key] = kv[4] === 'true';
    }
    
    if (toolName && Object.keys(params).length > 0) {
      addToolCall({ tool: toolName, parameters: params }, truncMatch[0]);
    }
  }

  // Pattern 5: Python/function-call style — e.g., notion_search(query="test", filter="page")
  // or print(notion_search(query="test")) — AI sometimes generates code instead of JSON
  const KNOWN_TOOLS = [
    // Notion
    'notion_search', 'notion_create_page', 'notion_update_page',
    'notion_fetch', 'notion_get_page', 'notion_append_blocks',
    'notion_delete_block', 'notion_create_database', 'notion_query_database',
    'notion_add_database_entry', 'notion_duplicate_page', 'notion_move_page',
    'notion_create_comment', 'notion_get_comments', 'notion_get_users',
    'notion_get_self', 'notion_get_user', 'notion_update_database',
    'notion_get_database',
    // Gmail
    'gmail_send_email', 'gmail_reply_email', 'gmail_read_emails',
    'gmail_get_thread', 'gmail_search_threads', 'gmail_create_draft',
    'gmail_list_drafts', 'gmail_list_labels',
    // Slack
    'slack_send_message', 'slack_search_messages', 'slack_search_files',
    'slack_search_users', 'slack_search_channels', 'slack_read_channel',
    'slack_read_thread', 'slack_read_user_profile', 'slack_join_channel',
    'slack_open_dm', 'slack_list_members', 'slack_set_topic',
    'slack_add_reaction', 'slack_get_permalink',
    // Drive
    'drive_search_files', 'drive_list_recent_files', 'drive_read_file_content',
    'drive_download_file_content', 'drive_get_file_metadata',
    'drive_get_file_permissions', 'drive_create_file',
    // Calendar
    'calendar_create_event', 'calendar_list_events', 'calendar_get_event',
    'calendar_update_event', 'calendar_delete_event', 'calendar_find_free_time',
    'calendar_list_calendars', 'calendar_respond_to_event',
    // Microsoft 365
    'sharepoint_search', 'sharepoint_folder_search', 'outlook_email_search',
    'outlook_calendar_search', 'find_meeting_availability', 'chat_message_search',
    'ms365_read_resource', 'ms365_send_email',
  ];

  const toolNamesPattern = KNOWN_TOOLS.join('|');
  const pythonCallRegex = new RegExp(
    `(?:print\\s*\\(\\s*)?(${toolNamesPattern})\\s*\\(([^)]*(?:\\{[^}]*\\}[^)]*)*)\\)`,
    'g'
  );

  let pythonMatch;
  while ((pythonMatch = pythonCallRegex.exec(aiResponse)) !== null) {
    const toolName = pythonMatch[1];
    const argsString = pythonMatch[2];

    // Parse keyword arguments: key="value", key='value', key=true, key={...}, key=[...]
    const params = {};
    const kwargRegex = /(\w+)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|true|false|null|\d+(?:\.\d+)?|\{[^}]*\}|\[[^\]]*\])/g;
    let kwarg;

    while ((kwarg = kwargRegex.exec(argsString)) !== null) {
      const key = kwarg[1];
      let value = kwarg[2];

      // Parse value based on type
      try {
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          // String — strip quotes and unescape
          value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
        } else if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else if (value === 'null') {
          value = null;
        } else if (!isNaN(value)) {
          value = Number(value);
        } else {
          // Object or array — try JSON parse
          value = JSON.parse(value);
        }
      } catch {
        // Keep as string if parse fails
        value = String(value);
      }

      params[key] = value;
    }

    if (toolName && Object.keys(params).length > 0) {
      addToolCall({ tool: toolName, parameters: params }, pythonMatch[0]);
    } else if (toolName && argsString.trim()) {
      // Fallback: if kwarg parsing failed but there ARE args, try to parse as a single query string
      // e.g., notion_search("all app testing") — positional arg becomes "query"
      const singleArgMatch = argsString.match(/^["']([^"']+)["']$/);
      if (singleArgMatch) {
        addToolCall({ tool: toolName, parameters: { query: singleArgMatch[1] } }, pythonMatch[0]);
      }
    }
  }

  // Remove all detected tool_call blocks from the response text
  let cleanResponse = aiResponse;
  for (const tc of toolCalls) {
    if (tc.rawBlock) {
      cleanResponse = cleanResponse.replace(tc.rawBlock, '');
    }
  }
  // Clean up any remaining tool_call labels (case-insensitive)
  cleanResponse = cleanResponse.replace(/(?:^|\n)\s*(?:tool_call|TOOL_CALL|Tool_Call)\s*(?:\n|$)/gi, '\n').trim();

  return {
    hasToolCalls: toolCalls.length > 0,
    toolCalls,
    cleanResponse,
  };
}

/**
 * Execute all tool calls and return results
 * @param {string} userId
 * @param {Array} toolCalls - Parsed tool calls
 * @param {Array} connectedApps - User's connected apps
 * @returns {Array} Results for each tool call
 */
export async function executeToolCalls(userId, toolCalls, connectedApps) {
  const results = [];

  for (const call of toolCalls) {
    // Skip invalid tool calls (undefined toolId)
    if (!call.toolId || typeof call.toolId !== 'string') {
      console.warn('[MCP] Skipping invalid tool call — toolId is undefined or empty:', call);
      continue;
    }

    // Find which app owns this tool
    const appId = findAppForTool(call.toolId, connectedApps);
    if (!appId) {
      results.push({
        toolId: call.toolId,
        status: 'failed',
        error: `Tool "${call.toolId}" not found in connected apps`,
      });
      continue;
    }

    // Execute the tool
    const result = await execute(userId, appId, call.toolId, call.parameters, { confirmed: true });
    results.push({
      toolId: call.toolId,
      appId,
      parameters: call.parameters, // Store parameters for display (email body, etc.)
      ...result,
    });
  }

  return results;
}

/**
 * Find which app a tool belongs to
 */
function findAppForTool(toolId, connectedApps) {
  for (const conn of connectedApps) {
    const app = getAppById(conn.appId);
    if (app?.tools?.some(t => t.id === toolId)) {
      return conn.appId;
    }
  }
  return null;
}

/**
 * Get emoji icon for a Google Drive file based on MIME type
 */
function getDriveFileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.includes('folder')) return '📁';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎬';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return '📦';
  if (mimeType.includes('text') || mimeType.includes('plain')) return '📄';
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html') || mimeType.includes('css')) return '💻';
  return '📄';
}

/**
 * Format tool execution results for the AI to incorporate into its response
 * @param {Array} results - Tool execution results
 * @returns {string} Formatted results text
 */
export function formatToolResults(results) {
  if (!results || results.length === 0) return '';

  return results.map(r => {
    const app = getAppById(r.appId);
    const appName = app?.name || r.appId;

    if (r.status === 'success') {
      // Special formatting for email sends
      if (r.toolId === 'gmail_send_email' && r.parameters) {
        const to = r.parameters.to || 'recipient';
        const subject = r.parameters.subject || 'No subject';
        const body = r.parameters.body || '';
        const plainBody = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        const bodySummary = plainBody.length > 300 ? plainBody.slice(0, 300) + '...' : plainBody;
        return `✅ **Email Sent Successfully**\n\n📧 **To:** ${to}\n📋 **Subject:** ${subject}\n\n---\n\n**Email Content:**\n\n${bodySummary}`;
      }

      // Special formatting for email replies
      if (r.toolId === 'gmail_reply_email' && r.parameters) {
        const to = r.parameters.to || 'recipient';
        const subject = r.parameters.subject || 'No subject';
        const body = r.parameters.body || '';
        const plainBody = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        const bodySummary = plainBody.length > 300 ? plainBody.slice(0, 300) + '...' : plainBody;
        return `✅ **Reply Sent Successfully**\n\n↩️ **To:** ${to}\n📋 **Subject:** ${subject}\n\n---\n\n**Reply Content:**\n\n${bodySummary}`;
      }

      // Special formatting for draft creation
      if (r.toolId === 'gmail_create_draft' && r.parameters) {
        const to = r.parameters.to || 'recipient';
        const subject = r.parameters.subject || 'No subject';
        return `✅ **Draft Saved**\n\n📝 **To:** ${to}\n📋 **Subject:** ${subject}\n\nDraft has been saved. You can find it in your Gmail Drafts folder.`;
      }

      // Special formatting for email reads
      if (r.toolId === 'gmail_read_emails' || r.toolId === 'gmail_search_threads') {
        const messages = r.result?.messages || r.result?.threads || r.result;
        if (Array.isArray(messages) && messages.length > 0) {
          const summaries = messages.slice(0, 5).map((msg, i) => {
            const from = msg.from || msg.sender || 'Unknown';
            const subject = msg.subject || 'No subject';
            const snippet = msg.snippet || msg.body?.slice(0, 100) || '';
            return `${i + 1}. **From:** ${from}\n   **Subject:** ${subject}\n   ${snippet}`;
          }).join('\n\n');
          return `✅ **Emails Retrieved**\n\n${summaries}`;
        }
      }

      // Special formatting for thread retrieval
      if (r.toolId === 'gmail_get_thread') {
        const messages = r.result?.messages || [];
        if (Array.isArray(messages) && messages.length > 0) {
          const threadSummary = messages.slice(0, 10).map((msg, i) => {
            const from = msg.from || msg.payload?.headers?.find(h => h.name === 'From')?.value || 'Unknown';
            const snippet = msg.snippet || '';
            return `${i + 1}. **${from}:** ${snippet.slice(0, 150)}`;
          }).join('\n');
          return `✅ **Thread Retrieved** (${messages.length} messages)\n\n${threadSummary}`;
        }
      }

      // Special formatting for labels
      if (r.toolId === 'gmail_list_labels') {
        const labels = r.result?.labels || r.result;
        if (Array.isArray(labels)) {
          const labelList = labels.map(l => `• ${l.name || l.id}`).join('\n');
          return `✅ **Labels**\n\n${labelList}`;
        }
      }

      // Special formatting for drafts list
      if (r.toolId === 'gmail_list_drafts') {
        const drafts = r.result?.drafts || r.result;
        if (Array.isArray(drafts) && drafts.length > 0) {
          const draftList = drafts.slice(0, 10).map((d, i) => {
            const subject = d.message?.subject || d.subject || 'No subject';
            return `${i + 1}. 📝 ${subject}`;
          }).join('\n');
          return `✅ **Drafts** (${drafts.length} total)\n\n${draftList}`;
        }
        return `✅ **Drafts** — No drafts found.`;
      }

      // ── Google Drive tool results ──────────────────────────────────────
      // Search/List files
      if (r.toolId === 'drive_search_files' || r.toolId === 'drive_list_recent_files') {
        const files = r.result?.files || [];
        if (files.length > 0) {
          const fileList = files.slice(0, 15).map((f, i) => {
            const icon = getDriveFileIcon(f.mimeType);
            const modified = f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : '';
            const link = f.webViewLink || '';
            return `${i + 1}. ${icon} **${f.name}** ${modified ? `(${modified})` : ''}\n   ID: \`${f.id}\`${link ? ` | [Open](${link})` : ''}`;
          }).join('\n');
          return `✅ **Drive Files** (${files.length} found)\n\n${fileList}\n\n<!--DRIVE_FILES:${JSON.stringify(files.slice(0, 15).map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, webViewLink: f.webViewLink || '' })))}-->`;
        }
        return `✅ **Drive Search** — No files found matching your query.`;
      }

      // Read/Download file content
      if (r.toolId === 'drive_read_file_content' || r.toolId === 'drive_download_file_content') {
        const content = r.result?.content || '';
        const preview = content.length > 500 ? content.slice(0, 500) + '...' : content;
        return `✅ **File Content Retrieved**\n\n${preview}`;
      }

      // File metadata
      if (r.toolId === 'drive_get_file_metadata') {
        const f = r.result || {};
        const icon = getDriveFileIcon(f.mimeType);
        const size = f.size ? `${(parseInt(f.size) / 1024).toFixed(1)} KB` : 'N/A';
        const modified = f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : 'Unknown';
        const owner = f.owners?.[0]?.displayName || f.owners?.[0]?.emailAddress || 'Unknown';
        return `✅ **File Info**\n\n${icon} **${f.name || 'Unknown'}**\n📁 Type: ${f.mimeType || 'Unknown'}\n📏 Size: ${size}\n📅 Modified: ${modified}\n👤 Owner: ${owner}\n🔗 ${f.webViewLink || 'No link'}`;
      }

      // File permissions
      if (r.toolId === 'drive_get_file_permissions') {
        const perms = r.result?.permissions || [];
        if (perms.length > 0) {
          const permList = perms.map(p => {
            const who = p.emailAddress || p.displayName || p.type || 'Unknown';
            return `• **${who}** — ${p.role}`;
          }).join('\n');
          return `✅ **File Permissions**\n\n${permList}`;
        }
        return `✅ **Permissions** — No sharing info found.`;
      }

      // Create file
      if (r.toolId === 'drive_create_file') {
        const f = r.result || {};
        return `✅ **File Created**\n\n📄 **${f.name || r.parameters?.name || 'New File'}**\n🔗 ${f.webViewLink || 'File created successfully'}`;
      }

      // ── Canva tool results ─────────────────────────────────────────────
      // Generate design (with image)
      if (r.toolId === 'canva_generate_design' || r.toolId === 'canva_create_design') {
        const data = r.result || {};
        const prompt = r.parameters?.prompt || data.prompt || 'Design';
        const imageUrl = data.imageUrl || data.downloadUrl || data.thumbnailUrl || '';
        const editUrl = data.editUrl || '';
        const designId = data.designId || '';

        let response = `✅ **Canva Design** — ${prompt}\n\n`;
        if (imageUrl) {
          response += `![Canva Design](${imageUrl})\n\n`;
          response += `[Download PNG](${imageUrl})`;
          if (editUrl) response += ` | [Edit in Canva](${editUrl})`;
        } else if (editUrl) {
          response += `🎨 Design created successfully!\n\n[Open in Canva](${editUrl})`;
        } else {
          response += `🎨 Design created. ID: ${designId}`;
        }
        // Hidden data for rich card rendering
        response += `\n\n<!--CANVA_DESIGN:${JSON.stringify({ imageUrl, editUrl, downloadUrl: imageUrl, designId, prompt, _canvaDesign: true })}-->`;
        return response;
      }

      // Export design
      if (r.toolId === 'canva_export_design') {
        const data = r.result || {};
        const downloadUrl = data.downloadUrl || data.downloadUrls?.[0] || '';
        if (data.status === 'completed' && downloadUrl) {
          return `✅ **Canva Export Ready**\n\n[Download Design](${downloadUrl})\n\n⏰ Link expires in 24 hours.`;
        }
        return `✅ **Canva Export** — Status: ${data.status || 'processing'}. Job ID: ${data.jobId || 'N/A'}`;
      }

      // Search designs
      if (r.toolId === 'canva_search_designs' || r.toolId === 'canva_find_designs') {
        const designs = r.result?.designs || [];
        if (designs.length > 0) {
          const list = designs.slice(0, 10).map((d, i) => {
            const name = d.title || d.name || 'Untitled';
            const type = d.design_type || d.type || '';
            const thumb = d.thumbnail?.url || '';
            return `${i + 1}. 🎨 **${name}** ${type ? `(${type})` : ''}${thumb ? `\n   ![](${thumb})` : ''}`;
          }).join('\n');
          return `✅ **Canva Designs** (${designs.length} found)\n\n${list}`;
        }
        return `✅ **Canva Search** — No designs found.`;
      }

      // Get design info
      if (r.toolId === 'canva_get_design') {
        const d = r.result || {};
        return `✅ **Design Info**\n\n🎨 **${d.name || 'Untitled'}**\n📐 Type: ${d.type || 'Unknown'}\n📅 Updated: ${d.updatedAt || 'N/A'}\n📄 Pages: ${d.pageCount || 'N/A'}`;
      }

      // Create folder
      if (r.toolId === 'canva_create_folder') {
        return `✅ **Folder Created** — 📁 ${r.result?.name || r.parameters?.name || 'New Folder'}`;
      }

      // Add comment
      if (r.toolId === 'canva_add_comment_thread_to_design') {
        return `✅ **Comment Added** to design\n\n💬 "${r.parameters?.comment || ''}"`;
      }

      // ── Slack tool results ─────────────────────────────────────────────
      // Send message
      if (r.toolId === 'slack_send_message') {
        const channel = r.parameters?.channel || r.result?.channel || '';
        return `✅ **Message Sent** to ${channel}\n\n💬 ${(r.parameters?.text || '').slice(0, 200)}`;
      }

      // Search messages
      if (r.toolId === 'slack_search_messages') {
        const matches = r.result?.messages?.matches || [];
        if (matches.length > 0) {
          const msgList = matches.slice(0, 8).map((m, i) => {
            const user = m.username || m.user || 'Unknown';
            const channel = m.channel?.name || '';
            const text = (m.text || '').slice(0, 120);
            return `${i + 1}. **${user}** ${channel ? `in #${channel}` : ''}: ${text}`;
          }).join('\n');
          return `✅ **Slack Messages** (${matches.length} found)\n\n${msgList}`;
        }
        return `✅ **Slack Search** — No messages found.`;
      }

      // Search files
      if (r.toolId === 'slack_search_files') {
        const matches = r.result?.files?.matches || [];
        if (matches.length > 0) {
          const fileList = matches.slice(0, 8).map((f, i) => {
            const name = f.name || f.title || 'Untitled';
            const type = f.filetype || '';
            const user = f.username || '';
            return `${i + 1}. 📎 **${name}** (${type}) ${user ? `by ${user}` : ''}`;
          }).join('\n');
          return `✅ **Slack Files** (${matches.length} found)\n\n${fileList}`;
        }
        return `✅ **File Search** — No files found.`;
      }

      // Search users
      if (r.toolId === 'slack_search_users') {
        const members = r.result?.members || [];
        if (members.length > 0) {
          const userList = members.slice(0, 10).map((m, i) => {
            const name = m.real_name || m.name || 'Unknown';
            const title = m.profile?.title || '';
            return `${i + 1}. 👤 **${name}** ${title ? `— ${title}` : ''} (ID: \`${m.id}\`)`;
          }).join('\n');
          return `✅ **Slack Users** (${members.length} found)\n\n${userList}`;
        }
        return `✅ **User Search** — No users found.`;
      }

      // Search/List channels
      if (r.toolId === 'slack_search_channels') {
        const channels = r.result?.channels || [];
        if (channels.length > 0) {
          const chList = channels.slice(0, 15).map((c, i) => {
            const members = c.num_members || 0;
            const purpose = (c.purpose?.value || '').slice(0, 60);
            return `${i + 1}. #**${c.name}** (${members} members)${purpose ? ` — ${purpose}` : ''}\n   ID: \`${c.id}\``;
          }).join('\n');
          return `✅ **Slack Channels** (${channels.length} found)\n\n${chList}`;
        }
        return `✅ **Channel Search** — No channels found.`;
      }

      // Read channel
      if (r.toolId === 'slack_read_channel') {
        const messages = r.result?.messages || [];
        if (messages.length > 0) {
          const msgList = messages.slice(0, 15).map((m, i) => {
            const user = m.user || 'Unknown';
            const text = (m.text || '').slice(0, 150);
            return `${i + 1}. **${user}**: ${text}`;
          }).join('\n');
          return `✅ **Channel Messages** (${messages.length} recent)\n\n${msgList}`;
        }
        return `✅ **Channel** — No messages found.`;
      }

      // Read thread
      if (r.toolId === 'slack_read_thread') {
        const messages = r.result?.messages || [];
        if (messages.length > 0) {
          const msgList = messages.slice(0, 20).map((m, i) => {
            const user = m.user || 'Unknown';
            const text = (m.text || '').slice(0, 150);
            return `${i + 1}. **${user}**: ${text}`;
          }).join('\n');
          return `✅ **Thread** (${messages.length} replies)\n\n${msgList}`;
        }
        return `✅ **Thread** — No replies found.`;
      }

      // Read user profile
      if (r.toolId === 'slack_read_user_profile') {
        const u = r.result?.user || {};
        const name = u.real_name || u.name || 'Unknown';
        const title = u.profile?.title || '';
        const email = u.profile?.email || '';
        const status = u.profile?.status_text || '';
        return `✅ **User Profile**\n\n👤 **${name}**${title ? `\n💼 ${title}` : ''}${email ? `\n📧 ${email}` : ''}${status ? `\n💬 ${status}` : ''}`;
      }

      // Canvas operations
      if (r.toolId === 'slack_create_canvas') {
        return `✅ **Canvas Created**\n\n📋 "${r.parameters?.title || 'Untitled'}" has been created.`;
      }
      if (r.toolId === 'slack_update_canvas') {
        return `✅ **Canvas Updated** successfully.`;
      }
      if (r.toolId === 'slack_read_canvas') {
        const content = r.result?.content || '';
        const preview = content.length > 400 ? content.slice(0, 400) + '...' : content;
        return `✅ **Canvas Content**\n\n${preview}`;
      }

      // Join channel
      if (r.toolId === 'slack_join_channel') {
        const ch = r.result?.channel || {};
        return `✅ **Joined Channel** #${ch.name || parameters?.channel || 'channel'}`;
      }

      // Open DM
      if (r.toolId === 'slack_open_dm') {
        const ch = r.result?.channel || {};
        return `✅ **DM Opened** — Channel ID: \`${ch.id || ''}\``;
      }

      // List members
      if (r.toolId === 'slack_list_members') {
        const members = r.result?.members || [];
        return `✅ **Channel Members** (${members.length} found)\n\nUser IDs: ${members.slice(0, 20).join(', ')}`;
      }

      // Set topic
      if (r.toolId === 'slack_set_topic') {
        return `✅ **Topic Updated** — "${r.parameters?.topic || ''}"`;
      }

      // Add reaction
      if (r.toolId === 'slack_add_reaction') {
        return `✅ **Reaction Added** :${r.parameters?.name || 'emoji'}:`;
      }

      // Get permalink
      if (r.toolId === 'slack_get_permalink') {
        const link = r.result?.permalink || '';
        return `✅ **Message Link**\n\n🔗 ${link}`;
      }

      // ── Notion tool results ────────────────────────────────────────────
      if (r.toolId === 'notion_search') {
        const results = r.result?.results || [];
        if (results.length > 0) {
          const list = results.slice(0, 10).map((item, i) => {
            const title = item.properties?.title?.title?.[0]?.plain_text
              || item.properties?.Name?.title?.[0]?.plain_text
              || Object.values(item.properties || {}).find(p => p.type === 'title')?.title?.[0]?.plain_text
              || 'Untitled';
            const type = item.object || 'page';
            const icon = type === 'database' ? '🗃️' : (item.icon?.emoji || '📄');
            const lastEdited = item.last_edited_time ? ` — edited ${new Date(item.last_edited_time).toLocaleDateString()}` : '';
            const url = item.url || '';
            return `${i + 1}. ${icon} **${title}** (${type})${lastEdited}\n   ID: \`${item.id}\`${url ? `\n   🔗 ${url}` : ''}`;
          }).join('\n');
          const hasMore = r.result?.has_more ? ' (more available)' : '';
          return `✅ **Notion Search** (${results.length} found${hasMore})\n\n${list}`;
        }
        return `✅ **Notion Search** — No results found for "${r.parameters?.query || ''}".`;
      }

      if (r.toolId === 'notion_fetch') {
        const blocks = r.result?.results || [];
        if (blocks.length > 0) {
          const content = blocks.slice(0, 30).map(b => {
            const type = b.type || '';
            // Extract text from various block types
            let text = '';
            const blockData = b[type];
            if (!blockData) return '';

            // Most blocks have rich_text
            if (blockData.rich_text) {
              text = blockData.rich_text.map(rt => rt.plain_text || '').join('');
            } else if (blockData.text) {
              text = blockData.text.map(t => t.plain_text || '').join('');
            } else if (blockData.title) {
              text = blockData.title.map(t => t.plain_text || '').join('');
            } else if (blockData.caption) {
              text = blockData.caption.map(c => c.plain_text || '').join('');
            }

            // Format based on block type
            if (type === 'heading_1') return `# ${text}`;
            if (type === 'heading_2') return `## ${text}`;
            if (type === 'heading_3') return `### ${text}`;
            if (type === 'bulleted_list_item') return `• ${text}`;
            if (type === 'numbered_list_item') return `1. ${text}`;
            if (type === 'to_do') return `${blockData.checked ? '☑' : '☐'} ${text}`;
            if (type === 'quote') return `> ${text}`;
            if (type === 'code') return `\`\`\`${blockData.language || ''}\n${text}\n\`\`\``;
            if (type === 'divider') return '---';
            if (type === 'callout') return `${blockData.icon?.emoji || '💡'} ${text}`;
            if (type === 'toggle') return `▶ ${text}`;
            if (type === 'image') return `🖼️ [Image]${blockData.caption?.length ? ': ' + blockData.caption[0].plain_text : ''}`;
            if (type === 'bookmark') return `🔗 ${blockData.url || ''}`;
            if (type === 'embed') return `📎 ${blockData.url || ''}`;
            return text;
          }).filter(Boolean).join('\n');
          const preview = content.length > 1200 ? content.slice(0, 1200) + '\n\n... (truncated)' : content;
          const blockCount = blocks.length;
          const hasMore = r.result?.has_more ? ' (more blocks available)' : '';
          return `✅ **Page Content** (${blockCount} blocks${hasMore})\n\n${preview}`;
        }
        return `✅ **Page** — Empty page (no content blocks).`;
      }

      if (r.toolId === 'notion_create_page') {
        const url = r.result?.url || '';
        return `✅ **Page Created**\n\n📄 "${r.parameters?.title || 'Untitled'}"\n🔗 ${url || 'Created successfully'}`;
      }

      if (r.toolId === 'notion_update_page') {
        const parts = [];
        if (r.parameters?.title) parts.push(`Title: "${r.parameters.title}"`);
        if (r.parameters?.icon) parts.push(`Icon: ${r.parameters.icon}`);
        if (r.parameters?.archived === true) parts.push('Archived');
        if (r.parameters?.archived === false) parts.push('Unarchived');
        if (r.parameters?.properties) {
          try {
            const props = typeof r.parameters.properties === 'string' ? JSON.parse(r.parameters.properties) : r.parameters.properties;
            for (const [key, val] of Object.entries(props)) {
              if (val?.select?.name) parts.push(`${key}: "${val.select.name}"`);
              else if (val?.status?.name) parts.push(`${key}: "${val.status.name}"`);
              else if (val?.checkbox !== undefined) parts.push(`${key}: ${val.checkbox ? '✅' : '☐'}`);
              else if (val?.number !== undefined) parts.push(`${key}: ${val.number}`);
              else parts.push(`${key}: updated`);
            }
          } catch { parts.push('Properties updated'); }
        }
        const summary = parts.length > 0 ? parts.join(', ') : 'Properties updated';
        return `✅ **Page Updated** — ${summary}`;
      }

      if (r.toolId === 'notion_move_page') {
        return `✅ **Page Moved** to new parent successfully.`;
      }

      if (r.toolId === 'notion_duplicate_page') {
        const url = r.result?.url || '';
        return `✅ **Page Duplicated**\n\n📄 "${r.parameters?.newTitle || 'Copy'}"\n🔗 ${url || 'Created successfully'}`;
      }

      if (r.toolId === 'notion_create_database') {
        const url = r.result?.url || '';
        return `✅ **Database Created**\n\n🗃️ "${r.parameters?.title || 'Untitled'}"\n🔗 ${url || 'Created successfully'}`;
      }

      if (r.toolId === 'notion_update_database') {
        return `✅ **Database Updated** successfully.`;
      }

      if (r.toolId === 'notion_create_comment') {
        return `✅ **Comment Added** to page.`;
      }

      if (r.toolId === 'notion_add_database_entry') {
        const url = r.result?.url || '';
        return `✅ **Entry Added to Database**\n\n📄 "${r.parameters?.title || 'Untitled'}"\n🔗 ${url || 'Created successfully'}`;
      }

      if (r.toolId === 'notion_get_comments') {
        const comments = r.result?.results || [];
        if (comments.length > 0) {
          const list = comments.slice(0, 10).map((c, i) => {
            const text = c.rich_text?.[0]?.plain_text || c.discussion_id || '';
            const author = c.created_by?.name || c.created_by?.id || 'Unknown';
            return `${i + 1}. **${author}**: ${text.slice(0, 100)}`;
          }).join('\n');
          return `✅ **Comments** (${comments.length})\n\n${list}`;
        }
        return `✅ **Comments** — No comments on this page.`;
      }

      if (r.toolId === 'notion_get_users') {
        const users = r.result?.results || [];
        if (users.length > 0) {
          const list = users.slice(0, 15).map((u, i) => {
            return `${i + 1}. 👤 **${u.name || 'Unknown'}** (${u.type || 'person'}) — ID: \`${u.id}\``;
          }).join('\n');
          return `✅ **Notion Users** (${users.length})\n\n${list}`;
        }
        return `✅ **Users** — No users found.`;
      }

      if (r.toolId === 'notion_get_self' || r.toolId === 'notion_get_user') {
        const u = r.result || {};
        return `✅ **User Profile**\n\n👤 **${u.name || 'Unknown'}** (${u.type || 'bot'})\nID: \`${u.id || ''}\``;
      }

      if (r.toolId === 'notion_append_blocks') {
        const results = r.result?.results || [];
        return `✅ **Content Appended** — ${results.length} block(s) added to page.`;
      }

      if (r.toolId === 'notion_delete_block') {
        return `✅ **Block Deleted** successfully.`;
      }

      if (r.toolId === 'notion_query_database') {
        const results = r.result?.results || [];
        if (results.length > 0) {
          const list = results.slice(0, 15).map((item, i) => {
            // Try to extract the title from various property formats
            const props = item.properties || {};
            let title = 'Untitled';
            for (const [, prop] of Object.entries(props)) {
              if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
                title = prop.title[0].plain_text;
                break;
              }
            }
            // Try to get a status or select property for context
            let status = '';
            for (const [key, prop] of Object.entries(props)) {
              if (prop.type === 'select' && prop.select?.name) {
                status = ` [${prop.select.name}]`;
                break;
              } else if (prop.type === 'status' && prop.status?.name) {
                status = ` [${prop.status.name}]`;
                break;
              }
            }
            return `${i + 1}. 📄 **${title}**${status}\n   ID: \`${item.id}\``;
          }).join('\n');
          const hasMore = r.result?.has_more ? ' (more available)' : '';
          return `✅ **Database Query** (${results.length} results${hasMore})\n\n${list}`;
        }
        return `✅ **Database Query** — No matching entries found.`;
      }

      if (r.toolId === 'notion_get_page') {
        const page = r.result || {};
        const props = page.properties || {};
        let title = 'Untitled';
        for (const [, prop] of Object.entries(props)) {
          if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
            title = prop.title[0].plain_text;
            break;
          }
        }
        const icon = page.icon?.emoji || '';
        const url = page.url || '';
        const lastEdited = page.last_edited_time ? new Date(page.last_edited_time).toLocaleString() : '';
        return `✅ **Page Properties**\n\n${icon} **${title}**\n🔗 ${url}\n📅 Last edited: ${lastEdited}\nID: \`${page.id || ''}\``;
      }

      if (r.toolId === 'notion_get_database') {
        const db = r.result || {};
        const title = db.title?.[0]?.plain_text || 'Untitled';
        const desc = db.description?.[0]?.plain_text || '';
        const props = Object.entries(db.properties || {}).map(([name, prop]) => {
          return `  • **${name}** (${prop.type})`;
        }).join('\n');
        return `✅ **Database Schema**\n\n🗃️ **${title}**${desc ? `\n${desc}` : ''}\n\n**Properties:**\n${props || '  (none)'}`;
      }

      // ── Google Calendar tool results ───────────────────────────────────
      if (r.toolId === 'calendar_list_events') {
        const events = r.result?.items || [];
        if (events.length > 0) {
          const eventList = events.slice(0, 15).map((e, i) => {
            const start = e.start?.dateTime || e.start?.date || '';
            const end = e.end?.dateTime || e.end?.date || '';
            const startFormatted = start ? new Date(start).toLocaleString() : 'TBD';
            const endFormatted = end ? new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const meetLink = e.hangoutLink ? ' 📹' : '';
            const attendeeCount = e.attendees?.length || 0;
            const attendeeInfo = attendeeCount > 0 ? ` (${attendeeCount} attendees)` : '';
            return `${i + 1}. 📅 **${e.summary || 'No Title'}**${meetLink}\n   🕐 ${startFormatted}${endFormatted ? ` – ${endFormatted}` : ''}${attendeeInfo}${e.location ? `\n   📍 ${e.location}` : ''}\n   ID: \`${e.id}\``;
          }).join('\n');
          return `✅ **Calendar Events** (${events.length} found)\n\n${eventList}`;
        }
        return `✅ **Calendar** — No upcoming events found.`;
      }

      if (r.toolId === 'calendar_get_event') {
        const e = r.result || {};
        const start = e.start?.dateTime || e.start?.date || '';
        const end = e.end?.dateTime || e.end?.date || '';
        const startFormatted = start ? new Date(start).toLocaleString() : 'TBD';
        const endFormatted = end ? new Date(end).toLocaleString() : '';
        const attendees = (e.attendees || []).map(a => `  • ${a.email}${a.self ? ' (you)' : ''} — ${a.responseStatus || 'pending'}`).join('\n');
        const meetLink = e.hangoutLink ? `\n📹 Meet: ${e.hangoutLink}` : '';
        return `✅ **Event Details**\n\n📅 **${e.summary || 'No Title'}**\n🕐 ${startFormatted} → ${endFormatted}${e.location ? `\n📍 ${e.location}` : ''}${e.description ? `\n📝 ${e.description.slice(0, 200)}` : ''}${meetLink}${attendees ? `\n\n**Attendees:**\n${attendees}` : ''}\n\nID: \`${e.id || ''}\``;
      }

      if (r.toolId === 'calendar_create_event') {
        const e = r.result || {};
        const link = e.htmlLink || '';
        const meetLink = e.hangoutLink ? `\n📹 Meet: ${e.hangoutLink}` : '';
        return `✅ **Event Created**\n\n📅 **${e.summary || r.parameters?.summary || 'Event'}**\n🔗 ${link || 'Created successfully'}${meetLink}`;
      }

      if (r.toolId === 'calendar_update_event') {
        const e = r.result || {};
        return `✅ **Event Updated**\n\n📅 **${e.summary || r.parameters?.summary || 'Event'}** has been updated.\n🔗 ${e.htmlLink || ''}`;
      }

      if (r.toolId === 'calendar_delete_event') {
        const summary = r.result?.summary || r.parameters?.summary || 'Event';
        return `✅ **Event Deleted**\n\n🗑️ "${summary}" has been removed from your calendar.`;
      }

      if (r.toolId === 'calendar_find_free_time') {
        const calendars = r.result?.calendars || {};
        const busySlots = [];
        for (const [calId, calData] of Object.entries(calendars)) {
          const busy = calData.busy || [];
          busy.forEach(slot => {
            busySlots.push({
              calendar: calId,
              start: new Date(slot.start).toLocaleString(),
              end: new Date(slot.end).toLocaleString(),
            });
          });
        }
        if (busySlots.length > 0) {
          const slotList = busySlots.slice(0, 20).map((s, i) => `${i + 1}. 🔴 ${s.start} → ${s.end}`).join('\n');
          return `✅ **Free/Busy Check**\n\n**Busy times:**\n${slotList}\n\n💡 Any time NOT listed above is free.`;
        }
        return `✅ **Free/Busy Check** — You're completely free during this time range! 🟢`;
      }

      if (r.toolId === 'calendar_list_calendars') {
        const calendars = r.result?.items || [];
        if (calendars.length > 0) {
          const calList = calendars.slice(0, 20).map((c, i) => {
            const primary = c.primary ? ' ⭐' : '';
            const color = c.backgroundColor ? ` 🎨` : '';
            return `${i + 1}. 📅 **${c.summary || c.id}**${primary}${color}\n   ID: \`${c.id}\``;
          }).join('\n');
          return `✅ **Your Calendars** (${calendars.length})\n\n${calList}`;
        }
        return `✅ **Calendars** — No calendars found.`;
      }

      if (r.toolId === 'calendar_respond_to_event') {
        const response = r.parameters?.response || 'accepted';
        const emoji = response === 'accepted' ? '✅' : response === 'declined' ? '❌' : '❓';
        const e = r.result || {};
        return `${emoji} **Event Response: ${response}**\n\n📅 "${e.summary || 'Event'}" — You've ${response} this invitation.`;
      }

      const resultData = typeof r.result === 'string' ? r.result : JSON.stringify(r.result, null, 2);
      return `✅ **${appName}** → ${r.toolId} completed successfully:\n${resultData}`;
    }
    if (r.status === 'awaiting_confirmation') {
      return `⏳ **${appName}** → ${r.toolId} requires confirmation:\n${r.actionSummary}`;
    }
    return `❌ **${appName}** → ${r.toolId} failed: ${r.error}`;
  }).join('\n\n');
}

/**
 * Full MCP flow: inject tools → get AI response → execute tool calls → get final response
 * This is the main function called from the Inngest llm-model handler
 * 
 * @param {object} params
 * @param {string} params.userId - User ID (Firebase UID)
 * @param {string} params.userEmail - User email
 * @param {string} params.prompt - The full prompt being sent to the AI
 * @param {string} params.systemPrompt - Existing system prompt
 * @param {Function} params.callAI - Function to call the AI (model-agnostic)
 * @returns {{ enhancedSystemPrompt: string, toolResults: Array|null, toolResultsText: string }}
 */
export async function prepareMCPContext(userId, userEmail) {
  // Try userId first, fall back to email
  const identifier = userId || userEmail;
  const { tools, hasTools, connectedApps } = await getUserTools(identifier);

  if (!hasTools) {
    return {
      mcpSystemPrompt: '',
      hasTools: false,
      tools: [],
      connectedApps: [],
    };
  }

  return {
    mcpSystemPrompt: buildMCPSystemPrompt(tools),
    hasTools: true,
    tools,
    connectedApps,
  };
}

/**
 * Process AI response for tool calls and execute them
 * Returns the tool results formatted for display or for feeding back to AI
 * @param {string} aiResponse - Raw AI response
 * @param {string} userId - User ID
 * @param {Array} connectedApps - Connected apps list
 * @returns {{ finalResponse: string, toolResults: Array, hasToolCalls: boolean }}
 */
export async function processMCPResponse(aiResponse, userId, connectedApps, options = {}) {
  const { hasToolCalls, toolCalls, cleanResponse } = parseToolCalls(aiResponse);

  if (!hasToolCalls) {
    // Check if the AI is CLAIMING it did something without actually calling a tool
    // This happens when weak models hallucinate action completion
    if (options.callAI && options.originalQuery && isHallucinatedAction(aiResponse, options.originalQuery)) {
      console.log('[MCP] AI hallucinated action without tool call. Forcing tool execution...');
      try {
        const forcedResult = await forceToolExecution(aiResponse, userId, connectedApps, options);
        if (forcedResult) return forcedResult;
      } catch (err) {
        console.warn('[MCP] Forced tool execution failed:', err.message);
      }
    }
    return { finalResponse: aiResponse, toolResults: [], hasToolCalls: false };
  }

  // Execute all tool calls
  const results = await executeToolCalls(userId, toolCalls, connectedApps);

  // Canva generation is asynchronous; wait for the real job to finish before
  // the response is treated as final. This prevents placeholder "still generating"
  // text from being persisted as if it were the completed design.
  for (const result of results) {
    try {
      if (result.toolId === 'canva_generate_design' && result.status === 'success') {
        const jobId = result?.result?.jobId || result?.result?.id || result?.result?.statusDetails?.jobId;
        if (jobId) {
          if (options?.recordId) {
            await persistCanvaMarker(options.recordId, buildCanvaPendingPayload({
              jobId,
              prompt: result?.parameters?.prompt || '',
              designType: result?.result?.designType || result?.parameters?.designType || null,
            }, result?.parameters?.prompt || ''));
          }

          const finalCanvaResult = await waitForCanvaGenerationCompletion({
            userId,
            appId: result.appId || 'canva',
            jobId,
            prompt: result?.parameters?.prompt || '',
          });
          if (finalCanvaResult) {
            result.result = finalCanvaResult;
            result.status = 'success';
            result.error = null;

            if (options?.recordId) {
              try {
                await persistCanvaMarker(options.recordId, finalCanvaResult);
              } catch (dbErr) {
                console.warn('[MCP] Failed to persist final Canva payload before response:', dbErr?.message || dbErr);
              }
            }
          }
        }
      }
    } catch (canvaWaitError) {
      result.status = 'failed';
      result.error = canvaWaitError.message || 'Canva generation failed.';
      result.result = { error: result.error };
    }
  }

  // If Inngest/llm flow provided a recordId, monitor long-running Canva jobs
  try {
    if (options?.recordId && Array.isArray(results) && results.length > 0) {
      for (const r of results) {
        try {
          if (r.toolId === 'canva_generate_design' && r.status === 'success' && r.result && (r.result.jobId || r.result.id)) {
            if (r.result._canvaFinalized) {
              continue;
            }
            const jobId = r.result.jobId || r.result.id;
            const appId = r.appId || 'canva';
            const prompt = (r.parameters && r.parameters.prompt) || '';
            // Fire-and-forget monitor
            (async () => {
              const maxAttempts = 60;
              const intervalMs = 3000;
              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                  await new Promise(res => setTimeout(res, intervalMs));
                  const statusExec = await execute(userId, appId, 'canva_get_design_generation_job', { jobId }, { confirmed: true });
                  if (statusExec && statusExec.status === 'success' && statusExec.result) {
                    const data = statusExec.result;
                    if (data.status === 'completed' && (data.imageUrl || data.thumbnailUrl || data.designId || data.editUrl)) {
                      const imageUrl = data.imageUrl || data.thumbnailUrl || null;
                      const editUrl = data.editUrl || null;
                      const designId = data.designId || null;
                      const canvaPayload = buildCanvaPayload({ imageUrl, editUrl, downloadUrl: imageUrl, designId, prompt }, prompt);

                      try {
                        await persistCanvaMarker(options.recordId, canvaPayload);
                      } catch (dbErr) {
                        console.warn('[MCP] Failed to update chat with Canva result:', dbErr?.message || dbErr);
                      }
                      break; // stop polling this job
                    }
                    if (data.status === 'failed') {
                      // Optionally write failure notice
                      try {
                        const existing = await databases.getDocument(DB_ID, CHATS_COLLECTION_ID, options.recordId);
                        if (existing && typeof existing.aiResp === 'string' && !existing.aiResp.includes('CANVA_DESIGN')) {
                          const updatedAiResp = `${existing.aiResp}\n\n<!--CANVA_DESIGN:${JSON.stringify({ error: data.error || 'Canva generation failed', jobId })}-->`;
                          await databases.updateDocument(DB_ID, CHATS_COLLECTION_ID, options.recordId, { aiResp: updatedAiResp });
                        }
                      } catch (dbErr) { /* ignore */ }
                      break;
                    }
                  }
                } catch (pollErr) {
                  // Continue polling on transient errors
                  console.warn('[MCP] Canva job poll error:', pollErr?.message || pollErr);
                }
              }
            })();
          }
        } catch (innerErr) {
          console.warn('[MCP] Error scheduling Canva job monitor:', innerErr?.message || innerErr);
        }
      }
    }
  } catch (monErr) {
    console.warn('[MCP] Canva monitoring setup failed:', monErr?.message || monErr);
  }
  const resultsText = formatToolResults(results);

  // Check if we need a follow-up AI call (e.g., search found user → now send message)
  // This handles multi-step workflows like: search user → send DM
  const needsFollowUp = checkNeedsFollowUp(results, cleanResponse, options);

  if (needsFollowUp && options.callAI && options.iteration < 3) {
    try {
      // Build a follow-up prompt with tool results as context
      const followUpPrompt = buildFollowUpPrompt(cleanResponse, results, options.originalQuery);
      console.log('[MCP] Follow-up needed. Calling AI for action completion...');
      const followUpResponse = await options.callAI(followUpPrompt);
      console.log('[MCP] Follow-up AI response received:', followUpResponse ? followUpResponse.slice(0, 200) : '(empty)');

      if (followUpResponse) {
        // Check if the follow-up has more tool calls
        const followUpParsed = parseToolCalls(followUpResponse);
        if (followUpParsed.hasToolCalls) {
          console.log('[MCP] Follow-up has tool calls:', followUpParsed.toolCalls.map(t => t.toolId));
          // Execute the follow-up tool calls
          const followUpResults = await executeToolCalls(userId, followUpParsed.toolCalls, connectedApps);
          const followUpResultsText = formatToolResults(followUpResults);
          const allResultsText = [resultsText, followUpResultsText].filter(Boolean).join('\n\n');

          // Use the follow-up's clean response if available, otherwise use original
          const responseText = followUpParsed.cleanResponse || cleanResponse || '';
          const finalResponse = responseText
            ? `${responseText}\n\n---\n\n${allResultsText}`
            : allResultsText || 'Action completed.';

          return {
            finalResponse,
            toolResults: [...results, ...followUpResults],
            hasToolCalls: true,
          };
        } else {
          // Follow-up didn't produce tool calls — try with a more direct prompt
          console.log('[MCP] Follow-up had no tool calls. Trying direct action prompt...');
          const retryPrompt = buildDirectActionPrompt(results, options.originalQuery);
          const retryResponse = await options.callAI(retryPrompt);
          console.log('[MCP] Direct action response:', retryResponse ? retryResponse.slice(0, 200) : '(empty)');
          
          if (retryResponse) {
            const retryParsed = parseToolCalls(retryResponse);
            if (retryParsed.hasToolCalls) {
              console.log('[MCP] Direct action has tool calls:', retryParsed.toolCalls.map(t => t.toolId));
              const retryResults = await executeToolCalls(userId, retryParsed.toolCalls, connectedApps);
              const retryResultsText = formatToolResults(retryResults);
              const allResultsText = [resultsText, retryResultsText].filter(Boolean).join('\n\n');
              const finalResponse = `${cleanResponse || ''}\n\n---\n\n${allResultsText}`.trim();
              return {
                finalResponse: finalResponse || 'Action completed.',
                toolResults: [...results, ...retryResults],
                hasToolCalls: true,
              };
            }
          }
          // Both attempts failed — just show search results with the follow-up text
          const finalResponse = `${followUpResponse}\n\n---\n\n${resultsText}`;
          return { finalResponse, toolResults: results, hasToolCalls: true };
        }
      }
    } catch (err) {
      console.warn('[MCP] Follow-up AI call failed:', err.message, err.stack);
      // Fall through to normal response
    }
  }

  // Build final response: clean AI text + tool results
  let finalResponse;
  if (cleanResponse && resultsText) {
    finalResponse = `${cleanResponse}\n\n---\n\n${resultsText}`;
  } else if (cleanResponse) {
    finalResponse = cleanResponse;
  } else if (resultsText) {
    finalResponse = resultsText;
  } else {
    finalResponse = aiResponse;
  }

  // Safety: never return empty
  if (!finalResponse || !finalResponse.trim()) {
    finalResponse = cleanResponse || aiResponse || 'Tool execution completed.';
  }

  return {
    finalResponse,
    toolResults: results,
    hasToolCalls: true,
  };
}

/**
 * Check if tool results indicate we need a follow-up AI call
 * E.g., user asked to "send message to John" → search found John's ID → now need to send
 */
function checkNeedsFollowUp(results, cleanResponse, options) {
  if (!options.callAI || !options.originalQuery) return false;

  // If any tool returned user IDs or channel IDs and the original query
  // implies an action (send, reply, post), we likely need a follow-up
  const query = (options.originalQuery || '').toLowerCase();
  const actionWords = ['send', 'message', 'reply', 'post', 'write', 'tell', 'dm', 'direct', 'karo', 'bhejo', 'kar do', 'de do', 'bol', 'bolo', 'likh', 'forward', 'update', 'change', 'edit', 'modify', 'set', 'move', 'archive', 'delete', 'remove', 'add', 'create', 'duplicate', 'copy', 'badal', 'hatao', 'daal', 'banao'];
  const hasActionIntent = actionWords.some(w => query.includes(w));

  if (!hasActionIntent) return false;

  // Check if results contain lookup data (user IDs, channel IDs, page IDs) but no write action was performed
  const hasLookupResult = results.some(r =>
    r.status === 'success' && (
      r.toolId === 'slack_search_users' ||
      r.toolId === 'slack_search_channels' ||
      r.toolId === 'slack_open_dm' ||
      r.toolId === 'slack_read_channel' ||
      r.toolId === 'gmail_read_emails' ||
      r.toolId === 'gmail_search_threads' ||
      r.toolId === 'gmail_get_thread' ||
      r.toolId === 'gmail_list_drafts' ||
      r.toolId === 'gmail_get_draft' ||
      r.toolId === 'gmail_list_labels' ||
      r.toolId === 'drive_search_files' ||
      r.toolId === 'notion_search' ||
      r.toolId === 'notion_fetch' ||
      r.toolId === 'notion_get_page' ||
      r.toolId === 'notion_query_database' ||
      r.toolId === 'notion_get_database' ||
      r.toolId === 'calendar_list_events' ||
      r.toolId === 'calendar_get_event' ||
      r.toolId === 'calendar_list_calendars' ||
      r.toolId === 'calendar_find_free_time'
    )
  );

  const hasActionResult = results.some(r =>
    r.status === 'success' && (
      r.toolId === 'slack_send_message' ||
      r.toolId === 'gmail_send_email' ||
      r.toolId === 'gmail_reply_email' ||
      r.toolId === 'gmail_create_draft' ||
      r.toolId === 'notion_update_page' ||
      r.toolId === 'notion_create_page' ||
      r.toolId === 'notion_move_page' ||
      r.toolId === 'notion_duplicate_page' ||
      r.toolId === 'notion_delete_block' ||
      r.toolId === 'notion_append_blocks' ||
      r.toolId === 'notion_create_comment' ||
      r.toolId === 'notion_create_database' ||
      r.toolId === 'notion_update_database' ||
      r.toolId === 'notion_add_database_entry' ||
      r.toolId === 'calendar_create_event' ||
      r.toolId === 'calendar_update_event' ||
      r.toolId === 'calendar_delete_event' ||
      r.toolId === 'calendar_respond_to_event'
    )
  );

  return hasLookupResult && !hasActionResult;
}

/**
 * Extract the desired status/property value from a user's natural language query
 * E.g., "all app testing ko in process kar do" → "In Process"
 */
function extractStatusFromQuery(query) {
  if (!query) return null;
  const q = query.toLowerCase();
  
  // Common status values and their variations
  const statusMap = {
    'in process': 'In Process',
    'in progress': 'In Progress',
    'in-process': 'In Process',
    'in-progress': 'In Progress',
    'done': 'Done',
    'complete': 'Complete',
    'completed': 'Complete',
    'backlog': 'Backlog',
    'todo': 'To Do',
    'to do': 'To Do',
    'to-do': 'To Do',
    'not started': 'Not Started',
    'not-started': 'Not Started',
    'planning': 'Planning',
    'blocked': 'Blocked',
    'cancelled': 'Cancelled',
    'canceled': 'Cancelled',
    'on hold': 'On Hold',
    'on-hold': 'On Hold',
    'review': 'Review',
    'in review': 'In Review',
    'testing': 'Testing',
    'ready': 'Ready',
    'active': 'Active',
    'archived': 'Archived',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
    'urgent': 'Urgent',
  };
  
  for (const [key, value] of Object.entries(statusMap)) {
    if (q.includes(key)) return value;
  }
  
  // Try to extract from patterns like "ko X kar do", "to X change", "set to X"
  const patterns = [
    /(?:ko|to|into|as)\s+["']?([a-z][\w\s]+?)["']?\s+(?:kar|change|set|mark|update)/i,
    /(?:kar do|karo|change|set|mark|update)\s+(?:to|as|into)?\s*["']?([a-z][\w\s]+?)["']?\s*$/i,
    /status\s+(?:ko|to)?\s*["']?([a-z][\w\s]+?)["']?\s*(?:kar|change|set|mein)/i,
  ];
  
  for (const pattern of patterns) {
    const match = q.match(pattern);
    if (match && match[1]) {
      // Capitalize first letter of each word
      return match[1].trim().replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  
  return null;
}

/**
 * Detect if the AI is hallucinating that it performed an action without actually calling a tool
 * E.g., AI says "I've marked it as In Process" but didn't include any tool_call
 */
function isHallucinatedAction(aiResponse, originalQuery) {
  if (!aiResponse || !originalQuery) return false;
  
  const response = aiResponse.toLowerCase();
  const query = originalQuery.toLowerCase();
  
  // Check if the original query implies an action
  const actionIntents = ['update', 'change', 'set', 'mark', 'move', 'delete', 'remove', 'add', 'create', 'edit', 'modify', 'archive', 'kar do', 'karo', 'badal', 'hatao', 'daal', 'banao', 'bhejo', 'send'];
  const hasActionIntent = actionIntents.some(w => query.includes(w));
  if (!hasActionIntent) return false;
  
  // Check if the AI response claims success without a tool call
  const successClaims = [
    'has been marked', 'has been updated', 'has been changed', 'has been set',
    'has been moved', 'has been deleted', 'has been created', 'has been added',
    'successfully updated', 'successfully changed', 'successfully marked',
    'i\'ve updated', 'i\'ve marked', 'i\'ve changed', 'i\'ve set',
    'i have updated', 'i have marked', 'i have changed',
    'done', 'completed', 'kar diya', 'ho gaya', 'update ho gaya',
    'status changed', 'status updated', 'marked as',
    '✅', 'the task', 'the page',
  ];
  
  return successClaims.some(claim => response.includes(claim));
}

/**
 * Force tool execution when AI hallucinated an action
 * Calls the AI again with a very strict prompt to get a real tool call
 */
async function forceToolExecution(aiResponse, userId, connectedApps, options) {
  if (!options.callAI) return null;
  
  const query = options.originalQuery;
  
  // Step 1: Force a search first
  const searchPrompt = `SYSTEM: Output ONLY a tool_call block. No other text.

The user wants to perform an action in Notion. First, search for the item.
User said: "${query}"

Extract the ITEM NAME from the query (not parent workspace names like "Team HQ", "Tasks", "Projects").
Examples:
- "Team HQ ke andar all app testing ko in process kar do" → search for "all app testing"
- "update homepage copy status" → search for "homepage copy"

\`\`\`tool_call
{"tool": "notion_search", "parameters": {"query": "<ITEM_NAME_HERE>"}}
\`\`\``;

  const searchResponse = await options.callAI(searchPrompt);
  if (!searchResponse) return null;
  
  const searchParsed = parseToolCalls(searchResponse);
  if (!searchParsed.hasToolCalls) return null;
  
  // Execute the search
  const searchResults = await executeToolCalls(userId, searchParsed.toolCalls, connectedApps);
  const searchSuccess = searchResults.find(r => r.status === 'success' && r.result?.results?.length > 0);
  
  if (!searchSuccess) {
    const searchText = formatToolResults(searchResults);
    return { finalResponse: searchText || 'Could not find the item in Notion.', toolResults: searchResults, hasToolCalls: true };
  }
  
  // Step 2: Now force the actual action with the real page ID
  const pages = searchSuccess.result.results.slice(0, 3);
  const pagesList = pages.map(p => {
    const props = p.properties || {};
    let title = 'Untitled';
    for (const [, prop] of Object.entries(props)) {
      if (prop.type === 'title' && prop.title?.[0]?.plain_text) { title = prop.title[0].plain_text; break; }
    }
    return `"${title}" → ID: ${p.id}`;
  }).join('\n');
  
  const actionPrompt = `SYSTEM: Output ONLY a tool_call block. No other text. No explanation.

User request: "${query}"

Found these Notion pages:
${pagesList}

Pick the most relevant page ID and determine what the user wants to change.

IMPORTANT: For the "properties" parameter, pass it as a SIMPLE OBJECT (not a string):
\`\`\`tool_call
{"tool": "notion_update_page", "parameters": {"pageId": "PASTE_THE_REAL_ID_HERE", "properties": {"Status": {"status": {"name": "PASTE_NEW_VALUE_HERE"}}}}}
\`\`\`

Replace PASTE_THE_REAL_ID_HERE with the actual page ID from above.
Replace PASTE_NEW_VALUE_HERE with what the user wants (e.g., "In Process", "Done", "Backlog").

Output ONLY the tool_call block:`;

  let actionResponse = await options.callAI(actionPrompt);
  if (!actionResponse) return null;
  
  let actionParsed = parseToolCalls(actionResponse);
  
  // If AI still couldn't generate a proper tool call, build it ourselves
  if (!actionParsed.hasToolCalls && pages.length > 0) {
    // Extract the desired status from the original query
    const statusValue = extractStatusFromQuery(query);
    if (statusValue && pages[0]?.id) {
      // Build the tool call directly — no AI needed
      actionParsed = {
        hasToolCalls: true,
        toolCalls: [{
          toolId: 'notion_update_page',
          parameters: {
            pageId: pages[0].id,
            properties: { Status: { status: { name: statusValue } } },
          },
        }],
      };
    }
  }
  
  if (!actionParsed.hasToolCalls) return null;
  
  // Execute the action
  const actionResults = await executeToolCalls(userId, actionParsed.toolCalls, connectedApps);
  const searchText = formatToolResults(searchResults);
  const actionText = formatToolResults(actionResults);
  const allText = [searchText, actionText].filter(Boolean).join('\n\n');
  
  return {
    finalResponse: allText || 'Action completed.',
    toolResults: [...searchResults, ...actionResults],
    hasToolCalls: true,
  };
}

/**
 * Build a very direct prompt that forces the AI to output a tool_call
 * Used as a retry when the first follow-up didn't produce a tool call
 */
function buildDirectActionPrompt(toolResults, originalQuery) {
  // Extract IDs from results
  const pageIds = [];
  for (const r of toolResults) {
    if (r.status === 'success' && r.result?.results) {
      for (const item of r.result.results.slice(0, 5)) {
        const props = item.properties || {};
        let title = 'Untitled';
        for (const [, prop] of Object.entries(props)) {
          if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
            title = prop.title[0].plain_text;
            break;
          }
        }
        // Also extract current status if available
        let currentStatus = '';
        for (const [key, prop] of Object.entries(props)) {
          if ((prop.type === 'select' || prop.type === 'status') && (prop.select?.name || prop.status?.name)) {
            currentStatus = ` [Current ${key}: ${prop.select?.name || prop.status?.name}]`;
            break;
          }
        }
        pageIds.push({ id: item.id, title, type: item.object, currentStatus });
      }
    }
  }

  const itemsList = pageIds.map(p => `- "${p.title}" (${p.type})${p.currentStatus} → ID: ${p.id}`).join('\n');

  return `SYSTEM: You are a tool executor. You MUST respond with ONLY a tool_call JSON block. Do NOT explain anything. Do NOT add any text before or after the tool_call block.

USER REQUEST: "${originalQuery}"

SEARCH RESULTS:
${itemsList}

INSTRUCTIONS:
1. Pick the most relevant item from the search results based on the user's request.
2. Determine what action the user wants (update status, edit content, archive, delete, add, create, etc.)
3. Output ONLY the tool_call block below.

COMMON NOTION ACTIONS:
- Change Status property: notion_update_page with properties={"Status":{"status":{"name":"NEW_VALUE"}}}
- Change Select property (Stage, Priority, etc.): notion_update_page with properties={"Stage":{"select":{"name":"NEW_VALUE"}}}
- Archive: notion_update_page with archived=true
- Change title: notion_update_page with title="new title"
- Add content: notion_append_blocks with content="markdown text"
- Add comment: notion_create_comment with text="comment"
- Delete: notion_delete_block with blockId
- Add new entry to database: notion_add_database_entry with databaseId, title, and properties

\`\`\`tool_call
{"tool": "notion_update_page", "parameters": {"pageId": "REPLACE_WITH_ACTUAL_ID", "properties": "{REPLACE_WITH_ACTUAL_JSON}"}}
\`\`\`

NOW OUTPUT THE CORRECT tool_call for the user's request. Replace the example above with the real values:`;
}

/**
 * Build a follow-up prompt that includes tool results as context
 */
function buildFollowUpPrompt(originalAiText, toolResults, originalQuery) {
  const resultsContext = toolResults.map(r => {
    if (r.status === 'success') {
      // For Slack user search, extract user IDs clearly
      if (r.toolId === 'slack_search_users' && r.result?.members) {
        const users = r.result.members.slice(0, 5).map(m => `${m.real_name || m.name} (ID: ${m.id})`).join(', ');
        return `Found Slack users: ${users}`;
      }
      // For Slack open DM, extract channel ID
      if (r.toolId === 'slack_open_dm' && r.result?.channel) {
        return `DM channel opened: ID = ${r.result.channel.id}`;
      }
      // For Slack channel search
      if (r.toolId === 'slack_search_channels' && r.result?.channels) {
        const channels = r.result.channels.slice(0, 5).map(c => `#${c.name} (ID: ${c.id})`).join(', ');
        return `Found channels: ${channels}`;
      }
      // For Notion search results — extract page/database IDs and titles
      if (r.toolId === 'notion_search' && r.result?.results) {
        const items = r.result.results.slice(0, 5).map(item => {
          const title = item.properties?.title?.title?.[0]?.plain_text
            || item.properties?.Name?.title?.[0]?.plain_text
            || Object.values(item.properties || {}).find(p => p.type === 'title')?.title?.[0]?.plain_text
            || 'Untitled';
          const type = item.object || 'page';
          return `"${title}" (${type}, ID: ${item.id})`;
        }).join(', ');
        return `Found Notion items: ${items}`;
      }
      // For Notion query database results
      if (r.toolId === 'notion_query_database' && r.result?.results) {
        const items = r.result.results.slice(0, 5).map(item => {
          const props = item.properties || {};
          let title = 'Untitled';
          for (const [, prop] of Object.entries(props)) {
            if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
              title = prop.title[0].plain_text;
              break;
            }
          }
          return `"${title}" (ID: ${item.id})`;
        }).join(', ');
        return `Database query results: ${items}`;
      }
      // For Notion page fetch
      if (r.toolId === 'notion_get_page') {
        const page = r.result || {};
        const props = page.properties || {};
        let title = 'Untitled';
        for (const [, prop] of Object.entries(props)) {
          if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
            title = prop.title[0].plain_text;
            break;
          }
        }
        return `Page: "${title}" (ID: ${page.id})`;
      }
      return `Tool ${r.toolId} returned: ${JSON.stringify(r.result).slice(0, 800)}`;
    }
    return `Tool ${r.toolId} failed: ${r.error}`;
  }).join('\n');

  return `The user asked: "${originalQuery}"

You previously called tools and got these results:
${resultsContext}

Now COMPLETE the user's request. Use the IDs from the results above.

IMPORTANT RULES:
- For Slack DMs: Use the user ID directly as the "channel" parameter in slack_send_message. Slack accepts user IDs as channel targets for DMs.
- For channel messages: Use the channel ID from the search results.
- For Notion updates: Use the page ID from search results. To update a page's STATUS or other database property, use notion_update_page with the pageId and the properties parameter.
- For Notion property updates (Status, Priority, etc.): Use notion_update_page with pageId and set the "properties" parameter as a JSON object like: {"Status": {"status": {"name": "In Process"}}} for status-type fields, or {"Priority": {"select": {"name": "High"}}} for select-type fields.
- Generate the message/update content based on what the user asked for.
- Call the tool NOW — do not just describe what you would do.
- You MUST respond with a tool_call block to complete the action.

Respond with the tool call in this EXACT format:
\`\`\`tool_call
{"tool": "<tool_name>", "parameters": {<parameters>}}
\`\`\`

Original context: ${originalAiText || '(none)'}`;
}
