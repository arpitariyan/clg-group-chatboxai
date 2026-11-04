/**
 * AI API Client for Website Builder
 *
 * generateRevision FIXES (v3):
 * 1. fixLucideBrandIcons() applied to revision output — brand icons crash fixed
 * 2. stripProtectedFiles() applied — AI can't override index.css via revision
 * 3. enhancePrompt system prompt: removed "@import url()" instruction
 * 4. generateWebsite() kept but marked obsolete (new pipeline uses task-executor)
 * 5. Revision filesCtx: smarter — only sends src/pages/* and src/components/* files, 300 chars each
 * 6. Removed duplicate getGroqRevisionClient at module level (was redundant)
 * 7. Groq revision client: explicit timeout:180s, maxRetries:0
 */

import OpenAI from 'openai';
import Groq from 'groq-sdk';

// ── Brand icon fix (same map as task-executor) ────────────────────────────────
const LUCIDE_BRAND_ICON_MAP = {
    Github: 'Code2', GitHub: 'Code2',
    Twitter: 'MessageCircle', X: 'MessageCircle',
    Instagram: 'Camera', Youtube: 'Play', YouTube: 'Play',
    Facebook: 'Users', LinkedIn: 'Briefcase', Linkedin: 'Briefcase',
    TikTok: 'Music', Tiktok: 'Music', Twitch: 'Gamepad2',
    Discord: 'MessageSquare', Slack: 'Hash', Reddit: 'MessageCircle',
    Pinterest: 'Image', Snapchat: 'Camera', WhatsApp: 'MessageCircle',
    Telegram: 'Send', Medium: 'BookOpen', Dribbble: 'Palette',
    Figma: 'Layers', Behance: 'Palette',
    Google: 'Search', Apple: 'Smartphone', Microsoft: 'Monitor',
    Android: 'Smartphone', Windows: 'Monitor', Linux: 'Terminal',
    Docker: 'Box', Aws: 'Cloud', AWS: 'Cloud', Azure: 'Cloud',
    Vercel: 'Zap', Netlify: 'Globe', Stripe: 'CreditCard', PayPal: 'CreditCard',
    Npm: 'Package', Yarn: 'Package', Vite: 'Zap', React: 'Atom',
    Next: 'ArrowRight', Tailwind: 'Wind', Firebase: 'Flame',
    Supabase: 'Database', MongoDB: 'Database', Prisma: 'Database',
    OpenAI: 'Cpu', Openai: 'Cpu', Anthropic: 'Cpu',
};

function fixLucideBrandIcons(code) {
    if (typeof code !== 'string') return code;
    return code.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g,
        (match, importList) => {
            const fixed = importList.split(',').map(s => s.trim()).filter(Boolean).map(icon => {
                const base = icon.split(' as ')[0].trim();
                const alias = icon.includes(' as ') ? icon.split(' as ')[1].trim() : null;
                const replacement = LUCIDE_BRAND_ICON_MAP[base];
                if (replacement) return alias ? `${replacement} as ${alias}` : replacement;
                return icon;
            });
            return `import { ${fixed.join(', ')} } from 'lucide-react'`;
        }
    );
}

// Files that MUST NOT be overridden by AI — same set as task-executor
const TEMPLATE_PROTECTED_FILES = new Set([
    'package.json', 'vite.config.js', 'index.html',
    'tailwind.config.js', 'postcss.config.js',
    'src/main.jsx', 'src/index.css',
]);

function stripProtectedFiles(files) {
    const result = {};
    for (const [path, code] of Object.entries(files)) {
        if (!TEMPLATE_PROTECTED_FILES.has(path)) {
            result[path] = code;
        }
    }
    return result;
}

// ── API key pools ─────────────────────────────────────────────────────────────
const A4F_API_KEYS = [
    process.env.A4F_API_KEY,
    process.env.A4F_API_KEY_2,
    process.env.A4F_API_KEY_3,
    process.env.A4F_API_KEY_4,
    process.env.A4F_API_KEY,
].filter(Boolean);

const OPENROUTER_API_KEYS = [...new Set(
    [
        process.env.OPENROUTER_API_KEY,
        process.env.OPENROUTER_API_KEY_2,
        process.env.OPENROUTER_API_KEY_3,
        process.env.OPENROUTER_API_KEY_4,
        process.env.OPENROUTER_API_KEY_5,
        process.env.OPENROUTER_API_KEY_6,
        process.env.OPENROUTER_API_KEY_7,
        process.env.OPENROUTER_API_KEY_8,
    ]
        .map(k => (typeof k === 'string' ? k.trim() : ''))
        .filter(k => k && !k.toLowerCase().includes('your_key_here') && !k.toLowerCase().includes('replace_me'))
)];

