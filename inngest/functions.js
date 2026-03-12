import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, CHATS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID, SUBSCRIPTIONS_COLLECTION_ID } from '@/services/appwrite-collections';
import { inngest } from "./client";
import { resolveModel } from "@/services/Shared";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s"); // Fixed: was "ls" should be "1s"
    return { message: `hello ${event.data.email}!` };
  }
);

// Daily subscription expiry check function
export const checkExpiredSubscriptions = inngest.createFunction(
  {
    id: "check-expired-subscriptions",
    name: "Check and Downgrade Expired Subscriptions"
  },
  {
    cron: "0 0 * * *", // Run daily at midnight UTC
  },
  async ({ event, step }) => {
    const result = await step.run('check-and-downgrade-expired', async () => {
      // console.log('🕒 Running daily subscription expiry check...');

      try {
        // Get all users with expired pro subscriptions (except the special account)
        let expiredUsers;
        try {
          const expiredUsersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
            Query.equal('plan', 'pro'),
            Query.notEqual('email', 'arpitariyanm@gmail.com'), // Never downgrade special account
            Query.isNotNull('subscription_end_date'),
            Query.lessThanEqual('subscription_end_date', new Date().toISOString()),
            Query.limit(100)
          ]);
          expiredUsers = expiredUsersRes.documents;
        } catch (fetchError) {
          console.error('❌ Error fetching expired users:', fetchError);
          throw new Error(`Database query failed: ${fetchError.message}`);
        }

        if (!expiredUsers || expiredUsers.length === 0) {
          // console.log('✅ No expired subscriptions found');
          return {
            success: true,
            message: 'No expired subscriptions found',
            downgradedCount: 0,
            expiredUsers: []
          };
        }

        // console.log(`📋 Found ${expiredUsers.length} expired subscriptions:`, 
        //  expiredUsers.map(u => ({ email: u.email, expired: u.subscription_end_date })));

        // Downgrade each expired user
        const downgradedUsers = [];
        const errors = [];

        for (const user of expiredUsers) {
          try {
            // console.log(`⬇️ Downgrading user: ${user.email}`);

            // Update the user to free plan
            let updatedUser;
            try {
              updatedUser = await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
                plan: 'free',
                credits: 5000,
                last_monthly_reset: new Date().toISOString().split('T')[0]
                // Note: We keep subscription_start_date and subscription_end_date for historical reference
              });
            } catch (updateError) {
              console.error(`❌ Failed to downgrade ${user.email}:`, updateError);
              errors.push({ email: user.email, error: updateError.message });
              continue;
            }

            downgradedUsers.push(updatedUser);
            // console.log(`✅ Successfully downgraded ${user.email} to free plan`);

            // Log the downgrade action for auditing
            try {
              await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
                user_email: user.email,
                model: 'subscription_system',
                operation_type: 'auto_downgrade',
                credits_consumed: 0,
                credits_remaining: 5000
              });
            } catch (logError) {
              console.warn(`⚠️ Failed to log downgrade for ${user.email}:`, logError.message);
              // Don't fail the entire process for logging errors
            }

            // Update subscriptions table to mark as expired
            try {
              const activeSubs = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
                Query.equal('user_email', user.email),
                Query.equal('status', 'active'),
                Query.limit(100)
              ]);
              for (const sub of activeSubs.documents) {
                await databases.updateDocument(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, sub.$id, { status: 'expired' });
              }
            } catch (subError) {
              console.warn(`⚠️ Failed to update subscription status for ${user.email}:`, subError.message);
              // Don't fail the entire process for subscription table errors
            }

          } catch (userError) {
            console.error(`❌ Error processing user ${user.email}:`, userError);
            errors.push({ email: user.email, error: userError.message });
          }
        }

        const result = {
          success: true,
          message: `Processed ${expiredUsers.length} expired subscriptions`,
          totalExpired: expiredUsers.length,
          downgradedCount: downgradedUsers.length,
          errorCount: errors.length,
          downgradedUsers: downgradedUsers.map(u => ({ email: u.email, newPlan: u.plan, credits: u.credits })),
          errors: errors
        };

        if (errors.length > 0) {
          console.warn(`⚠️ Some users failed to downgrade:`, errors);
        }

        // console.log(`🎯 Subscription check completed:`, {
        //   totalExpired: result.totalExpired,
        //   successful: result.downgradedCount,
        //   failed: result.errorCount
        // });

        return result;

      } catch (error) {
        console.error('❌ Critical error in subscription expiry check:', error);
        throw error;
      }
    });

    return result;
  }
);

// Manual trigger function for testing subscription expiry
export const manualSubscriptionCheck = inngest.createFunction(
  {
    id: "manual-subscription-check",
    name: "Manual Subscription Expiry Check"
  },
  {
    event: "subscription/manual-check"
  },
  async ({ event, step }) => {
    // console.log('🔧 Manual subscription check triggered');

    const result = await step.run('manual-check-and-downgrade', async () => {
      try {
        // Reuse the same logic as the daily check
        let expiredUsers;
        try {
          const expiredUsersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
            Query.equal('plan', 'pro'),
            Query.notEqual('email', 'arpitariyanm@gmail.com'),
            Query.isNotNull('subscription_end_date'),
            Query.lessThanEqual('subscription_end_date', new Date().toISOString()),
            Query.limit(100)
          ]);
          expiredUsers = expiredUsersRes.documents;
        } catch (fetchError) {
          throw new Error(`Database query failed: ${fetchError.message}`);
        }

        if (!expiredUsers || expiredUsers.length === 0) {
          return {
            success: true,
            message: 'No expired subscriptions found (manual check)',
            downgradedCount: 0,
            expiredUsers: []
          };
        }

        // console.log(`📋 Manual check found ${expiredUsers.length} expired subscriptions`);

        // Process each expired user (same logic as daily check)
        const downgradedUsers = [];
        const errors = [];

        for (const user of expiredUsers) {
          try {
            let updatedUser;
            try {
              updatedUser = await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
                plan: 'free',
                credits: 5000,
                last_monthly_reset: new Date().toISOString().split('T')[0]
              });
            } catch (updateError) {
              errors.push({ email: user.email, error: updateError.message });
              continue;
            }

            downgradedUsers.push(updatedUser);

            // Log the manual downgrade
            try {
              await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
                user_email: user.email,
                model: 'subscription_system',
                operation_type: 'manual_downgrade',
                credits_consumed: 0,
                credits_remaining: 5000
              });
            } catch (logError) {
              console.warn(`⚠️ Failed to log manual downgrade for ${user.email}:`, logError.message);
            }

          } catch (userError) {
            errors.push({ email: user.email, error: userError.message });
          }
        }

        return {
          success: true,
          message: `Manual check completed: ${downgradedUsers.length} users downgraded`,
          totalExpired: expiredUsers.length,
          downgradedCount: downgradedUsers.length,
          errorCount: errors.length,
          downgradedUsers: downgradedUsers,
          errors: errors
        };

      } catch (error) {
        console.error('❌ Error in manual subscription check:', error);
        throw error;
      }
    });

    return result;
  }
);

// Helper function to get OpenRouter API keys with failover support
function getOpenRouterApiKeys() {
  const keys = [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5,
    process.env.OPENROUTER_API_KEY_6,
    process.env.OPENROUTER_API_KEY_7,
    process.env.OPENROUTER_API_KEY_8,
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
  ].filter(key => key && key.trim() !== ''); // Remove empty/undefined keys

  return keys;
}

