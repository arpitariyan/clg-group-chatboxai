/**
 * Email Intelligence Engine
 *
 * Provides smart email composition capabilities:
 * - Style detection from natural language
 * - HTML email body construction (per style)
 * - Natural language schedule time parsing
 * - Auto-reply body generation
 * - Thread context extraction
 */

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL STYLE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const EMAIL_STYLES = {
  professional: {
    label: 'Professional',
    description: 'Clear, polished, business-appropriate tone',
    greeting: (name) => name ? `Dear ${name},` : 'Dear Sir/Madam,',
    closing: 'Best regards,',
    accentColor: '#1a73e8',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  casual: {
    label: 'Casual',
    description: 'Relaxed, conversational, easy-going tone',
    greeting: (name) => name ? `Hey ${name}!` : 'Hey there!',
    closing: 'Cheers,',
    accentColor: '#34a853',
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  friendly: {
    label: 'Friendly',
    description: 'Warm, personal, approachable tone',
    greeting: (name) => name ? `Hi ${name}! 😊` : 'Hi there! 😊',
    closing: 'Warm regards,',
    accentColor: '#fbbc04',
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  formal: {
    label: 'Formal',
    description: 'Strictly formal, ceremonial, highly professional',
    greeting: (name) => name ? `Dear ${name},` : 'To Whom It May Concern,',
    closing: 'Yours sincerely,',
    accentColor: '#202124',
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  support: {
    label: 'Customer Support',
    description: 'Empathetic, solution-focused, helpful tone',
    greeting: (name) => name ? `Hello ${name},` : 'Hello,',
    closing: 'We appreciate your patience,',
    accentColor: '#1a73e8',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  sales: {
    label: 'Sales / Outreach',
    description: 'Persuasive, benefit-focused, call-to-action driven',
    greeting: (name) => name ? `Hi ${name},` : 'Hi there,',
    closing: 'Looking forward to connecting,',
    accentColor: '#ea4335',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  follow_up: {
    label: 'Follow-Up',
    description: 'References prior communication, prompts next action',
    greeting: (name) => name ? `Hi ${name},` : 'Hi,',
    closing: 'Looking forward to hearing from you,',
    accentColor: '#1a73e8',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  reminder: {
    label: 'Reminder',
    description: 'Polite but clear reminder about a deadline or task',
    greeting: (name) => name ? `Hi ${name},` : 'Hello,',
    closing: 'Thank you for your attention,',
    accentColor: '#fbbc04',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  apology: {
    label: 'Apology',
    description: 'Sincere, empathetic, solution-oriented apology',
    greeting: (name) => name ? `Dear ${name},` : 'Dear Valued Customer,',
    closing: 'With sincere apologies,',
    accentColor: '#ea4335',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  meeting: {
    label: 'Meeting Invite / Update',
    description: 'Structured, agenda-focused, time-sensitive',
    greeting: (name) => name ? `Hello ${name},` : 'Hello Team,',
    closing: 'Best,',
    accentColor: '#1a73e8',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  announcement: {
    label: 'Announcement',
    description: 'Bold, headline-style, clear key information',
    greeting: (name) => name ? `Dear ${name},` : 'Dear All,',
    closing: 'Thank you,',
    accentColor: '#9c27b0',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  auto_reply: {
    label: 'Auto-Reply',
    description: 'Out-of-office or automated response tone',
    greeting: (name) => name ? `Hello ${name},` : 'Hello,',
    closing: 'Thank you for your understanding,',
    accentColor: '#607d8b',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_PATTERNS = [
  { style: 'apology',      patterns: [/\b(apologi[sz]e|sorry|regret|mistake|error|inconvenience|forgive)\b/i] },
  { style: 'follow_up',    patterns: [/\b(follow[- ]?up|following up|checking in|circling back|touching base|as discussed|per our|previous email|last email)\b/i] },
  { style: 'meeting',      patterns: [/\b(meeting|calendar invite|schedule a call|set up a time|agenda|conference|video call|join us|zoom|google meet|teams call)\b/i] },
  { style: 'announcement', patterns: [/\b(announce|announcing|launch|introducing|exciting news|new feature|we are pleased|we are excited to|pleased to inform)\b/i] },
  { style: 'reminder',     patterns: [/\b(remind(er)?|don'?t forget|please note|upcoming deadline|due date|due soon|overdue|action required|time[- ]sensitive)\b/i] },
  { style: 'support',      patterns: [/\b(support|ticket|issue|problem|concern|help desk|complaint|resolve|troubleshoot|bug report|customer service)\b/i] },
  { style: 'sales',        patterns: [/\b(sales|pitch|offer|proposal|discount|deal|pricing|free trial|demo|revenue|roi|value proposition|interested in)\b/i] },
  { style: 'auto_reply',   patterns: [/\b(out of office|auto[- ]?reply|auto[- ]?response|vacation|on leave|away|currently unavailable|will respond|back on)\b/i] },
  { style: 'casual',       patterns: [/\b(casual|hey|hey there|quick note|just wanted|touching base)\b/i] },
  { style: 'friendly',     patterns: [/\b(friendly|warm|hope you'?re well|hope this finds you|kind note)\b/i] },
  { style: 'formal',       patterns: [/\b(formal|official|hereby|pursuant|aforementioned|respectfully|on behalf of|in accordance)\b/i] },
  { style: 'professional', patterns: [/\b(professional|business|colleague|team|professionally|regarding|concerning)\b/i] },
];

/**
 * Detect the best email style from a user's prompt.
 * @param {string} prompt - User's natural language request
 * @returns {string} One of the EMAIL_STYLES keys
 */
export function detectEmailStyle(prompt) {
  if (!prompt || typeof prompt !== 'string') return 'professional';
  const lower = prompt.toLowerCase();

  for (const { style, patterns } of STYLE_PATTERNS) {
    if (patterns.some(p => p.test(lower))) {
      return style;
    }
  }
  return 'professional';
}

/**
 * Convert plain text body to HTML paragraphs.
 * Handles lists (- item), bold (**text**), and line breaks.
 * @param {string} text
 * @param {string} textColor
 * @param {string} lineSpacing
 * @returns {string}
 */
function textToHtmlParagraphs(text, textColor = '#374151', lineSpacing = '1.6') {
  if (!text) return '';
  // If already contains structural HTML tags, return as-is
  if (/<(div|p|table|ul|ol|h[1-6])[>\s]/i.test(text.trim())) return text;

  // Process markdown-lite: **bold**, *italic*
  const processInline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const blocks = text.split(/\n{2,}/);
  return blocks.map(block => {
    const lines = block.split('\n');
    // Detect bullet list
    if (lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('• ') || l.trim() === '')) {
      const items = lines.filter(l => l.trim()).map(l => l.trim().replace(/^[-•]\s*/, ''));
      return `<ul style="margin:0 0 16px 0;padding-left:24px;color:${textColor};">${items.map(i => `<li style="margin-bottom:8px;line-height:${lineSpacing};">${processInline(i)}</li>`).join('')}</ul>`;
    }
    // Detect numbered list
    if (lines.every(l => /^\d+\./.test(l.trim()) || l.trim() === '')) {
      const items = lines.filter(l => l.trim()).map(l => l.trim().replace(/^\d+\.\s*/, ''));
      return `<ol style="margin:0 0 16px 0;padding-left:24px;color:${textColor};">${items.map(i => `<li style="margin-bottom:8px;line-height:${lineSpacing};">${processInline(i)}</li>`).join('')}</ol>`;
    }
    return `<p style="margin:0 0 16px 0;color:${textColor};line-height:${lineSpacing};">${processInline(lines.join('<br>'))}</p>`;
  }).join('');
}

// ─── TEMPLATE 1: PROFESSIONAL ─────────────────────────────────────────────────
// Ultra-clean, subtle grey border, elegant typography
function buildProfessionalHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Dear ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#334155', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f8fafc;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:48px 48px 40px;">
          <p style="margin:0 0 24px;font-size:16px;color:#0f172a;">${greeting}</p>
          <div style="font-size:15px;color:#334155;line-height:1.6;">${html}</div>
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f1f5f9;">
            <p style="margin:0 0 4px;font-size:15px;color:#475569;">Best regards,</p>
            ${senderName ? `<p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 2: FORMAL ───────────────────────────────────────────────────────
// Serif typography, minimalist, very subtle dark top line
function buildFormalHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Dear ${name},` : 'To Whom It May Concern,';
  const html = textToHtmlParagraphs(body, '#1f2937', '1.7');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#ffffff;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-top:3px solid #111827;">
        <tr><td style="padding:40px 20px;">
          <p style="margin:0 0 28px;font-size:16px;color:#111827;">${greeting}</p>
          <div style="font-size:15.5px;color:#374151;line-height:1.7;">${html}</div>
          <div style="margin-top:40px;">
            <p style="margin:0 0 6px;font-size:15px;color:#4b5563;font-style:italic;">Sincerely,</p>
            ${senderName ? `<p style="margin:0;font-size:16px;color:#111827;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 3: CASUAL ───────────────────────────────────────────────────────
// Light, airy, slightly rounded, clean sans-serif
function buildCasualHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const html = textToHtmlParagraphs(body, '#4b5563', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;background:#ffffff;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:40px;">
        <tr><td>
          <p style="margin:0 0 20px;font-size:16px;color:#111827;font-weight:500;">${greeting}</p>
          <div style="font-size:15px;color:#4b5563;line-height:1.6;">${html}</div>
          <div style="margin-top:28px;">
            <p style="margin:0 0 4px;font-size:15px;color:#6b7280;">Cheers,</p>
            ${senderName ? `<p style="margin:0;font-size:15px;font-weight:500;color:#111827;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 4: FRIENDLY ─────────────────────────────────────────────────────
// Warm, soft peach top accent, very clean
function buildFriendlyHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#44403c', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;background:#fafaf9;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
        <tr><td style="background:#f97316;height:4px;"></td></tr>
        <tr><td style="padding:44px 48px;">
          <p style="margin:0 0 20px;font-size:16px;color:#1c1917;font-weight:500;">${greeting}</p>
          <div style="font-size:15px;color:#44403c;line-height:1.6;">${html}</div>
          <div style="margin-top:32px;">
            <p style="margin:0 0 4px;font-size:15px;color:#78716c;">Warmly,</p>
            ${senderName ? `<p style="margin:0;font-size:16px;font-weight:500;color:#1c1917;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 5: SALES / MARKETING ───────────────────────────────────────────
// Clean, slightly higher contrast, sharp modern lines
function buildSalesHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#334155', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#ffffff;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;">
        <tr><td style="padding:48px;">
          <p style="margin:0 0 24px;font-size:17px;color:#0f172a;font-weight:600;">${greeting}</p>
          <div style="font-size:15.5px;color:#334155;line-height:1.6;">${html}</div>
          <div style="margin-top:36px;padding-top:24px;border-top:1px solid #f1f5f9;">
            ${senderName ? `<p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#0f172a;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 6: ANNOUNCEMENT ─────────────────────────────────────────────────
// Soft subtle background tint, centered alignment option, clean wrapper
function buildAnnouncementHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#1e1b4b', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#faf5ff;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="padding:48px;">
          <p style="margin:0 0 24px;font-size:16px;color:#312e81;font-weight:500;">${greeting}</p>
          <div style="font-size:15.5px;color:#4338ca;line-height:1.6;">${html}</div>
          <div style="margin-top:32px;">
            ${senderName ? `<p style="margin:0;font-size:16px;font-weight:500;color:#312e81;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 7: REMINDER ─────────────────────────────────────────────────────
// Subtle left border accent, very crisp
function buildReminderHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#3f3f46', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#ffffff;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fafafa;border-left:3px solid #f59e0b;border-radius:4px;">
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 20px;font-size:16px;color:#18181b;font-weight:500;">${greeting}</p>
          <div style="font-size:15px;color:#3f3f46;line-height:1.6;">${html}</div>
          <div style="margin-top:28px;">
            <p style="margin:0 0 4px;font-size:14.5px;color:#71717a;">Best,</p>
            ${senderName ? `<p style="margin:0;font-size:15.5px;font-weight:500;color:#18181b;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 8: APOLOGY ──────────────────────────────────────────────────────
// Calm, understated, highly readable
function buildApologyHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Dear ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#374151', '1.65');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#ffffff;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #f3f4f6;border-radius:4px;">
        <tr><td style="padding:48px;">
          <p style="margin:0 0 24px;font-size:16px;color:#111827;">${greeting}</p>
          <div style="font-size:15px;color:#374151;line-height:1.65;">${html}</div>
          <div style="margin-top:36px;">
            <p style="margin:0 0 6px;font-size:15px;color:#6b7280;">Sincerely,</p>
            ${senderName ? `<p style="margin:0;font-size:16px;color:#111827;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 9: MEETING ──────────────────────────────────────────────────────
// Clean structured layout, subtle blue accent
function buildMeetingHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#334155', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f8fafc;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-top:3px solid #3b82f6;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
        <tr><td style="padding:40px 48px;">
          <p style="margin:0 0 20px;font-size:16px;color:#0f172a;font-weight:500;">${greeting}</p>
          <div style="font-size:15px;color:#334155;line-height:1.6;">${html}</div>
          <div style="margin-top:28px;">
            <p style="margin:0 0 4px;font-size:15px;color:#64748b;">Best,</p>
            ${senderName ? `<p style="margin:0;font-size:15.5px;font-weight:500;color:#0f172a;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 10: SUPPORT ─────────────────────────────────────────────────────
// Clean, professional, slightly technical styling
function buildSupportHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#374151', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#ffffff;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <tr><td style="padding:40px 48px;">
          <p style="margin:0 0 20px;font-size:16px;color:#0f172a;font-weight:500;">${greeting}</p>
          <div style="font-size:15px;color:#374151;line-height:1.6;">${html}</div>
          <div style="margin-top:32px;">
            ${senderName ? `<p style="margin:0;font-size:15.5px;font-weight:500;color:#0f172a;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 11: FOLLOW-UP ───────────────────────────────────────────────────
// Standard clean email look
function buildFollowUpHTML(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#374151', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;background:#ffffff;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;">
        <tr><td style="padding:0 20px;">
          <p style="margin:0 0 20px;font-size:16px;color:#111827;">${greeting}</p>
          <div style="font-size:15px;color:#374151;line-height:1.6;">${html}</div>
          <div style="margin-top:28px;">
            <p style="margin:0 0 4px;font-size:15px;color:#6b7280;">Best,</p>
            ${senderName ? `<p style="margin:0;font-size:15.5px;font-weight:500;color:#111827;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── TEMPLATE 12: AUTO-REPLY ──────────────────────────────────────────────────
// Very minimal, muted grey, simple layout
function buildAutoReplyHTMLTemplate(body, recipientEmail, senderName) {
  const name = extractFirstName(recipientEmail);
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const html = textToHtmlParagraphs(body, '#4b5563', '1.6');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#ffffff;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;border:1px solid #f3f4f6;">
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 20px;font-size:15.5px;color:#1f2937;">${greeting}</p>
          <div style="font-size:15px;color:#4b5563;line-height:1.6;">${html}</div>
          <div style="margin-top:32px;">
            ${senderName ? `<p style="margin:0;font-size:15px;font-weight:500;color:#1f2937;">${senderName}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Main entry point: pick the right HTML template based on email style.
 * Each style gets its own unique layout, color palette, typography, and visual structure.
 *
 * @param {string} body - Raw body text or HTML
 * @param {string} style - One of the EMAIL_STYLES keys
 * @param {string} recipientEmail - Recipient email or name (for name extraction)
 * @param {string} senderName - Sender's display name
 * @returns {string} Complete HTML email
 */
export function buildEmailHTML(body, style = 'professional', recipientEmail = '', senderName = '') {
  // Normalize unknown styles
  const knownStyle = EMAIL_STYLES[style] ? style : 'professional';

  switch (knownStyle) {
    case 'professional':  return buildProfessionalHTML(body, recipientEmail, senderName);
    case 'formal':        return buildFormalHTML(body, recipientEmail, senderName);
    case 'casual':        return buildCasualHTML(body, recipientEmail, senderName);
    case 'friendly':      return buildFriendlyHTML(body, recipientEmail, senderName);
    case 'sales':         return buildSalesHTML(body, recipientEmail, senderName);
    case 'announcement':  return buildAnnouncementHTML(body, recipientEmail, senderName);
    case 'reminder':      return buildReminderHTML(body, recipientEmail, senderName);
    case 'apology':       return buildApologyHTML(body, recipientEmail, senderName);
    case 'meeting':       return buildMeetingHTML(body, recipientEmail, senderName);
    case 'support':       return buildSupportHTML(body, recipientEmail, senderName);
    case 'follow_up':     return buildFollowUpHTML(body, recipientEmail, senderName);
    case 'auto_reply':    return buildAutoReplyHTMLTemplate(body, recipientEmail, senderName);
    default:              return buildProfessionalHTML(body, recipientEmail, senderName);
  }
}

// Keep legacy alias for backward compatibility
export function buildStyledEmailHTML(body, style = 'professional', recipientEmail = '', senderName = '') {
  return buildEmailHTML(body, style, recipientEmail, senderName);
}


// ─────────────────────────────────────────────────────────────────────────────
// NATURAL LANGUAGE SCHEDULE TIME PARSER
// ─────────────────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/**
 * Parse time-of-day expressions to hours and minutes.
 * @param {string} text - e.g., "9am", "3:30pm", "noon", "midnight"
 * @returns {{ hours: number, minutes: number } | null}
 */
function parseTimeOfDay(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  if (lower === 'noon' || lower === 'midday') return { hours: 12, minutes: 0 };
  if (lower === 'midnight') return { hours: 0, minutes: 0 };
  if (lower === 'morning') return { hours: 9, minutes: 0 };
  if (lower === 'afternoon') return { hours: 14, minutes: 0 };
  if (lower === 'evening') return { hours: 18, minutes: 0 };
  if (lower === 'night') return { hours: 20, minutes: 0 };

  // Match "3:30pm", "9am", "14:00"
  const match = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Parse natural language scheduling expressions to an ISO datetime string.
 * @param {string} naturalLanguage - e.g., "tomorrow at 9am", "next Monday", "in 2 hours"
 * @param {string|Date} [referenceTime] - Base time for relative expressions (defaults to now)
 * @returns {{ parsedTime: string, confidence: 'high'|'medium'|'low', display: string } | null}
 */
export function parseScheduleTime(naturalLanguage, referenceTime = null) {
  if (!naturalLanguage || typeof naturalLanguage !== 'string') return null;

  // Already an ISO datetime → pass through
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(naturalLanguage.trim())) {
    const d = new Date(naturalLanguage.trim());
    if (!isNaN(d.getTime())) {
      return {
        parsedTime: d.toISOString(),
        confidence: 'high',
        display: formatDisplayTime(d),
      };
    }
  }

  const now = referenceTime ? new Date(referenceTime) : new Date();
  if (isNaN(now.getTime())) return null;

  const lower = naturalLanguage.toLowerCase().trim();
  let target = new Date(now);
  let confidence = 'high';

  // ── Relative: "in X minutes/hours/days" ───────────────────────────────────
  const relativeMatch = lower.match(/in\s+(\d+)\s+(minute|hour|day|week)s?/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const ms = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 };
    target = new Date(now.getTime() + amount * ms[unit]);
    return { parsedTime: target.toISOString(), confidence: 'high', display: formatDisplayTime(target) };
  }

  // ── "tomorrow" ────────────────────────────────────────────────────────────
  if (lower.includes('tomorrow')) {
    target.setDate(target.getDate() + 1);
    // Extract time if provided
    const timeMatch = lower.match(/at\s+([\d:apm\s]+(?:am|pm)?)/i) || lower.match(/(morning|afternoon|evening|noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (timeMatch) {
      const parsed = parseTimeOfDay(timeMatch[1] || timeMatch[0]);
      if (parsed) {
        target.setHours(parsed.hours, parsed.minutes, 0, 0);
      } else {
        target.setHours(9, 0, 0, 0); // Default: 9am tomorrow
      }
    } else {
      target.setHours(9, 0, 0, 0);
      confidence = 'medium';
    }
    return { parsedTime: target.toISOString(), confidence, display: formatDisplayTime(target) };
  }

  // ── "today at X" ──────────────────────────────────────────────────────────
  if (lower.startsWith('today')) {
    const timeMatch = lower.match(/at\s+([\d:apm\s]+(?:am|pm)?)/i) || lower.match(/(morning|afternoon|evening|noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (timeMatch) {
      const parsed = parseTimeOfDay(timeMatch[1] || timeMatch[0]);
      if (parsed) {
        target.setHours(parsed.hours, parsed.minutes, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1); // Push to tomorrow if past
        return { parsedTime: target.toISOString(), confidence: 'high', display: formatDisplayTime(target) };
      }
    }
    confidence = 'medium';
  }

  // ── "next [day]" ─────────────────────────────────────────────────────────
  const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (nextDayMatch) {
    const targetDay = DAYS_OF_WEEK.indexOf(nextDayMatch[1]);
    const currentDay = target.getDay();
    let daysAhead = targetDay - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    target.setDate(target.getDate() + daysAhead);
    // Extract time
    const timeMatch = lower.match(/at\s+([\d:apm\s]+(?:am|pm)?)/i);
    if (timeMatch) {
      const parsed = parseTimeOfDay(timeMatch[1]);
      if (parsed) target.setHours(parsed.hours, parsed.minutes, 0, 0);
      else target.setHours(9, 0, 0, 0);
    } else {
      target.setHours(9, 0, 0, 0);
      confidence = 'medium';
    }
    return { parsedTime: target.toISOString(), confidence, display: formatDisplayTime(target) };
  }

  // ── "[day] at X" e.g., "Friday at 3pm" ──────────────────────────────────
  const dayAtMatch = lower.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+([\d:apm\s]+(?:am|pm)?))?/);
  if (dayAtMatch) {
    const targetDay = DAYS_OF_WEEK.indexOf(dayAtMatch[1]);
    const currentDay = target.getDay();
    let daysAhead = targetDay - currentDay;
    if (daysAhead < 0) daysAhead += 7;
    if (daysAhead === 0) daysAhead = 7; // "Monday" means next Monday if today is Monday
    target.setDate(target.getDate() + daysAhead);
    if (dayAtMatch[2]) {
      const parsed = parseTimeOfDay(dayAtMatch[2].trim());
      if (parsed) target.setHours(parsed.hours, parsed.minutes, 0, 0);
      else target.setHours(9, 0, 0, 0);
    } else {
      target.setHours(9, 0, 0, 0);
      confidence = 'medium';
    }
    return { parsedTime: target.toISOString(), confidence, display: formatDisplayTime(target) };
  }

  // ── Standalone time e.g., "at 3pm", "at 9:30am" ─────────────────────────
  const standaloneTime = lower.match(/(?:at\s+)?([\d]{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  if (standaloneTime) {
    const parsed = parseTimeOfDay(standaloneTime[1].trim());
    if (parsed) {
      target.setHours(parsed.hours, parsed.minutes, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1); // Push to tomorrow if past
      return { parsedTime: target.toISOString(), confidence: 'medium', display: formatDisplayTime(target) };
    }
  }

  // ── Date strings: "June 10", "10 June", "Jun 10" ────────────────────────
  const monthDayMatch = lower.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/) ||
    lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/);
  if (monthDayMatch) {
    const monthIndex = MONTHS.indexOf(monthDayMatch[1].toLowerCase()) !== -1
      ? MONTHS.indexOf(monthDayMatch[1].toLowerCase())
      : MONTHS.indexOf(monthDayMatch[2]?.toLowerCase());
    const day = parseInt(monthDayMatch[1].match(/\d+/) ? monthDayMatch[1] : monthDayMatch[2], 10);
    if (monthIndex !== -1 && !isNaN(day)) {
      target.setMonth(monthIndex, day);
      if (target < now) target.setFullYear(target.getFullYear() + 1); // Future
      target.setHours(9, 0, 0, 0);
      const timeMatch = lower.match(/at\s+([\d:apm\s]+(?:am|pm)?)/i);
      if (timeMatch) {
        const parsed = parseTimeOfDay(timeMatch[1]);
        if (parsed) target.setHours(parsed.hours, parsed.minutes, 0, 0);
      } else {
        confidence = 'medium';
      }
      return { parsedTime: target.toISOString(), confidence, display: formatDisplayTime(target) };
    }
  }

  return null;
}

/**
 * Format a Date to a user-friendly display string.
 * @param {Date} date
 * @returns {string}
 */
function formatDisplayTime(date) {
  const options = {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  };
  try {
    return date.toLocaleString('en-IN', options);
  } catch {
    return date.toISOString();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-REPLY BODY GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-reply style definitions.
 */
const AUTO_REPLY_STYLES = {
  out_of_office: {
    label: 'Out of Office',
    template: (name, returnDate) => `Thank you for your email. I am currently out of the office${returnDate ? ` and will return on ${returnDate}` : ''}. I will respond to your message as soon as possible upon my return.\n\nIf your matter is urgent, please contact [alternative contact] at [email].`,
  },
  acknowledgment: {
    label: 'Acknowledgment',
    template: (name) => `Thank you for reaching out. I have received your email and will review it shortly.\n\nI will get back to you within 24-48 business hours.`,
  },
  busy_response: {
    label: 'Busy / Delayed Response',
    template: (name) => `Thank you for your email. I am currently experiencing a high volume of messages and my response times may be longer than usual.\n\nI appreciate your patience and will respond as soon as I can.`,
  },
  custom: {
    label: 'Custom',
    template: (name) => `Thank you for your email. I will get back to you shortly.`,
  },
};

/**
 * Build an auto-reply body based on the original email context.
 * @param {object} originalEmail - { from, subject, body }
 * @param {string} autoReplyStyle - One of auto_reply style keys
 * @param {string} senderName - The auto-replier's name
 * @param {string} [returnDate] - Optional return date for out_of_office
 * @returns {string} Auto-reply body text
 */
export function buildAutoReplyBody(originalEmail = {}, autoReplyStyle = 'acknowledgment', senderName = '', returnDate = '') {
  const style = AUTO_REPLY_STYLES[autoReplyStyle] || AUTO_REPLY_STYLES.acknowledgment;
  const fromName = originalEmail.from ? extractFirstName(originalEmail.from) : '';

  const body = style.template(fromName, returnDate);

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// THREAD CONTEXT EXTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract key context from a Gmail thread messages array.
 * @param {Array} threadMessages - Array of parsed Gmail message objects
 * @returns {{ subject: string, originalSender: string, lastSender: string, lastMessageSnippet: string, messageCount: number, threadTone: string }}
 */
export function extractEmailContextFromThread(threadMessages = []) {
  if (!Array.isArray(threadMessages) || threadMessages.length === 0) {
    return { subject: '', originalSender: '', lastSender: '', lastMessageSnippet: '', messageCount: 0, threadTone: 'professional' };
  }

  const first = threadMessages[0];
  const last = threadMessages[threadMessages.length - 1];

  const subject = first?.subject || last?.subject || '';
  const originalSender = first?.from || '';
  const lastSender = last?.from || '';
  const lastMessageSnippet = (last?.body || last?.snippet || '').slice(0, 300);

  // Detect tone of the thread
  const allText = threadMessages.map(m => m?.body || m?.snippet || '').join(' ');
  const threadTone = detectEmailStyle(allText + ' ' + subject);

  return {
    subject,
    originalSender,
    lastSender,
    lastMessageSnippet,
    messageCount: threadMessages.length,
    threadTone,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL PREVIEW BUILDER (for confirmation dialogs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a human-readable email preview for confirmation dialogs.
 * @param {string} to
 * @param {string} subject
 * @param {string} body
 * @param {string} style
 * @param {object} [options] - { cc, bcc, scheduledTime }
 * @returns {string}
 */
export function buildEmailPreview(to, subject, body, style = 'professional', options = {}) {
  const styleLabel = EMAIL_STYLES[style]?.label || 'Professional';
  const bodyPreview = (body || '').replace(/<[^>]+>/g, '').slice(0, 200).trim();
  const { cc, bcc, scheduledTime } = options;

  const lines = [
    `📧 Gmail → Send Email`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `To:      ${to || '—'}`,
    cc && cc.length ? `CC:      ${Array.isArray(cc) ? cc.join(', ') : cc}` : null,
    bcc && bcc.length ? `BCC:     ${Array.isArray(bcc) ? bcc.join(', ') : bcc}` : null,
    `Subject: ${subject || '—'}`,
    `Style:   ${styleLabel}`,
    scheduledTime ? `⏰ Scheduled: ${scheduledTime}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    bodyPreview ? `${bodyPreview}${body.length > 200 ? '…' : ''}` : '(no body)',
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Build a human-readable preview for a scheduled email.
 * @param {string} to
 * @param {string} subject
 * @param {object} scheduleResult - From parseScheduleTime()
 * @returns {string}
 */
export function buildSchedulePreview(to, subject, scheduleResult) {
  return [
    `⏰ Gmail → Schedule Email`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `To:        ${to || '—'}`,
    `Subject:   ${subject || '—'}`,
    `Send at:   ${scheduleResult?.display || scheduleResult?.parsedTime || '—'}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `The email will be saved as a draft with scheduling metadata.`,
  ].join('\n');
}

/**
 * Build a human-readable preview for an auto-reply.
 * @param {string} to - Original sender
 * @param {string} subject - Original subject
 * @param {string} autoReplyStyle
 * @returns {string}
 */
export function buildAutoReplyPreview(to, subject, autoReplyStyle) {
  const styleLabel = AUTO_REPLY_STYLES[autoReplyStyle]?.label || 'Custom';
  return [
    `🤖 Gmail → Auto-Reply`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Replying to: ${to || '—'}`,
    `Subject:     ${subject || '—'}`,
    `Reply style: ${styleLabel}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ].join('\n');
}

export { AUTO_REPLY_STYLES };