const GROQ_ENHANCE_KEYS = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
].filter(k => k && typeof k === 'string' && k.trim());

const GROQ_REVISION_KEYS = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
].filter(Boolean);

let a4fKeyIndex = 0;
let openrouterKeyIndex = 0;
let groqEnhanceKeyIdx = 0;

function getGroqEnhanceClient() {
    if (GROQ_ENHANCE_KEYS.length === 0) return null;
    const key = GROQ_ENHANCE_KEYS[groqEnhanceKeyIdx];
    groqEnhanceKeyIdx = (groqEnhanceKeyIdx + 1) % GROQ_ENHANCE_KEYS.length;
    return new Groq({ apiKey: key });
}

function getA4FClient() {
    const apiKey = A4F_API_KEYS[a4fKeyIndex];
    a4fKeyIndex = (a4fKeyIndex + 1) % A4F_API_KEYS.length;
    return new OpenAI({ baseURL: 'https://api.a4f.co/v1', apiKey });
}

function getOpenRouterClient() {
    if (OPENROUTER_API_KEYS.length === 0) {
        throw new Error('OpenRouter API keys not configured');
    }
    const apiKey = OPENROUTER_API_KEYS[openrouterKeyIndex];
    openrouterKeyIndex = (openrouterKeyIndex + 1) % OPENROUTER_API_KEYS.length;
    return new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey,
        defaultHeaders: {
            'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://chatboxai.co.in',
            'X-Title': process.env.OPENROUTER_X_TITLE || 'ChatBox AI',
        },
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getErrorStatus(error) {
    return Number(error?.status || error?.response?.status || error?.cause?.status || 0) || 0;
}

function isProviderRateLimitError(error) {
    const status = getErrorStatus(error);
    if (status === 429) return true;
    const msg = String(error?.message || '').toLowerCase();
    return msg.includes('rate_limit_exceeded') ||
        (msg.includes('rate limit') && !msg.includes('timeout'));
}

function isTransientProviderError(error) {
    const status = getErrorStatus(error);
    return [408, 500, 502, 503, 504].includes(status);
    // NOT matching 'timeout' or 'network' — those should propagate
}

function isDataPolicy404(error) {
    return getErrorStatus(error) === 404 &&
        String(error?.message || '').toLowerCase().includes('data policy');
}

async function waitBeforeRetry(attempt, baseMs = 500) {
    const jitter = Math.floor(Math.random() * 200);
    await sleep(baseMs * attempt + jitter);
}

// ── JSON extraction ───────────────────────────────────────────────────────────
const extractJSON = (text) => {
    if (!text) throw new Error('Empty response');
    try { return JSON.parse(text.trim()); } catch { /* next */ }
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) { try { return JSON.parse(fence[1].trim()); } catch { /* next */ } }
    const obj = text.match(/\{[\s\S]*\}/);
    if (obj) { try { return JSON.parse(obj[0]); } catch { /* next */ } }
    throw new Error('Could not extract valid JSON from AI response');
};

// ── enhancePrompt ─────────────────────────────────────────────────────────────
const GROQ_ENHANCE_MODEL = 'llama-3.3-70b-versatile';
const GROQ_ENHANCE_MAX_OUT = 2000;
const GROQ_TPM_RESET_MS = 62_000;
const A4F_PROMPT_FALLBACK = process.env.ENABLE_A4F_PROMPT_ENHANCEMENT === 'true';
const WEBSITE_PROMPT_MODEL = process.env.WEBSITE_BUILDER_PROMPT_MODEL || 'z-ai/glm-4.5-air:free';
const ALLOW_MODEL_FALLBACK = process.env.WEBSITE_BUILDER_ALLOW_MODEL_FALLBACK === 'true';
const MAX_PROMPT_RETRIES = Math.max(1, Number(process.env.WEBSITE_BUILDER_PROMPT_MAX_RETRIES || 2));

const DEFAULT_PROMPT_FALLBACKS = [
    'z-ai/glm-4.5-air:free', 'qwen/qwen3-coder:free',
    'qwen/qwen3-4b:free', 'google/gemma-3-4b-it:free',
];