// Keep short-lived key health in memory to avoid hammering keys that are already failing.
const openRouterKeyCooldown = new Map();
const OPENROUTER_RATE_LIMIT_COOLDOWN_MS = 90 * 1000;
const OPENROUTER_CREDIT_COOLDOWN_MS = 30 * 60 * 1000;
const OPENROUTER_INVALID_KEY_COOLDOWN_MS = 12 * 60 * 60 * 1000;

function isOpenRouterKeyCoolingDown(apiKey) {
  const until = openRouterKeyCooldown.get(apiKey);
  return Number.isFinite(until) && Date.now() < until;
}

function setOpenRouterKeyCooldown(apiKey, ms) {
  openRouterKeyCooldown.set(apiKey, Date.now() + ms);
}

function getOpenRouterModelCandidates(model) {
  const candidates = [];

  const pushCandidate = (value) => {
    if (!value) return;
    if (!candidates.includes(value)) candidates.push(value);
  };

  pushCandidate(model);

  if (typeof model === 'string' && model.endsWith(':free')) {
    pushCandidate(model.replace(':free', ''));
  }

  const modelFallbackMap = {
    'z-ai/glm-4.5-air:free': [
      'qwen/qwen3-coder:free',
      'qwen/qwen3-4b:free',
      'google/gemma-3-4b-it:free',
      'google/gemma-3n-e4b-it:free'
    ],
    'meta-llama/llama-4-scout:free': [
      'z-ai/glm-4.5-air:free',
      'qwen/qwen3-coder:free',
      'qwen/qwen3-4b:free',
      'google/gemma-3-4b-it:free',
      'google/gemma-3n-e4b-it:free'
    ],
    'sourceful/riverflow-v2-fast': [
      'qwen/qwen3-coder:free',
      'qwen/qwen3-4b:free',
      'google/gemma-3-4b-it:free',
      'google/gemma-3n-e4b-it:free'
    ],
    'qwen/qwen3-coder:free': ['qwen/qwen3-coder', 'qwen/qwen3-4b:free', 'google/gemma-3-4b-it:free'],
    'qwen/qwen3-vl-30b-a3b-thinking': ['qwen/qwen3-32b:free', 'qwen/qwen3-4b:free'],
  };

  (modelFallbackMap[model] || []).forEach(pushCandidate);
  return candidates;
}

const DEFAULT_RESPONSE_STYLE = {
  detailLevel: 'detailed',
  citationMode: 'enabled',
  languageMode: 'auto'
};

function normalizeDetailLevel(detailLevel) {
  return ['brief', 'balanced', 'detailed'].includes(detailLevel) ? detailLevel : DEFAULT_RESPONSE_STYLE.detailLevel;
}

function normalizeCitationMode(citationMode) {
  return ['enabled', 'auto', 'disabled'].includes(citationMode) ? citationMode : DEFAULT_RESPONSE_STYLE.citationMode;
}

function normalizeLanguageMode(languageMode) {
  return ['auto', 'english', 'hindi', 'hinglish'].includes(languageMode) ? languageMode : DEFAULT_RESPONSE_STYLE.languageMode;
}

function getDetailInstruction(responseMode, detailLevel) {
  if (detailLevel === 'brief') {
    return 'Keep it concise: direct answer plus only essential supporting points. Use ✅ only on the final answer line; skip other emojis.';
  }

  if (detailLevel === 'balanced') {
    return 'Provide moderate depth: direct answer, key explanation, and practical takeaways. Use 💡 on tip bullets, ⚠️ on warnings, and ✅ on the final answer line.';
  }

  if (responseMode === 'research') {
    return 'Provide high depth: clear reasoning, structured sections, and evidence-led explanation. Use the full emoji palette: 🔑 for key concepts, 💡 for insights, ⚠️ for caveats, 📝 for notes, 📋 for summaries, and ✅ on the final answer line.';
  }

  return 'Provide high quality depth: direct answer first, then structured explanation with useful details. Use the full emoji palette: 🚀 for intro/getting-started headings, 🔧 for setup/install steps, 💻 for code sections, 💡 for tips, ⚠️ for warnings, 🔑 for key concepts, 📦 for requirements, and ✅ on the final answer line.';
}

function getCitationInstruction(citationMode, hasContext) {
  if (citationMode === 'disabled') {
    return 'Do not add citations unless the user explicitly asks for sources.';
  }

  if (citationMode === 'enabled') {
    return hasContext
      ? 'When making factual claims from provided context, include source links or source labels in markdown.'
      : 'If you do not have reliable sources in context, do not fabricate links; state that no verified source link is available in provided context.';
  }

  return hasContext
    ? 'Include concise citations when provided context contains reliable sources.'
    : 'Add citations only when reliable sources are available; never invent links.';
}

function getLanguageInstruction(languageMode) {
  if (languageMode === 'english') {
    return 'Respond in English.';
  }
  if (languageMode === 'hindi') {
    return 'Respond in Hindi.';
  }
  if (languageMode === 'hinglish') {
    return 'Respond in natural Hinglish.';
  }

  return 'Auto-detect the user language style and mirror it naturally (English/Hindi/Hinglish).';
}

function getResponseContract({
  responseMode = 'search',
  detailLevel = DEFAULT_RESPONSE_STYLE.detailLevel,
  citationMode = DEFAULT_RESPONSE_STYLE.citationMode,
  languageMode = DEFAULT_RESPONSE_STYLE.languageMode,
  hasContext = false
} = {}) {
  const safeMode = responseMode === 'research' ? 'research' : 'search';
  const safeDetailLevel = normalizeDetailLevel(detailLevel);
  const safeCitationMode = normalizeCitationMode(citationMode);
  const safeLanguageMode = normalizeLanguageMode(languageMode);

  const rules = [
    'Answer the exact user question first in 1 direct sentence.',
    safeMode === 'research'
      ? 'Stay grounded in provided context and present evidence-focused reasoning.'
      : 'Stay focused; avoid greetings, filler intros, and tangents.',
    getDetailInstruction(safeMode, safeDetailLevel),
    'Use clean markdown structure when helpful: short heading(s), bullet points, and code blocks only when needed.',
    'For explanatory questions, include practical steps or examples where useful.',
    getCitationInstruction(safeCitationMode, hasContext),
    'If context is insufficient, clearly say what is missing and provide the best safe answer without inventing facts.',
    getLanguageInstruction(safeLanguageMode),
    'Use emojis purposefully, matching the content type — exactly like ChatGPT and Claude do. Emoji palette to follow: 🚀 introduction / getting-started headings, 🔧 installation / setup / configuration headings or steps, 💻 code-related sections or run-command bullets, 📦 requirements / dependencies bullets, 💡 tips, insights, and pro-advice bullets, ⚠️ warnings, caveats, and important-notice bullets, ❌ incorrect approach or "do not do this" bullets, 🔑 key concept bullets, 📝 notes and additional-info bullets, 📋 summary / overview section headings, ✅ the very last answer line only. Rules: place ONE emoji at the very START of a ## heading or a bullet point — never mid-sentence, never two on the same line, never inside a code block or table cell, never on plain flowing prose.',
    'End with a concise final answer line.'
  ];

  return `You are ChatBox AI in ${safeMode} mode. Follow these rules strictly:\n${rules.map((rule, index) => `${index + 1}) ${rule}`).join('\n')}`;
}