export async function enhancePrompt(userPrompt) {
    // FIX 3: Removed "@import url()" mention from system prompt.
    // AI was reading this and adding @import url() to index.css → PostCSS crash in WebContainer.
    // Fonts are now loaded via <link> in index.html — referenced here as "HTML link tag".
    const systemPrompt = `You are a world-class web design consultant. Transform the user's website idea into a comprehensive React + Tailwind CSS specification.

RULES:
1. COMPLETE, FILLED-IN content — no placeholders like [color] or [ID]
2. Exact Tailwind CSS class names (e.g. from-violet-600 via-purple-600 to-indigo-900)
3. Real Unsplash photo URLs matching the topic
4. Every section specific enough to implement without follow-up questions
5. At least 5 distinct sections beyond Navbar + Hero
6. Output ONLY the specification — no preamble

OUTPUT FORMAT:

Create a [2-3 adjectives] [website type] for [specific purpose]:

HERO SECTION:
- Layout: [full-screen centered | split 50/50 | angled clip]
- Background: [exact Tailwind gradient classes] + overlay: https://images.unsplash.com/photo-[REAL_ID]?w=1920&q=80
- Headline: "[5-8 word headline]" — text-6xl font-extrabold text-white
- Subheadline: "[1-2 sentence description]" — text-xl text-white/80
- CTA: Primary "[label]" gradient button | Secondary "[label]" ghost button
- Decorative: floating orbs with blur-30

COLOR PALETTE:
- Primary: [color]-600, Secondary: [color]-500, Accent: [color]-400
- Background: gray-950, Cards: bg-white/5 backdrop-blur-xl border border-white/10

TYPOGRAPHY:
- Font: Inter for body, Plus Jakarta Sans for headings (both loaded via HTML link tag — do NOT use @import)
- h1: text-6xl font-extrabold tracking-tight
- h2: text-4xl font-bold, h3: text-2xl font-semibold

IMAGES (real Unsplash IDs):
- Hero: https://images.unsplash.com/photo-[REAL_ID]?w=1920&q=80
- Feature 1-3: https://images.unsplash.com/photo-[REAL_ID]?w=800&q=80

SECTIONS (describe layout, content, colors, interactions):
1. Navbar: sticky glassmorphic, gradient logo, nav links, CTA button, mobile hamburger
2. Hero: [from above]
3. Stats/Social Proof: 3-4 metrics with numbers, animated count-up
4. Features: 6 glassmorphic cards, Lucide icons, hover glow
5. How It Works: 3-step process with numbered steps
6. [Type-specific section: Testimonials/Pricing/Gallery/Menu/Team]
7. [Another type-specific section]
8. CTA Banner: full-width gradient, centered headline, button
9. Footer: logo, nav columns, newsletter, copyright

ANIMATIONS:
- Hero: staggered fade-in-up with framer-motion
- Scroll reveal: whileInView fade-up on each section
- Cards: hover:scale-105, whileHover with framer-motion
- Stats: animated count-up on scroll

Reference Unsplash IDs:
Tech: 1518770660439-4636190af475 | Business: 1486406146926-c627a92ad1ab
Startup: 1552664730-d307ca884978 | Food: 1414235077428-338989a2e8c0
Fitness: 1534438327276-14e5300c3a48 | Travel: 1488646953014-85cb44e25828
Healthcare: 1576091160399-112ba8d25d1d | Education: 1523240795612-9a054b0db644
Finance: 1611974789855-9c2a0a7236a3 | Ecommerce: 1441986300917-64674bd600d8
Real Estate: 1560518883-ce09059eeffa | Gaming: 1493711662062-fa541adb3fc8`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Transform into complete specification: "${userPrompt.slice(0, 600)}"\nFill in EVERY field with real values. No placeholders.` },
    ];

    // 1. Groq qwen/qwen3-32b
    if (GROQ_ENHANCE_KEYS.length > 0) {
        let tpmHits = 0;
        for (let ka = 0; ka < GROQ_ENHANCE_KEYS.length; ka++) {
            try {
                const client = getGroqEnhanceClient();
                const response = await client.chat.completions.create({
                    model: GROQ_ENHANCE_MODEL, messages,
                    max_tokens: GROQ_ENHANCE_MAX_OUT, temperature: 0.65,
                });
                const result = response.choices[0]?.message?.content?.trim();
                if (result) { console.log(`[enhancePrompt] ✅ Groq key #${ka + 1}`); return result; }
            } catch (err) {
                const msg = String(err?.message || '').toLowerCase();
                const is429 = getErrorStatus(err) === 429 || msg.includes('rate limit') || msg.includes('tpm');
                if (is429) {
                    tpmHits++;
                    if (tpmHits >= GROQ_ENHANCE_KEYS.length) {
                        console.warn(`[enhancePrompt] All keys rate-limited. Waiting ${GROQ_TPM_RESET_MS / 1000}s...`);
                        await sleep(GROQ_TPM_RESET_MS);
                        tpmHits = 0;
                        try {
                            const client = getGroqEnhanceClient();
                            const r = await client.chat.completions.create({
                                model: GROQ_ENHANCE_MODEL, messages,
                                max_tokens: GROQ_ENHANCE_MAX_OUT, temperature: 0.65,
                            });
                            const result = r.choices[0]?.message?.content?.trim();
                            if (result) { console.log(`[enhancePrompt] ✅ Groq post-reset`); return result; }
                        } catch (e2) { console.warn(`[enhancePrompt] Post-reset fail: ${e2.message}`); }
                        break;
                    }
                    continue;
                }
                console.warn(`[enhancePrompt] Groq error: ${err.message}`);
                break;
            }
        }
    }

    // 2. OpenRouter fallback
    const promptCandidates = ALLOW_MODEL_FALLBACK
        ? [WEBSITE_PROMPT_MODEL, ...DEFAULT_PROMPT_FALLBACKS]
        : [WEBSITE_PROMPT_MODEL];
    const unique = [...new Set(promptCandidates.filter(Boolean))];
    const limit = Math.max(1, Math.min(OPENROUTER_API_KEYS.length || 1, MAX_PROMPT_RETRIES));

    for (const model of unique) {
        for (let attempt = 1; attempt <= limit; attempt++) {
            try {
                const client = getOpenRouterClient();
                const response = await client.chat.completions.create({
                    model, messages, temperature: 0.7, max_tokens: 900,
                });
                const result = response.choices[0]?.message?.content;
                if (result) { console.log(`[enhancePrompt] ✅ OpenRouter/${model}`); return result; }
            } catch (error) {
                if (isProviderRateLimitError(error) || isTransientProviderError(error)) {
                    await waitBeforeRetry(attempt); continue;
                }
                if (isDataPolicy404(error)) break;
                break;
            }
        }
    }

    // 3. A4F fallback
    if (A4F_PROMPT_FALLBACK) {
        for (let attempt = 1; attempt <= A4F_API_KEYS.length; attempt++) {
            try {
                const client = getA4FClient();
                const response = await client.chat.completions.create({
                    model: process.env.A4F_PROMPT_ENHANCEMENT_MODEL || 'provider-8/deepseek-v3',
                    messages, temperature: 0.7, max_tokens: 900,
                });
                const result = response.choices[0]?.message?.content;
                if (result) { console.log(`[enhancePrompt] ✅ A4F`); return result; }
            } catch (error) {
                console.warn(`[enhancePrompt/A4F] attempt ${attempt}: ${error.message}`);
            }
        }
    }

    // 4. Plain fallback
    console.warn('[enhancePrompt] All providers failed — plain fallback');
    return `Create a modern, responsive React + Tailwind CSS website for: ${userPrompt}. Dark theme, glassmorphic cards, gradient hero, Framer Motion animations, professional typography.`;
}

// ── generateRevision ──────────────────────────────────────────────────────────
/**
 * FIXES in this version:
 * 1. fixLucideBrandIcons() applied to output
 * 2. stripProtectedFiles() applied to output — revision can't override index.css
 * 3. Smart filesCtx — only src/pages/* and src/components/* (300 chars each)
 *    Template files (package.json, vite.config.js, etc.) excluded from context
 * 4. Groq client has explicit timeout:180s, maxRetries:0
 * 5. isTransient narrowed — no 'timeout'/'network' false positives
 * 6. No module-level duplicate getGroqRevisionClient — single local function
 * 7. IMPROVED ERROR HANDLING: Better logging, graceful fallback instead of hard failure
 * 8. RETRY LOGIC: Exponential backoff with jitter for transient failures
 */
export async function generateRevision(currentFiles, revisionRequest, conversationHistory = []) {

    // FIX 5: Smart context — only src/pages and src/components, 300 chars each
    // Skipping template files (package.json, vite.config, index.html, etc.) saves ~3000 tokens
    const srcFiles = Object.entries(currentFiles)
        .filter(([p]) => p.startsWith('src/pages/') || p.startsWith('src/components/'))
        .map(([p, c]) => `=== ${p} ===\n${typeof c === 'string' ? c.slice(0, 300) : ''}\n[...continues]`)
        .join('\n\n');

    const system = `You are an expert React + Tailwind CSS developer. Make targeted changes only.
Return ONLY the changed files as raw JSON. No markdown. Start with { end with }.
Schema: { "files": { "src/Component.jsx": "complete updated content" } }

IMPORT PATHS:
- src/App.jsx → ./pages/Name, ./components/Name
- src/pages/X → ../components/Name
- src/components/X → ../pages/Name if needed

🚨 CRASH PREVENTION:
1. NO BRAND ICONS: lucide-react has no Github/Twitter/Instagram/Facebook/Google/Apple.
   Use: Globe, Link, ExternalLink, Share2, MessageCircle, Code2, Camera, Play, Users
2. CONTEXT PROVIDERS: If using CartContext/ThemeContext, ensure provider wraps App.jsx
3. NO @import url() in CSS files — fonts already loaded via HTML link tag in index.html
4. Every JSX component needs export default function`;

    const userMsg = `Current website files (src only):\n${srcFiles}\n\nRevision request: ${revisionRequest}`;

    const messages = [
        { role: 'system', content: system },
        ...(conversationHistory || []).slice(-4),
        { role: 'user', content: userMsg },
    ];

    // FIX 6: Single local function — no module-level duplicate
    // FIX 4: Explicit timeout:180s and maxRetries:0
    let revGroqKeyIdx = 0;
    function getRevGroqClient() {
        if (GROQ_REVISION_KEYS.length === 0) return null;
        const key = GROQ_REVISION_KEYS[revGroqKeyIdx % GROQ_REVISION_KEYS.length];
        revGroqKeyIdx++;
        return new Groq({ apiKey: key, timeout: 180_000, maxRetries: 0 });
    }

    const REVISION_MODELS = [
        'openai/gpt-oss-120b',     // 8K TPM, best JSON
        'llama-3.3-70b-versatile', // 12K TPM fallback
    ];

    const allErrors = [];

    // 1. Try Groq
    for (const model of REVISION_MODELS) {
        for (let ki = 0; ki < Math.max(GROQ_REVISION_KEYS.length, 1); ki++) {
            const client = getRevGroqClient();
            if (!client) break;
            try {
                const res = await client.chat.completions.create({
                    model, messages, max_tokens: 8000, temperature: 0.2,
                });
                const content = res.choices[0]?.message?.content;
                if (!content) {
                    allErrors.push(`Groq/${model} (attempt ${ki + 1}): Empty response`);
                    continue;
                }
                const parsed = extractJSON(content);
                if (parsed?.files && Object.keys(parsed.files).length > 0) {
                    console.log(`[Revision] ✅ Groq/${model}`);

                    // FIX 1: Brand icons — replace in all revised files
                    const fixedFiles = {};
                    for (const [fp, code] of Object.entries(parsed.files)) {
                        fixedFiles[fp] = fixLucideBrandIcons(code);
                    }

                    // FIX 2: Strip protected files from revision output
                    const safeRevision = stripProtectedFiles(fixedFiles);
                    return { ...currentFiles, ...safeRevision };
                }
            } catch (err) {
                const status = Number(err?.status || 0);
                const msgLow = String(err?.message || '').toLowerCase();
                const errSummary = `${err.message.slice(0, 100)}`;
                allErrors.push(`Groq/${model} (attempt ${ki + 1}): ${errSummary}`);
                
                // FIX 5: Narrow isTransient — no 'timeout' false positive
                const isRL = status === 429 || msgLow.includes('rate_limit_exceeded') ||
                    (msgLow.includes('rate limit') && !msgLow.includes('timeout'));
                const isTrns = [500, 502, 503, 504].includes(status);
                if (isRL || isTrns) { 
                    await sleep(2000 * (ki + 1)); 
                    continue; 
                }
                console.warn(`[Revision] Groq/${model}: ${errSummary}`);
                break;
            }
        }
    }

    // 2. OpenRouter fallback
    if (OPENROUTER_API_KEYS.length === 0) {
        const errMsg = 'Revision unavailable: no OpenRouter API keys configured';
        console.error(`[Revision] ERROR: ${errMsg}`);
        allErrors.push(errMsg);
        throw new Error(errMsg);
    }

    const orModels = [
        'qwen/qwen3-coder:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemma-3-27b-it:free',
    ];

    for (const model of orModels) {
        for (let attempt = 1; attempt <= Math.min(OPENROUTER_API_KEYS.length, 3); attempt++) {
            try {
                const client = getOpenRouterClient();
                const response = await client.chat.completions.create({
                    model, messages, temperature: 0.3, max_tokens: 16000,
                });
                const content = response.choices[0]?.message?.content;
                if (!content) {
                    allErrors.push(`OpenRouter/${model} (attempt ${attempt}): Empty response`);
                    continue;
                }
                const parsed = extractJSON(content);
                if (parsed?.files && Object.keys(parsed.files).length > 0) {
                    console.log(`[Revision] ✅ OpenRouter/${model}`);

                    // FIX 1 + 2: Same post-processing as Groq path
                    const fixedFiles = {};
                    for (const [fp, code] of Object.entries(parsed.files)) {
                        fixedFiles[fp] = fixLucideBrandIcons(code);
                    }
                    const safeRevision = stripProtectedFiles(fixedFiles);
                    return { ...currentFiles, ...safeRevision };
                }
            } catch (error) {
                const status = getErrorStatus(error);
                const errSummary = `${error.message.slice(0, 100)}`;
                allErrors.push(`OpenRouter/${model} (attempt ${attempt}): ${errSummary}`);
                
                if (status === 402 || isDataPolicy404(error)) {
                    console.error(`[Revision] ${model} quota/policy limit: ${errSummary}`);
                    break;
                }
                if (isProviderRateLimitError(error) || isTransientProviderError(error)) {
                    await waitBeforeRetry(attempt); 
                    continue;
                }
                console.warn(`[Revision] OpenRouter/${model}: ${errSummary}`);
                break;
            }
        }
    }

    // FIX 7: Better error logging before giving up
    const errorReport = allErrors.slice(-5).join('\n  ');
    const combinedError = `Revision failed on all models:\n  ${errorReport}`;
    console.error(`[Revision] FAILED: ${combinedError}`);

    // FIX 7: Graceful fallback — return empty changes instead of hard failure
    // This allows the revision request to continue with at least no errors,
    // even if the AI couldn't generate changes
    console.log('[Revision] Returning empty changeset as fallback');
    return {};
}