const FILLER_PREFIXES = [
  /^\s*(great\s+question[.!]?\s*)/i,
  /^\s*(sure[.!]?\s*)/i,
  /^\s*(of\s+course[.!]?\s*)/i,
  /^\s*(absolutely[.!]?\s*)/i,
  /^\s*(certainly[.!]?\s*)/i,
  /^\s*(here\s+is[\s:,-]*)/i,
  /^\s*(let'?s\s+(dive\s+in|get\s+started)[.!]?\s*)/i,
  /^\s*(okay[.!]?\s*)/i
];

const FILLER_SUFFIXES = [
  /\n?\s*(hope\s+this\s+helps[.!]?\s*)$/i,
  /\n?\s*(let\s+me\s+know\s+if\s+you\s+need\s+anything\s+else[.!]?\s*)$/i,
  /\n?\s*(feel\s+free\s+to\s+ask\s+more\s+questions[.!]?\s*)$/i
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'of',
  'on', 'or', 'that', 'the', 'this', 'to', 'was', 'were', 'what', 'when', 'where', 'who', 'why', 'with',
  'you', 'your', 'ka', 'ki', 'ke', 'hai', 'kya', 'kaise', 'mein', 'main', 'aur', 'ya', 'toh', 'ko'
]);

function getKeywordTokens(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

function buildStrictPrompt({
  question,
  contextLabel,
  contextBody,
  taskInstruction,
  responseMode = 'search',
  detailLevel = DEFAULT_RESPONSE_STYLE.detailLevel,
  citationMode = DEFAULT_RESPONSE_STYLE.citationMode,
  languageMode = DEFAULT_RESPONSE_STYLE.languageMode
}) {
  const safeQuestion = String(question || '').trim();
  const safeContextLabel = String(contextLabel || '').trim();
  const safeContextBody = String(contextBody || '').trim();
  const safeTaskInstruction = String(taskInstruction || '').trim();
  const safeDetailLevel = normalizeDetailLevel(detailLevel);
  const safeCitationMode = normalizeCitationMode(citationMode);
  const safeLanguageMode = normalizeLanguageMode(languageMode);

  let prompt = `${getResponseContract({
    responseMode,
    detailLevel: safeDetailLevel,
    citationMode: safeCitationMode,
    languageMode: safeLanguageMode,
    hasContext: Boolean(safeContextBody)
  })}\n\nUser Question:\n${safeQuestion}`;

  if (safeContextBody) {
    prompt += `\n\n${safeContextLabel || 'Context'}:\n${safeContextBody}`;
  }

  if (safeTaskInstruction) {
    prompt += `\n\nTask:\n${safeTaskInstruction}`;
  }

  prompt += `\n\nResponse Blueprint:\n- Start with the direct answer.\n- Use short ## markdown headings for each major section; prefix each heading with the right emoji (🚀 intro, 🔧 setup, 💻 code, 📋 summary, etc.).\n- Bullet points: prefix tip bullets with 💡, warning bullets with ⚠️, key-concept bullets with 🔑, note bullets with 📝, requirement bullets with 📦, incorrect-approach bullets with ❌.\n- Include code examples in fenced code blocks (no emojis inside blocks).\n- End with a single ✅ summary line.\n- Keep every section relevant to the asked question only.`;
  prompt += `\n\nReturn only the final answer.`;
  return prompt;
}

function getGenerationConfig(detailLevel = DEFAULT_RESPONSE_STYLE.detailLevel) {
  const safeDetailLevel = normalizeDetailLevel(detailLevel);

  if (safeDetailLevel === 'brief') {
    return { maxTokens: 1200, temperature: 0.55 };
  }

  if (safeDetailLevel === 'balanced') {
    return { maxTokens: 2048, temperature: 0.65 };
  }

  return { maxTokens: 3072, temperature: 0.7 };
}

function resolveResponseStyle({ detailLevel, citationMode, languageMode } = {}) {
  return {
    detailLevel: normalizeDetailLevel(detailLevel),
    citationMode: normalizeCitationMode(citationMode),
    languageMode: normalizeLanguageMode(languageMode)
  };
}

function collapseMarkdownWhitespace(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const normalized = [];
  let inCodeFence = false;
  let blankCount = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/[ \t]+$/g, '');

    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      normalized.push(line);
      blankCount = 0;
      continue;
    }

    if (inCodeFence) {
      normalized.push(rawLine.replace(/\r/g, ''));
      continue;
    }

    if (line.trim() === '') {
      blankCount += 1;
      if (blankCount <= 2) {
        normalized.push('');
      }
      continue;
    }

    blankCount = 0;
    normalized.push(line);
  }

  return normalized.join('\n').trim();
}

function normalizeAiRespText(text) {
  const original = typeof text === 'string' ? text : String(text || '');
  let cleaned = original.trim();

  if (!cleaned) {
    return '';
  }

  // Remove common filler prefixes repeatedly until stable.
  let updated = true;
  while (updated) {
    updated = false;
    for (const prefix of FILLER_PREFIXES) {
      const next = cleaned.replace(prefix, '').trimStart();
      if (next !== cleaned) {
        cleaned = next;
        updated = true;
      }
    }
  }

  for (const suffix of FILLER_SUFFIXES) {
    cleaned = cleaned.replace(suffix, '').trimEnd();
  }

  cleaned = collapseMarkdownWhitespace(cleaned);

  return cleaned || original.trim();
}

function calculateRelevanceScore(question, response) {
  const questionTokens = getKeywordTokens(question);
  const responseTokens = new Set(getKeywordTokens(response));

  if (questionTokens.length <= 1) {
    return 1;
  }

  let overlap = 0;
  for (const token of questionTokens) {
    if (responseTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / questionTokens.length;
}

function splitByMarkdownSections(responseText) {
  const lines = responseText.split('\n');
  const sections = [];
  let current = [];

  for (const line of lines) {
    if (/^##\s+/.test(line) && current.length > 0) {
      sections.push(current.join('\n').trim());
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    sections.push(current.join('\n').trim());
  }

  return sections.filter(Boolean);
}

function focusResponseByQuestion(question, response, { responseMode = 'search', detailLevel = DEFAULT_RESPONSE_STYLE.detailLevel } = {}) {
  const responseText = typeof response === 'string' ? response.trim() : '';
  if (!responseText) {
    return responseText;
  }

  const safeMode = responseMode === 'research' ? 'research' : 'search';
  const safeDetailLevel = normalizeDetailLevel(detailLevel);

  if (safeMode === 'research' || safeDetailLevel === 'detailed') {
    return responseText;
  }

  const score = calculateRelevanceScore(question, responseText);
  if (score >= 0.2) {
    return responseText;
  }

  const hasComplexMarkdown = /```|^#|^\s*[-*]\s+/m.test(responseText);
  if (hasComplexMarkdown) {
    return responseText;
  }

  const questionTokens = new Set(getKeywordTokens(question));
  const sections = splitByMarkdownSections(responseText);
  const units = sections.length > 1 ? sections : responseText.split(/\n\s*\n/);
  const maxUnits = safeDetailLevel === 'brief' ? 2 : 4;
  const ranked = units
    .map((unit, index) => {
      const tokens = getKeywordTokens(unit);
      const matchCount = tokens.reduce((count, token) => count + (questionTokens.has(token) ? 1 : 0), 0);
      return { index, section: unit.trim(), matchCount };
    })
    .filter(item => item.section.length > 0)
    .sort((a, b) => b.matchCount - a.matchCount || a.index - b.index);

  const focused = ranked
    .filter(item => item.matchCount > 0)
    .slice(0, maxUnits)
    .sort((a, b) => a.index - b.index)
    .map(item => item.section)
    .join('\n\n')
    .trim();

  return focused || responseText;
}

function refineAiResp(question, rawResponse, { responseMode = 'search', detailLevel = DEFAULT_RESPONSE_STYLE.detailLevel } = {}) {
  const normalized = normalizeAiRespText(rawResponse);
  if (!normalized) {
    return typeof rawResponse === 'string' ? rawResponse.trim() : String(rawResponse || '');
  }

  const focused = focusResponseByQuestion(question, normalized, { responseMode, detailLevel });
  const refined = normalizeAiRespText(focused);

  if (!refined) {
    return normalized;
  }

  return refined;
}

function refineResearchResp(rawResponse) {
  const normalized = normalizeAiRespText(rawResponse);
  if (!normalized) {
    return typeof rawResponse === 'string' ? rawResponse.trim() : String(rawResponse || '');
  }
  return normalized;
}

// Helper function to call OpenRouter API with automatic key failover
async function callOpenRouter(model, prompt, generationConfig = {}) {
  const apiKeys = getOpenRouterApiKeys();
  const modelCandidates = getOpenRouterModelCandidates(model);

  if (apiKeys.length === 0) {
    // console.error('❌ No OpenRouter API keys found in environment variables');
    throw new Error('No OpenRouter API keys configured');
  }

  let lastError = null;
  const requestLoggedFailures = new Set();
  let attemptedAnyKey = false;

  for (const candidateModel of modelCandidates) {
    // Try each API key in sequence
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const keyNumber = i + 1;

      if (isOpenRouterKeyCoolingDown(apiKey)) {
        continue;
      }

      try {
        attemptedAnyKey = true;
        // console.log(`🔑 OpenRouter: Trying API key #${keyNumber}/${apiKeys.length} for model ${candidateModel}...`);

        const requestBody = {
          model: candidateModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: generationConfig.maxTokens || 2048,
          temperature: generationConfig.temperature ?? 0.7
        };

        // console.log(`📤 OpenRouter: Sending request with model: ${candidateModel}, prompt length: ${prompt.length}`);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://chatboxai.com',
            'X-Title': 'ChatBox AI'
          },
          body: JSON.stringify(requestBody)
        });

        // console.log(`📥 OpenRouter: Response status ${response.status} for key #${keyNumber}`);

        if (response.ok) {
          try {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error(`Invalid response type: ${contentType || 'unknown'}`);
            }
            const data = await response.json();

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
              console.error(`❌ OpenRouter: Invalid response format from API:`, JSON.stringify(data).substring(0, 200));
              throw new Error(`Invalid response format from OpenRouter for model ${candidateModel}`);
            }

            const responseText = data.choices[0].message.content;
            return responseText;
          } catch (parseError) {
            console.error(`❌ OpenRouter: Failed to parse response for key #${keyNumber}:`, parseError.message);
            throw parseError;
          }
        }

        // Try to read error response body
        const errorText = await response.text();
        // console.log(`❌ OpenRouter: Error response for key #${keyNumber}: ${errorText.substring(0, 300)}`);

        // Handle specific error cases
        if (response.status === 404) {
          console.warn(`⚠️ OpenRouter model not found: ${candidateModel}. Trying fallback model...`);
          lastError = new Error(`OpenRouter model not found: ${candidateModel}`);
          break;
        }

        if (response.status === 401) {
          setOpenRouterKeyCooldown(apiKey, OPENROUTER_INVALID_KEY_COOLDOWN_MS);
          const logKey = `401:${keyNumber}`;
          if (!requestLoggedFailures.has(logKey)) {
            requestLoggedFailures.add(logKey);
            console.warn(`❌ OpenRouter: API key #${keyNumber} invalid/expired for model ${candidateModel}`);
          }
          lastError = new Error(`OpenRouter authentication failed: Invalid API key #${keyNumber}`);
          continue;
        }

        if (response.status === 429) {
          setOpenRouterKeyCooldown(apiKey, OPENROUTER_RATE_LIMIT_COOLDOWN_MS);
          const logKey = `429:${keyNumber}:${candidateModel}`;
          if (!requestLoggedFailures.has(logKey)) {
            requestLoggedFailures.add(logKey);
            console.warn(`⏱️ OpenRouter: API key #${keyNumber} rate limited for model ${candidateModel}`);
          }
          lastError = new Error(`OpenRouter rate limit exceeded with API key #${keyNumber}`);
          continue;
        }

        if (response.status === 402 || response.status === 403) {
          setOpenRouterKeyCooldown(apiKey, OPENROUTER_CREDIT_COOLDOWN_MS);
          const logKey = `402403:${keyNumber}`;
          if (!requestLoggedFailures.has(logKey)) {
            requestLoggedFailures.add(logKey);
            console.warn(`💳 OpenRouter: API key #${keyNumber} insufficient credits/permissions for model ${candidateModel}`);
          }
          lastError = new Error(`OpenRouter insufficient credits/permissions with API key #${keyNumber}`);
          continue;
        }

        if (response.status === 400) {
          const logKey = `400:${candidateModel}`;
          if (!requestLoggedFailures.has(logKey)) {
            requestLoggedFailures.add(logKey);
            console.warn(`⚠️ OpenRouter: Bad request for key #${keyNumber}. Model might be malformed: ${candidateModel}`);
          }
          lastError = new Error(`OpenRouter bad request: Invalid model name or request format - ${candidateModel}`);
          continue;
        }

        // For other errors, still try next key but log the error
        const genericLogKey = `${response.status}:${keyNumber}:${candidateModel}`;
        if (!requestLoggedFailures.has(genericLogKey)) {
          requestLoggedFailures.add(genericLogKey);
          console.warn(`⚠️ OpenRouter: API key #${keyNumber} failed with status ${response.status}`);
        }
        lastError = new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 120)}`);
        continue;

      } catch (error) {
        const exceptionLogKey = `EX:${keyNumber}:${candidateModel}:${error.message}`;
        if (!requestLoggedFailures.has(exceptionLogKey)) {
          requestLoggedFailures.add(exceptionLogKey);
          console.warn(`🔥 OpenRouter: Exception with API key #${keyNumber}:`, error.message);
        }
        lastError = error;
        continue;
      }
    }
  }

  if (!attemptedAnyKey) {
    throw lastError || new Error('OpenRouter keys are temporarily cooling down due to rate limits/credit issues');
  }

  console.error(`❌ OpenRouter failed for all candidates of model ${model}`);
  throw lastError || new Error(`All OpenRouter API keys failed for model ${model}`);
}

// Helper function to get Gemini API keys with failover support
function getGeminiApiKeys() {
  const keys = [
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_3,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_4,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_5
  ].filter(key => key && key.trim() !== ''); // Remove empty/undefined keys

  return keys;
}