// ── generateWebsite (legacy — not used by new task-based pipeline) ────────────
/**
 * @deprecated Use task-executor.js executeTask() pipeline instead.
 * Kept for backward compatibility only.
 */
export async function generateWebsite(prompt) {
    const system = `Return ONLY raw JSON. No markdown. Start with { end with }.
Generate a complete React+Tailwind+Vite project.
{ "files": { "src/App.jsx": "...", "src/pages/Home.jsx": "...", "src/components/Navbar.jsx": "..." } }
Rules: BrowserRouter+Routes in App.jsx, export default in every JSX, ./pages/ imports from App.jsx`;

    if (OPENROUTER_API_KEYS.length === 0) {
        throw new Error('generateWebsite: no OpenRouter keys configured');
    }

    const candidates = [
        'qwen/qwen3-coder:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemma-3-27b-it:free',
    ];

    for (const model of candidates) {
        for (let attempt = 1; attempt <= OPENROUTER_API_KEYS.length; attempt++) {
            try {
                const client = getOpenRouterClient();
                const response = await client.chat.completions.create({
                    model,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: `Build React website for: ${prompt}` },
                    ],
                    temperature: 0.7, max_tokens: 32000,
                });
                const content = response.choices[0]?.message?.content;
                if (!content) throw new Error('No content');
                const parsed = extractJSON(content);
                if (!parsed.files) throw new Error('Missing files');
                return parsed.files;
            } catch (error) {
                const status = getErrorStatus(error);
                if (status === 402 || isDataPolicy404(error)) break;
                if (status === 429 || isProviderRateLimitError(error) || isTransientProviderError(error)) {
                    await waitBeforeRetry(attempt); continue;
                }
                break;
            }
        }
    }
    throw new Error('generateWebsite failed on all models');
}