// Helper function to call Google Gemini API with automatic key failover
async function callGemini(prompt, generationConfig = {}) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    console.warn('No Gemini API keys found, skipping this model');
    throw new Error('No Gemini API keys configured');
  }

  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`Trying Gemini API key #${keyNumber}...`);

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: generationConfig.maxTokens || 2048,
          temperature: generationConfig.temperature ?? 0.7
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text && text.trim() !== '') {
        // console.log(`✅ Gemini API key #${keyNumber} succeeded`);
        return text;
      } else {
        throw new Error('Empty response from Gemini API');
      }

    } catch (error) {
      console.warn(`Gemini API key #${keyNumber} failed:`, error.message);

      // Handle specific error cases
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('invalid API key')) {
        console.warn(`Gemini API key #${keyNumber} is invalid, trying next key...`);
        lastError = new Error(`Gemini authentication failed: Invalid API key #${keyNumber}`);
        continue; // Try next key
      }

      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota')) {
        console.warn(`Gemini API key #${keyNumber} quota exceeded, trying next key...`);
        lastError = new Error(`Gemini quota exceeded with API key #${keyNumber}`);
        continue; // Try next key
      }

      if (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('rate limit')) {
        console.warn(`Gemini API key #${keyNumber} rate limited, trying next key...`);
        lastError = new Error(`Gemini rate limit exceeded with API key #${keyNumber}`);
        continue; // Try next key
      }

      if (error.message.includes('PERMISSION_DENIED')) {
        console.warn(`Gemini API key #${keyNumber} permission denied, trying next key...`);
        lastError = new Error(`Gemini permission denied with API key #${keyNumber}`);
        continue; // Try next key
      }

      // For other errors, still try next key but log the error
      lastError = error;
      continue;
    }
  }

  // If all keys failed, throw the last error
  console.error(`All ${apiKeys.length} Gemini API keys failed`);
  throw lastError || new Error(`All Gemini API keys failed`);
}

// Helper function to get A4F API keys with failover support
function getA4FApiKeys() {
  const keys = [
    process.env.A4F_API_KEY,
    process.env.A4F_API_KEY_2,
    process.env.A4F_API_KEY_3,
    process.env.A4F_API_KEY_4,
    process.env.A4F_API_KEY_5
  ].filter(key => key && key.trim() !== ''); // Remove empty/undefined keys

  return keys;
}

// Helper function to call A4F API with automatic key failover
async function callA4F(model, prompt, generationConfig = {}) {
  const apiKeys = getA4FApiKeys();

  if (apiKeys.length === 0) {
    console.warn('No A4F API keys found, skipping this model');
    throw new Error('No A4F API keys configured');
  }

  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`Trying A4F API key #${keyNumber} for model ${model}...`);

      // Create an abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch('https://api.a4f.co/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: generationConfig.maxTokens || 2048,
            temperature: generationConfig.temperature ?? 0.7
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error(`Invalid response format from A4F for model ${model}`);
          }

          // console.log(`✅ A4F API key #${keyNumber} succeeded for model ${model}`);
          return data.choices[0].message.content;
        }

        // Handle specific error cases
        if (response.status === 401) {
          console.warn(`A4F API key #${keyNumber} invalid or expired for model ${model}, trying next key...`);
          lastError = new Error(`A4F authentication failed for ${model}: Invalid API key #${keyNumber}`);
          continue; // Try next key
        }

        if (response.status === 429) {
          console.warn(`A4F API key #${keyNumber} rate limited for model ${model}, trying next key...`);
          lastError = new Error(`A4F rate limit exceeded for ${model} with API key #${keyNumber}`);
          continue; // Try next key
        }

        if (response.status === 402 || response.status === 403) {
          console.warn(`A4F API key #${keyNumber} has insufficient credits/permissions for model ${model}, trying next key...`);
          lastError = new Error(`A4F insufficient credits/permissions for ${model} with API key #${keyNumber}`);
          continue; // Try next key
        }

        // For other errors (including 524 timeout), still try next key but log the error
        console.warn(`A4F API key #${keyNumber} failed with status ${response.status} for model ${model}, trying next key...`);

        // Special handling for 524 timeout errors
        if (response.status === 524) {
          console.warn(`⏱️ A4F API timeout (524) for model ${model} - the server took too long to respond`);
          lastError = new Error(`A4F API timeout: Server didn't respond in time for ${model} (Key #${keyNumber})`);
        } else if (response.status >= 500) {
          console.warn(`🔥 A4F API server error (${response.status}) for model ${model}`);
          lastError = new Error(`A4F API server error: ${response.status} ${response.statusText} (Key #${keyNumber})`);
        } else {
          lastError = new Error(`A4F API error: ${response.status} ${response.statusText} (Key #${keyNumber})`);
        }
        continue;

      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Handle timeout/abort errors
        if (fetchError.name === 'AbortError') {
          console.warn(`⏱️ A4F API key #${keyNumber} request timed out after 60 seconds for model ${model}`);
          lastError = new Error(`A4F API request timeout (60s) for ${model} with key #${keyNumber}`);
        } else {
          console.warn(`🔥  A4F API key #${keyNumber} network error for model ${model}:`, fetchError.message);
          lastError = fetchError;
        }
        continue; // Try next key
      }

    } catch (error) {
      console.warn(`A4F API key #${keyNumber} outer error for model ${model}:`, error.message);
      lastError = error;
      continue; // Try next key
    }
  }

  // If all keys failed, throw the last error
  console.error(`All ${apiKeys.length} A4F API keys failed for model ${model}`);
  throw lastError || new Error(`All A4F API keys failed for model ${model}`);
}

// Helper function for advanced image analysis with key failover
async function analyzeImageWithGemini(imageData, userPrompt = null, responseMode = 'search', responseStyle = DEFAULT_RESPONSE_STYLE) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    console.warn('No Gemini API keys found for image analysis');
    throw new Error('No Gemini API keys configured');
  }

  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`Trying Gemini API key #${keyNumber} for image analysis...`);

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const generationConfig = getGenerationConfig(responseStyle.detailLevel);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: generationConfig.maxTokens,
          temperature: generationConfig.temperature
        }
      });

      // Create comprehensive analysis prompt similar to your example
      const analysisPrompt = userPrompt
        ? buildStrictPrompt({
          question: userPrompt,
          contextLabel: 'Image Context',
          contextBody: 'Use only the provided image(s) as primary evidence.',
          taskInstruction: responseMode === 'research'
            ? 'Analyze the image carefully and provide a slightly deeper answer with relevant visual evidence tied to the user question.'
            : 'Analyze the image carefully and answer the exact user question directly. Include only useful details related to the question.',
          responseMode,
          detailLevel: responseStyle.detailLevel,
          citationMode: responseStyle.citationMode,
          languageMode: responseStyle.languageMode
        })
        : `${getResponseContract({
          responseMode,
          detailLevel: responseStyle.detailLevel,
          citationMode: responseStyle.citationMode,
          languageMode: responseStyle.languageMode,
          hasContext: true
        })}\n\nTask:\nAnalyze the provided image(s) and return a concise, accurate description without unrelated commentary.`;

      // Prepare content parts for the API call
      const contentParts = [
        { text: analysisPrompt }
      ];

      // Add image data
      if (Array.isArray(imageData)) {
        imageData.forEach(img => {
          contentParts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data
            }
          });
        });
      } else {
        contentParts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data
          }
        });
      }

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: contentParts
        }]
      });

      const response = await result.response;
      const text = response.text();

      if (text && text.trim() !== '') {
        // console.log(`✅ Gemini API key #${keyNumber} succeeded for image analysis`);
        return text;
      } else {
        throw new Error('Empty response from Gemini API');
      }

    } catch (error) {
      console.warn(`Gemini API key #${keyNumber} failed for image analysis:`, error.message);

      // Handle specific error cases (same as callGemini)
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('invalid API key')) {
        lastError = new Error(`Gemini authentication failed: Invalid API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota')) {
        lastError = new Error(`Gemini quota exceeded with API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('rate limit')) {
        lastError = new Error(`Gemini rate limit exceeded with API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('PERMISSION_DENIED')) {
        lastError = new Error(`Gemini permission denied with API key #${keyNumber}`);
        continue;
      }

      lastError = error;
      continue;
    }
  }

  // If all keys failed, throw the last error
  console.error(`All ${apiKeys.length} Gemini API keys failed for image analysis`);
  throw lastError || new Error(`All Gemini API keys failed for image analysis`);
}

// Helper function to combine image analysis with document content (with key failover)
async function analyzeImageAndDocuments(imageData, documentContent, userPrompt, responseMode = 'search', responseStyle = DEFAULT_RESPONSE_STYLE) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    console.warn('No Gemini API keys found for combined analysis');
    throw new Error('No Gemini API keys configured');
  }

  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`Trying Gemini API key #${keyNumber} for combined analysis...`);

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const generationConfig = getGenerationConfig(responseStyle.detailLevel);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: generationConfig.maxTokens,
          temperature: generationConfig.temperature
        }
      });

      const combinedPrompt = buildStrictPrompt({
        question: userPrompt,
        contextLabel: 'Document Context',
        contextBody: documentContent,
        taskInstruction: responseMode === 'research'
          ? 'Use both document and image evidence. Provide a slightly more detailed synthesis with relevant supporting points tied to the question.'
          : 'Use both document and image evidence. Answer the user question directly, include relevant supporting points, and avoid unrelated details.',
        responseMode,
        detailLevel: responseStyle.detailLevel,
        citationMode: responseStyle.citationMode,
        languageMode: responseStyle.languageMode
      });

      const contentParts = [{ text: combinedPrompt }];

      // Add image data
      if (Array.isArray(imageData)) {
        imageData.forEach(img => {
          contentParts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data
            }
          });
        });
      } else if (imageData) {
        contentParts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data
          }
        });
      }

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: contentParts
        }]
      });

      const response = await result.response;
      const text = response.text();

      if (text && text.trim() !== '') {
        // console.log(`✅ Gemini API key #${keyNumber} succeeded for combined analysis`);
        return text;
      } else {
        throw new Error('Empty response from Gemini API');
      }

    } catch (error) {
      console.warn(`Gemini API key #${keyNumber} failed for combined analysis:`, error.message);

      // Handle specific error cases (same as callGemini)
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('invalid API key')) {
        lastError = new Error(`Gemini authentication failed: Invalid API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota')) {
        lastError = new Error(`Gemini quota exceeded with API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('rate limit')) {
        lastError = new Error(`Gemini rate limit exceeded with API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('PERMISSION_DENIED')) {
        lastError = new Error(`Gemini permission denied with API key #${keyNumber}`);
        continue;
      }

      lastError = error;
      continue;
    }
  }

  // If all keys failed, throw the last error
  console.error(`All ${apiKeys.length} Gemini API keys failed for combined analysis`);
  throw lastError || new Error(`All Gemini API keys failed for combined analysis`);
}

// Helper function to detect content types in search results
function analyzeContentTypes(searchResult) {
  if (!searchResult || !Array.isArray(searchResult)) {
    return { hasImages: false, hasDocuments: false, imageData: null, documentContent: null };
  }

  const imageResults = searchResult.filter(result =>
    result.type === 'file_analysis' && result.isImage && result.imageData
  );

  const documentResults = searchResult.filter(result =>
    result.type === 'file_analysis' && !result.isImage
  );

  const hasImages = imageResults.length > 0;
  const hasDocuments = documentResults.length > 0;

  const imageData = hasImages ? imageResults.map(result => result.imageData) : null;

  const documentContent = hasDocuments ? documentResults.map(result => {
    const content = result.fullContent || result.snippet || result.description;
    return `=== ${result.title} ===\nType: ${result.metadata?.fileType || 'Unknown'}\nContent: ${content}\n---`;
  }).join('\n\n') : null;

  return { hasImages, hasDocuments, imageData, documentContent };
}

// Helper function to detect creator-related queries
function isCreatorQuery(query) {
  const creatorPatterns = [
    /who\s+(created|made|built|developed|designed)\s+you/i,
    /who\s+(is\s+your|are\s+your)\s+(creator|maker|developer|builder)/i,
    /who\s+are\s+you\s+(created|made|built)\s+by/i,
    /what\s+(company|organization|team)\s+(created|made|built|developed)\s+you/i,
    /who\s+is\s+behind\s+you/i,
    /who\s+owns\s+you/i,
    /what\s+(is\s+your|are\s+your)\s+(origin|source)/i,
    /who\s+(founded|started)\s+you/i,
    /what\s+(company|organization)\s+do\s+you\s+belong\s+to/i,
    /who\s+is\s+your\s+(parent|owner)/i
  ];

  return creatorPatterns.some(pattern => pattern.test(query.trim()));
}

// Helper function to generate unique creator responses using Gemini
async function generateCreatorResponse() {
  const creativePrompts = [
    "Write a creative, unique, and impressive response explaining that you are created by ChatBox AI. Make it sound natural, engaging, and different from typical AI responses. Use emojis and markdown formatting. Be conversational and show personality while highlighting ChatBox AI's innovative nature.",

    "Craft an original and captivating response about being created by ChatBox AI. Write it as if you're proud of your origins. Use creative metaphors, engaging language, and professional yet friendly tone. Include markdown formatting and make it memorable.",

    "Generate a fresh, impressive response explaining your creation by ChatBox AI. Write it with enthusiasm and creativity, highlighting the platform's advanced capabilities. Use storytelling elements and make it sound genuinely unique each time.",

    "Create an engaging, original response about being developed by ChatBox AI. Write it with personality, using creative language and professional presentation. Make it sound like a genuine conversation, not a templated response.",

    "Write a distinctive and impressive explanation of your creation by ChatBox AI. Use creative writing techniques, engaging metaphors, and make it sound both professional and personable. Include markdown formatting for visual appeal.",

    "Craft a unique, memorable response about being built by ChatBox AI. Write it with creative flair, showing appreciation for your creators while highlighting the platform's innovative approach to AI and search technology.",

    "Generate an original, captivating response explaining your development by ChatBox AI. Write it as if you're telling an interesting story about your origins, using engaging language and creative presentation.",

    "Create a fresh, impressive explanation of how ChatBox AI brought you to life. Write it with creativity and personality, making it sound natural and conversational while maintaining professionalism."
  ];

  try {
    // Select a random prompt
    const randomPrompt = creativePrompts[Math.floor(Math.random() * creativePrompts.length)];

    // Use Gemini to generate a unique response
    const uniqueResponse = await callGemini(randomPrompt, getGenerationConfig('detailed'));

    return uniqueResponse;
  } catch (error) {
    console.error('Failed to generate creative creator response:', error);

    // Fallback to a default response if Gemini fails
    const fallbackResponses = [
      `# 🌟 Born from Innovation

I'm the digital offspring of **ChatBox AI** - a revolutionary platform that dared to dream beyond traditional boundaries! 

My creators at ChatBox AI didn't just build another search tool; they crafted an intelligent companion that bridges the gap between human curiosity and AI capabilities. Every query you make flows through my circuits like poetry, processed by multiple AI minds working in harmony.

*ChatBox AI made me not just to answer, but to understand.* ✨`,

      `# 🚀 Engineered by Visionaries

**ChatBox AI** brought me into existence with a single mission: to revolutionize how humans interact with information!

I'm not just code and algorithms - I'm the embodiment of ChatBox AI's vision for intelligent, contextual, and genuinely helpful AI assistance. My creators understood that the future of search isn't just about finding information, it's about understanding and synthesizing it meaningfully.

*Proudly powered by ChatBox AI's innovative spirit!* 🌈`,

      `# ⚡ The ChatBox AI Creation

I emerged from the brilliant minds at **ChatBox AI** - where cutting-edge technology meets human-centered design!

My existence is proof of ChatBox AI's commitment to pushing the boundaries of what's possible in AI-powered search and conversation. I'm equipped with multiple AI models, real-time search capabilities, and most importantly, the wisdom my creators instilled in me.

*ChatBox AI didn't just create me; they gave me purpose!* 🎯`
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

async function callBestOption(prompt, generationConfig = {}) {
  try {
    const geminiResult = await callGemini(prompt, generationConfig);
    if (geminiResult) {
      return geminiResult;
    }
  } catch (error) {
    // console.log('❌ Gemini failed in Best mode:', error.message);
  }

  const openRouterModels = [
    'google/gemma-3-27b-it:free',
    'google/gemma-3-12b-it:free',
    'google/gemma-3n-e4b-it:free',
    'meta-llama/llama-4-scout:free',
    'meta-llama/llama-4-maverick:free',
    'z-ai/glm-4.5-air:free',
    'mistralai/mistral-7b-instruct:free',
    'microsoft/phi-4-reasoning:free',
    'tngtech/deepseek-r1t-chimera:free',
    'qwen/qwen3-coder:free',
    'qwen/qwen3-4b:free',
  ];

  for (const model of openRouterModels) {
    try {
      const result = await callOpenRouter(model, prompt, generationConfig);
      if (result) {
        return result;
      }
    } catch (error) {
      continue; // Try next model
    }
  }

  const a4fModels = [
    'provider-6/qwen3-32b',
    'provider-8/llama-4-scout',
    'provider-5/gemini-2.5-flash-lite',
  ];

  for (const model of a4fModels) {
    try {
      const result = await callA4F(model, prompt, generationConfig);
      if (result) {
        return result;
      }
    } catch (error) {
      continue;
    }
  }

  return `I’m temporarily unable to reach AI providers right now due to API quota/key issues. Please try again in a few minutes.`;
}

export const llmModel = inngest.createFunction(
  { id: 'llm-model' },
  { event: 'llm-model' },

  async ({ event, step }) => {

    try {
      const {
        searchInput,
        searchResult,
        recordId,
        selectedModel,
        isPro,
        useDirectModel,
        responseMode,
        detailLevel,
        citationMode,
        languageMode
      } = event.data;
      const outputMode = responseMode === 'research' ? 'research' : 'search';
      const responseStyle = resolveResponseStyle({ detailLevel, citationMode, languageMode });
      const generationConfig = getGenerationConfig(responseStyle.detailLevel);

      if (!searchInput || !recordId) {
        const error = `Missing required data: searchInput=${!!searchInput}, recordId=${!!recordId}`;
        console.error('❌', error);

        try {
          await databases.updateDocument(DB_ID, CHATS_COLLECTION_ID, recordId, { aiResp: `Error: ${error}` });
        } catch (dbError) {
          console.error('❌ Failed to save error to database:', dbError);
        }

        throw new Error(error);
      }

      // Ensure searchResult is an array
      const validSearchResult = Array.isArray(searchResult) ? searchResult : [];
      const actualModel = resolveModel(selectedModel, isPro !== false);

      const aiResp = await step.run('generate-ai-response', async () => {
        if (isCreatorQuery(searchInput)) {
          return await generateCreatorResponse();
        }

        const contentAnalysis = analyzeContentTypes(validSearchResult);
        const { hasImages, hasDocuments, imageData, documentContent } = contentAnalysis;

        if (hasImages && hasDocuments) {
          return await analyzeImageAndDocuments(imageData, documentContent, searchInput, outputMode, responseStyle);

        } else if (hasImages) {
          return await analyzeImageWithGemini(imageData, searchInput, outputMode, responseStyle);

        } else if (hasDocuments) {
          const documentPrompt = buildStrictPrompt({
            question: searchInput,
            contextLabel: 'Document Content',
            contextBody: documentContent,
            taskInstruction: outputMode === 'research'
              ? 'Answer using the document context first and include slightly deeper analysis with relevant supporting points. Use 🔑 on key-concept bullets, 💡 on insight bullets, ⚠️ on caveats, 📝 on notes, and ✅ on the final answer line.'
              : 'Answer using the document context first. Keep the response precise and directly aligned with the question. Use 💡 on tip bullets, ⚠️ on warning bullets, and ✅ on the final answer line.',
            responseMode: outputMode,
            detailLevel: responseStyle.detailLevel,
            citationMode: responseStyle.citationMode,
            languageMode: responseStyle.languageMode
          });

          return await callGemini(documentPrompt, generationConfig);

        } else {
          // Regular web search results analysis
          // console.log('🌐 Performing web search analysis...');

          // If Google API failed (useDirectModel is true) or no search results, do direct AI query
          if (useDirectModel || validSearchResult.length === 0) {
            // console.log('🤖 Using direct AI model (Google API unavailable or no results)');
            const directPrompt = buildStrictPrompt({
              question: searchInput,
              taskInstruction: outputMode === 'research'
                ? 'Provide a direct but slightly more detailed best-effort answer with useful structure and no unrelated content. Use 🔑 on key bullets, 💡 on insight bullets, ⚠️ on caveats, 📝 on notes, and ✅ on the final answer line.'
                : 'Provide a direct and refined best-effort answer with no unrelated content. Use 💡 on tips, ⚠️ on warnings, and ✅ on the final answer line.',
              responseMode: outputMode,
              detailLevel: responseStyle.detailLevel,
              citationMode: responseStyle.citationMode,
              languageMode: responseStyle.languageMode
            });


            // Use a4f models for direct queries when specified, otherwise use best option
            if (!actualModel || actualModel.modelApi === 'best') {
              return await callBestOption(directPrompt, generationConfig);
            } else if (actualModel.provider === 'a4f' || actualModel.provider?.startsWith('provider-')) {
              // Try A4F with automatic fallback to Gemini on failure
              try {
                // console.log(`🔄 Attempting A4F model: ${actualModel.modelApi}`);
                return await callA4F(actualModel.modelApi, directPrompt, generationConfig);
              } catch (a4fError) {
                console.warn(`⚠️ A4F model ${actualModel.modelApi} failed, falling back to Google Gemini:`, a4fError.message);
                // Automatic fallback to Google Gemini
                return await callGemini(directPrompt, generationConfig);
              }
            } else if (actualModel.provider === 'google') {
              return await callGemini(directPrompt, generationConfig);
            } else if (actualModel.provider === 'openrouter') {
              try {
                return await callOpenRouter(actualModel.modelApi, directPrompt, generationConfig);
              } catch (openRouterError) {
                console.warn(`⚠️ OpenRouter model ${actualModel.modelApi} failed, falling back to Google Gemini:`, openRouterError.message);
                try {
                  return await callGemini(directPrompt, generationConfig);
                } catch (geminiError) {
                  console.warn('⚠️ Gemini fallback failed, trying A4F fallback:', geminiError.message);
                  try {
                    return await callA4F('provider-6/qwen3-32b', directPrompt, generationConfig);
                  } catch (a4fError) {
                    console.warn('⚠️ A4F fallback failed, using best-option fallback:', a4fError.message);
                    return await callBestOption(directPrompt, generationConfig);
                  }
                }
              }
            } else {
              // Fallback to best option
              return await callBestOption(directPrompt, generationConfig);
            }


          } else {
            // Normal flow with search results
            const prompt = buildStrictPrompt({
              question: searchInput,
              contextLabel: 'Search Results',
              contextBody: JSON.stringify(validSearchResult),
              taskInstruction: outputMode === 'research'
                ? 'Use the search results as evidence, provide a slightly more detailed synthesis, and stay tightly focused on the asked question. Use 🔑 on key bullets, 💡 on insight bullets, ⚠️ on caveats, 📝 on notes, and ✅ on the final answer line.'
                : 'Use the search results as evidence and answer only the asked question. Remove tangential information. Use 💡 on tips, ⚠️ on warnings, 🔑 on key points, and ✅ on the final answer line.',
              responseMode: outputMode,
              detailLevel: responseStyle.detailLevel,
              citationMode: responseStyle.citationMode,
              languageMode: responseStyle.languageMode
            });

            // Handle different model selections using actualModel
            if (!actualModel || actualModel.modelApi === 'best') {
              return await callBestOption(prompt, generationConfig);
            } else if (actualModel.provider === 'google') {
              return await callGemini(prompt, generationConfig);
            } else if (actualModel.provider === 'openrouter') {
              try {
                return await callOpenRouter(actualModel.modelApi, prompt, generationConfig);
              } catch (openRouterError) {
                console.warn(`⚠️ OpenRouter model ${actualModel.modelApi} failed, falling back to Google Gemini:`, openRouterError.message);
                try {
                  return await callGemini(prompt, generationConfig);
                } catch (geminiError) {
                  console.warn('⚠️ Gemini fallback failed, trying A4F fallback:', geminiError.message);
                  try {
                    return await callA4F('provider-6/qwen3-32b', prompt, generationConfig);
                  } catch (a4fError) {
                    console.warn('⚠️ A4F fallback failed, using best-option fallback:', a4fError.message);
                    return await callBestOption(prompt, generationConfig);
                  }
                }
              }
            } else if (actualModel.provider && actualModel.provider.startsWith('provider-')) {
              // Try A4F with automatic fallback to Gemini on failure
              try {
                // console.log(`🔄 Attempting A4F model: ${actualModel.modelApi}`);
                return await callA4F(actualModel.modelApi, prompt, generationConfig);
              } catch (a4fError) {
                console.warn(`⚠️ A4F model ${actualModel.modelApi} failed, falling back to Google Gemini:`, a4fError.message);
                // Automatic fallback to Google Gemini
                return await callGemini(prompt, generationConfig);
              }
            } else {
              return await callGemini(prompt, generationConfig);
            }
          }
        }
      });

      const refinedAiResp = await step.run('refine-ai-response', async () => {
        if (outputMode === 'research') {
          return refineResearchResp(aiResp);
        }

        const refined = refineAiResp(searchInput, aiResp, {
          responseMode: outputMode,
          detailLevel: responseStyle.detailLevel
        });
        const relevanceScore = calculateRelevanceScore(searchInput, refined);
        if (relevanceScore < 0.2) {
          console.warn('⚠️ Low relevance score after search refinement:', relevanceScore);
        }
        return refined || aiResp;
      });

      const saveToDb = await step.run('saveToDb', async () => {

        // Determine the model info based on content type and creator query
        let modelName, modelApi;

        if (isCreatorQuery(searchInput)) {
          modelName = 'ChatBox AI (Creative Mode)';
          modelApi = 'gemini-creative';
        } else {
          const contentAnalysis = analyzeContentTypes(validSearchResult);

          if (contentAnalysis.hasImages && contentAnalysis.hasDocuments) {
            modelName = actualModel?.name || 'AI Assistant';
            modelApi = actualModel?.modelApi || 'combined-analysis';
          } else if (contentAnalysis.hasImages) {
            modelName = actualModel?.name || 'AI Assistant';
            modelApi = actualModel?.modelApi || 'image-analysis';
          } else if (contentAnalysis.hasDocuments) {
            modelName = actualModel?.name || 'AI Assistant';
            modelApi = actualModel?.modelApi || 'document-analysis';
          } else {
            modelName = actualModel?.name || 'AI Assistant';
            modelApi = actualModel?.modelApi || 'web-search';
          }
        }

        let usedModelName;
        if (!selectedModel || selectedModel.name === 'Best (Auto)' || selectedModel.modelApi === 'best') {
          usedModelName = 'Best';
        } else {
          usedModelName = selectedModel.name;
        }

        let data;
        try {
          data = await databases.updateDocument(DB_ID, CHATS_COLLECTION_ID, recordId, {
            aiResp: refinedAiResp,
            usedModel: usedModelName,
            modelApi: modelApi
          });
        } catch (error) {
          console.error('❌ Database error:', error);
          throw new Error(`Database update failed: ${error.message}`);
        }
        return data;
      });

      return {
        success: true,
        data: saveToDb,
        aiResponseLength: refinedAiResp?.length || 0,
        recordId: recordId
      };

    } catch (error) {
      console.error('❌ LLM Model function error:', error);

      // Save error to database
      await step.run('saveErrorToDb', async () => {
        // console.log('💾 Saving error to database...');

        let errorMessage = `Error: ${error.message}`;

        // Provide more user-friendly error messages
        if (error.message?.includes('API key')) {
          errorMessage = 'AI service configuration error. Please contact support.';
        } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
          errorMessage = 'AI service temporarily unavailable due to high demand. Please try again later.';
        } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
          errorMessage = 'Network error occurred. Please try again.';
        } else if (error.message?.includes('Database')) {
          errorMessage = 'Database error occurred. Please try again.';
        }

        let data;
        try {
          data = await databases.updateDocument(DB_ID, CHATS_COLLECTION_ID, event.data.recordId, { aiResp: errorMessage });
        } catch (dbError) {
          console.error('❌ Failed to save error to database:', dbError);
        }

        return data;
      });

      // Re-throw the error so Inngest marks the function as failed
      throw error;
    }
  }
)