/**
 * Task Executor — Production Grade
 *
 * FIXES for 95-98% error-free preview:
 *
 * FIX 1: LUCIDE ICON CRASH
 *   Brand icons (Github, Twitter, Instagram, Youtube, Facebook, Google, Apple, Discord, Slack, etc.)
 *   do NOT exist in lucide-react@0.383.0. AI loves to import them → instant crash.
 *   Solution: Post-process every generated file and replace brand icons with safe alternatives.
 *
 * FIX 2: CONTEXT PROVIDER MISSING IN APP.JSX
 *   AI generates CartContext/ThemeContext but forgets to wrap App.jsx with <Provider>.
 *   Solution: After all tasks complete, scan for Context files and inject providers into App.jsx.
 *
 * FIX 3: src/index.css OVERRIDE
 *   Template already has index.css with @tailwind. AI override with @import url() = PostCSS crash.
 *   Solution: Strip any AI-generated src/index.css from completedFiles before merge.
 *
 * FIX 4: CONTEXT OVERFLOW IN EXISTINGFILES
 *   Sending full file content of all previous tasks bloats tokens → AI truncates output.
 *   Solution: Smart context — only send filename list, not code (except for App.jsx task).
 *
 * FIX 5: FILE NAME CASE MISMATCH
 *   AI generates Navbar.jsx but imports as NavBar.jsx → crash.
 *   Solution: Normalize all component filenames to PascalCase and fix imports accordingly.
 *
 * FIX 6: GROQ SDK TIMEOUT BUG
 *   SDK default timeout = 60s, causing false "transient" errors.
 *   Solution: Set SDK timeout to 180s, maxRetries: 0, our wrapper at 185s.
 */

import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { findMemoryCache, saveMemoryCache, logGenerationError } from '@/lib/website-builder-server-utils';
import { getTypeConfig, getRequiredCustomComponentsForType } from '@/lib/website-type-configs';
import { getCodeGenerationConstraints, buildConstraintPrompt } from '@/lib/prompt-constraints';
import { 
    initializeKeyManagers, 
    getNextKey, 
    hasAvailableKey,
    recordSuccess, 
    recordFailure, 
    recordRateLimit,
    getHealthReport,
    resetForGeneration,
    markModelDead,
    isModelDead
} from '@/lib/api-key-manager';

// ── Timeouts ──────────────────────────────────────────────────────────────────
const GROQ_CLIENT_TIMEOUT_MS  = 120_000;
const GROQ_CALL_TIMEOUT_MS    = 125_000;
const OR_CALL_TIMEOUT_MS      = 60_000;
const GROQ_TPM_WAIT_MS        = 65_000;
const OPENROUTER_RATE_WAIT_MS = 65_000;
const GROQ_KEY_SWITCH_DELAY_MS = () => 1_000 + Math.floor(Math.random() * 2_000);

// ── Model priority ────────────────────────────────────────────────────────────
const GROQ_MODELS = [
    'qwen/qwen3-32b',
    'llama-3.1-8b-instant', 
    'openai/gpt-oss-20b',
    'gemma2-9b-it',
];

const PRIMARY_MODEL_SEQUENCE = [
    { provider: 'groq', model: 'qwen/qwen3-32b' },
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'groq', model: 'openai/gpt-oss-20b' },
    { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free' },
];

const OPENROUTER_FALLBACKS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'deepseek/deepseek-r1-0528:free',
    'nousresearch/hermes-3-llama-3.1-8b:free',
];

const DETERMINISTIC_MODE_WINDOW_MS = 3 * 60 * 1000;
let deterministicModeUntil = 0;

function isDeterministicModeActive() {
    return false; // Disabled to allow Inngest retries
}

function activateDeterministicMode(reason) {
    // Disabled to allow Inngest retries instead of forcing placeholders
}

// ── API key pools ─────────────────────────────────────────────────────────────
const GROQ_API_KEYS = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
    process.env.GROQ_API_KEY_6,
    process.env.GROQ_API_KEY_7,
    process.env.GROQ_API_KEY_8,
].filter(k => k && typeof k === 'string' && k.trim());

const OPENROUTER_API_KEYS = [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5,
    process.env.OPENROUTER_API_KEY_6,
    process.env.OPENROUTER_API_KEY_7,
    process.env.OPENROUTER_API_KEY_8,
].filter(k => k && typeof k === 'string' && k.trim() && !k.toLowerCase().includes('your_key'));

// ── API Key Manager Initialization ───────────────────────────────────────────
// Initialize on first import
try {
    initializeKeyManagers(GROQ_API_KEYS, OPENROUTER_API_KEYS);
} catch (e) {
    console.warn('Failed to initialize API key manager:', e.message);
}

function getGroqClient(provider = 'groq', taskId = null) {
    if (GROQ_API_KEYS.length === 0) throw new Error('No Groq API keys configured');
    
    const key = getNextKey(provider, taskId);
    if (!key) throw new Error(`[${provider.toUpperCase()}] All API keys exhausted`);
    
    return {
        key,
        client: new Groq({ apiKey: key, timeout: GROQ_CLIENT_TIMEOUT_MS, maxRetries: 0 })
    };
}

function getORClient(provider = 'openrouter', taskId = null) {
    if (OPENROUTER_API_KEYS.length === 0) throw new Error('No OpenRouter API keys configured');
    
    const key = getNextKey(provider, taskId);
    if (!key) throw new Error(`[${provider.toUpperCase()}] All API keys exhausted`);
    
    return {
        key,
        client: new OpenAI({
            baseURL:    'https://openrouter.ai/api/v1',
            apiKey:     key,
            timeout:    OR_CALL_TIMEOUT_MS,
            maxRetries: 0,
            defaultHeaders: {
                'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://chatboxai.co.in',
                'X-Title':      'ChatBox AI Website Builder',
            },
        })
    };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function isRateLimit(err) {
    const status = Number(err?.status || err?.response?.status || 0);
    const msg    = String(err?.message || '').toLowerCase();
    return (
        status === 429 ||
        msg.includes('rate_limit_exceeded') ||
        (msg.includes('rate limit') && !msg.includes('timed out') && !msg.includes('timeout'))
    );
}

function isTransient(err) {
    const status = Number(err?.status || err?.response?.status || 0);
    return [500, 502, 503, 504].includes(status);
    // NOT matching 'timeout', 'network' — those are hard failures
}

function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`[Timed out ${Math.round(ms/1000)}s] ${label}`)), ms);
        promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
}

function extractJSON(text) {
    if (!text) throw new Error('Empty AI response');

    // Step 1: Strip <think> tags
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Step 2: Direct parse try
    try { return JSON.parse(cleaned); } catch { /* next */ }

    // Step 3: Fenced code block
    const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
        try { return JSON.parse(fenced[1].trim()); } catch { /* next */ }
    }

    // Step 4: Extract { ... } block
    const firstBrace = cleaned.indexOf('{');
    const lastBrace  = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const candidate = cleaned.slice(firstBrace, lastBrace + 1);
        try { return JSON.parse(candidate); } catch { /* next — try repair */ }
        
        // Step 5: REPAIR invalid JSON — fix unescaped newlines/quotes inside strings
        let repaired = '';
        try {
            repaired = repairJSON(candidate);
            return JSON.parse(repaired);
        } catch { /* next */ }
        
        // Step 6: JS Eval Fallback — Handles single quotes, trailing commas, and unquoted keys
        try {
            if (!repaired) repaired = repairJSON(candidate);
            return new Function('return (' + repaired + ')')();
        } catch (e) {
            console.warn("[extractJSON] JS Eval fallback failed:", e.message);
        }
    }

    throw new Error('Could not extract valid JSON');
}

// ── JSON Repairer ─────────────────────────────────────────────────────────────
// Fixes unescaped newlines, invalid single quote escapes inside JSON strings, etc.
function repairJSON(text) {
    let result = '';
    let inDoubleString = false;
    let inSingleString = false;
    let inBacktickString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (escaped) {
            // Fix invalid \' inside double-quoted JSON strings (which causes JSON.parse to fail)
            if (ch === "'" && inDoubleString) {
                result = result.slice(0, -1) + "'"; // Remove the backslash
            } else {
                result += ch;
            }
            escaped = false;
            continue;
        }

        if (ch === '\\' && (inDoubleString || inSingleString || inBacktickString)) {
            escaped = true;
            result += ch;
            continue;
        }

        if (ch === '"' && !inSingleString && !inBacktickString) {
            inDoubleString = !inDoubleString;
            result += ch;
            continue;
        }

        if (ch === "'" && !inDoubleString && !inBacktickString) {
            inSingleString = !inSingleString;
            result += ch;
            continue;
        }

        if (ch === '`' && !inDoubleString && !inSingleString) {
            inBacktickString = !inBacktickString;
            result += ch;
            continue;
        }

        if (inDoubleString || inSingleString || inBacktickString) {
            // Fix unescaped control characters inside strings
            if (ch === '\n') { result += '\\n'; continue; }
            if (ch === '\r') { result += '\\r'; continue; }
            if (ch === '\t') { result += '\\t'; continue; }
        }

        result += ch;
    }

    return result;
}

function hasValidFiles(parsed) {
    return parsed?.files && typeof parsed.files === 'object' && Object.keys(parsed.files).length > 0;
}

const REQUIRED_STRUCTURE_FILES = [
    'src/App.jsx',
    'src/lib/utils.js',
    'src/data/siteData.js',
    'src/hooks/useScrollToTop.js',
    'src/context/AppContext.jsx',
];

const KNOWN_EXTERNAL_DEPENDENCIES = new Set([
    'react',
    'react-dom',
    'react-router-dom',
    'framer-motion',
    'lucide-react',
    'clsx',
    'class-variance-authority',
    'tailwind-merge',
    'react-day-picker',
    'react-hook-form',
    '@radix-ui/react-accordion',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-aspect-ratio',
    '@radix-ui/react-avatar',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-collapsible',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-hover-card',
    '@radix-ui/react-label',
    '@radix-ui/react-menubar',
    '@radix-ui/react-popover',
    '@radix-ui/react-progress',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-select',
    '@radix-ui/react-separator',
    '@radix-ui/react-slot',
    '@radix-ui/react-switch',
    '@radix-ui/react-tabs',
    '@radix-ui/react-tooltip',
]);

// ── FIX 1: LUCIDE BRAND ICON REPLACEMENT ─────────────────────────────────────
/**
 * lucide-react@0.383.0 does NOT have brand icons.
 * AI constantly imports: Github, Twitter, Instagram, Youtube, Facebook, Google,
 * Apple, Discord, Slack, LinkedIn, TikTok, Twitch, Spotify, etc.
 * These MUST be replaced before the code reaches WebContainer.
 */
const LUCIDE_BRAND_ICON_MAP = {
    // Social media brands
    'Github':    'Code2',
    'GitHub':    'Code2',
    'Twitter':   'MessageCircle',
    'X':         'MessageCircle',
    'Instagram': 'Camera',
    'Youtube':   'Play',
    'YouTube':   'Play',
    'Facebook':  'Users',
    'LinkedIn':  'Briefcase',
    'Linkedin':  'Briefcase',
    'TikTok':    'Music',
    'Tiktok':    'Music',
    'Twitch':    'Gamepad2',
    'Discord':   'MessageSquare',
    'Slack':     'Hash',
    'Reddit':    'MessageCircle',
    'Pinterest': 'Image',
    'Snapchat':  'Camera',
    'WhatsApp':  'MessageCircle',
    'Telegram':  'Send',
    'Medium':    'BookOpen',
    'Dribbble':  'Palette',
    'Figma':     'Layers',
    'Behance':   'Palette',
    // Tech brands
    'Google':    'Search',
    'Apple':     'Smartphone',
    'Microsoft': 'Monitor',
    'Android':   'Smartphone',
    'Windows':   'Monitor',
    'Linux':     'Terminal',
    'Docker':    'Box',
    'Kubernetes':'Server',
    'Aws':       'Cloud',
    'AWS':       'Cloud',
    'Azure':     'Cloud',
    'Vercel':    'Zap',
    'Netlify':   'Globe',
    'Stripe':    'CreditCard',
    'PayPal':    'CreditCard',
    // Others commonly hallucinated
    'Npm':       'Package',
    'Yarn':      'Package',
    'Webpack':   'Package',
    'Vite':      'Zap',
    'React':     'Atom',
    'Vue':       'Triangle',
    'Angular':   'Triangle',
    'Svelte':    'Flame',
    'Next':      'ArrowRight',
    'Nuxt':      'ArrowRight',
    'Tailwind':  'Wind',
    'Bootstrap': 'Layout',
    'Sass':      'Palette',
    'GraphQL':   'Share2',
    'MongoDB':   'Database',
    'Postgres':  'Database',
    'Redis':     'Database',
    'Firebase':  'Flame',
    'Supabase':  'Database',
    'Prisma':    'Database',
    'Openai':    'Cpu',
    'OpenAI':    'Cpu',
    'Anthropic': 'Cpu',
    'Huggingface':'Brain',
};

function fixLucideBrandIcons(code) {
    if (typeof code !== 'string') return code;

    // Pattern: import { ..., Github, ..., Twitter, ... } from 'lucide-react'
    return code.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g,
        (match, importList) => {
            const icons = importList.split(',').map(s => s.trim()).filter(Boolean);
            const fixed = icons.map(icon => {
                // Handle aliased imports: "Github as GithubIcon"
                const baseName = icon.split(' as ')[0].trim();
                const alias    = icon.includes(' as ') ? icon.split(' as ')[1].trim() : null;
                const replacement = LUCIDE_BRAND_ICON_MAP[baseName];

                if (replacement) {
                    return alias ? `${replacement} as ${alias}` : replacement;
                }
                return icon;
            });
            return `import { ${fixed.join(', ')} } from 'lucide-react'`;
        }
    );
}

// ── FIX 6: NAMED → DEFAULT IMPORT FIX ────────────────────────────────────────
/**
 * Fixes named imports of custom components to default imports.
 * Model generates: import { Navbar } from '../components/Navbar'
 * Should be:       import Navbar from '../components/Navbar'
 *
 * Rule: Custom components (PascalCase, in ./components/ or ../components/)
 * always use default exports — so their imports must be default imports.
 *
 * Does NOT touch:
 * - @/components/ui/* (shadcn named exports)
 * - lucide-react (named exports)
 * - External packages (react, framer-motion etc)
 * - Multi-export imports like: import { useState, useEffect } from 'react'
 */
function fixNamedComponentImports(code) {
    if (typeof code !== 'string') return code;

    return code.replace(
        /import\s*\{\s*([A-Z][A-Za-z0-9]*)\s*\}\s*from\s*(["'])((?:\.\/|\.\.\/)[^"']*)\2/g,
        (match, compName, quote, importPath) => {
            // Skip shadcn UI imports
            if (importPath.includes('/ui/')) return match;
            // Skip if it looks like a hook (starts with 'use')
            if (compName.startsWith('use')) return match;
            // This is a custom component — fix to default import
            return `import ${compName} from ${quote}${importPath}${quote}`;
        }
    );
}

// ── FIX 2: CONTEXT PROVIDER AUTO-INJECT INTO APP.JSX ─────────────────────────
/**
 * Scans all generated files for Context exports (CartProvider, ThemeProvider, etc.)
 * and ensures App.jsx wraps its content with them.
 * Without this, useCart() / useTheme() crash immediately.
 */
function injectContextProviders(files) {
    const appPath = 'src/App.jsx';
    if (!files[appPath]) return files;

    const contextProviders = [];

    for (const [filePath, code] of Object.entries(files)) {
        if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) continue;
        if (!code || typeof code !== 'string') continue;

        const providerMatches = code.match(/export\s+(?:function|const|class)\s+(\w+Provider)/g) || [];
        const namedExportMatches = code.match(/export\s*\{[^}]*(\w+Provider)[^}]*\}/g) || [];

        for (const match of [...providerMatches, ...namedExportMatches]) {
            const nameMatch = match.match(/(\w+Provider)/);
            if (nameMatch) {
                const providerName = nameMatch[1];
                const relPath = filePath
                    .replace('src/', './')
                    .replace(/\.jsx?$/, '');
                contextProviders.push({ name: providerName, path: relPath });
            }
        }
    }

    if (contextProviders.length === 0) return files;

    let appCode = files[appPath];

    for (const { name, path } of contextProviders) {
        if (!appCode.includes(name)) {
            appCode = `import { ${name} } from '${path}'\n` + appCode;
        }
    }

    for (const { name } of contextProviders) {
        if (appCode.includes(`<${name}>`) || appCode.includes(`<${name} `)) continue;

        appCode = appCode.replace(
            /return\s*\(\s*(<BrowserRouter|<Router|<div|<React\.Fragment|<>)/,
            (match, opening) => {
                return `return (\n    <${name}>\n      ${match.replace('return (', '').trim()}`;
            }
        );
        appCode = appCode.replace(/(\s*\)\s*;\s*}\s*)$/, `\n    </${name}>\n  );\n}`);
    }

    return { ...files, [appPath]: appCode };
}

// ── FIX 3: STRIP PROTECTED FILES FROM AI OUTPUT ───────────────────────────────
/**
 * These files are provided by the Vite template and MUST NOT be overridden by AI.
 * AI-generated versions of these (especially index.css with @import url) cause crashes.
 */
const TEMPLATE_PROTECTED_FILES = new Set([
    'package.json',
    'vite.config.js',
    'index.html',
    'tailwind.config.js',
    'postcss.config.js',
    'src/main.jsx',
    'src/index.css',  // Critical: AI @import url() breaks PostCSS in WebContainer
]);

function stripProtectedFiles(files) {
    const result = {};
    for (const [path, code] of Object.entries(files)) {
        if (path.startsWith('src/components/ui/')) {
            console.log(`[Sanitize] Stripped global UI file from AI output: ${path}`);
            continue;
        }

        if (!TEMPLATE_PROTECTED_FILES.has(path)) {
            result[path] = code;
        } else {
            console.log(`[Sanitize] Stripped protected file: ${path}`);
        }
    }
    return result;
}

// ── FIX 5: NORMALIZE FILE NAMES & FIX IMPORT CASE MISMATCHES ─────────────────
/**
 * AI sometimes generates "NavBar.jsx" but imports it as "Navbar".
 * This function normalizes all component names and fixes cross-references.
 */
function normalizeFileNames(files) {
    const normalized = {};
    const nameMapping = {};

    for (const [filePath, code] of Object.entries(files)) {
        if (filePath.startsWith('src/components/ui/')) {
            const dir      = filePath.substring(0, filePath.lastIndexOf('/') + 1);
            const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            const base     = fileName.replace(/\.(jsx?|tsx?)$/, '');
            const ext      = fileName.match(/\.(jsx?|tsx?)$/)?.[0] || '.jsx';
            const kebab    = base
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .replace(/\s+/g, '-')
                .toLowerCase();
            const newPath = `${dir}${kebab}${ext}`;

            if (newPath !== filePath) {
                nameMapping[filePath] = newPath;
                console.log(`[Normalize] ${filePath} → ${newPath}`);
            }
            normalized[newPath] = code;
        } else if (filePath.startsWith('src/components/') || filePath.startsWith('src/pages/') || filePath.startsWith('src/context/')) {
            const dir      = filePath.substring(0, filePath.lastIndexOf('/') + 1);
            const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            const base     = fileName.replace(/\.(jsx?|tsx?)$/, '');
            const ext      = fileName.match(/\.(jsx?|tsx?)$/)?.[0] || '.jsx';

            const pascal = base.charAt(0).toUpperCase() + base.slice(1);
            const newPath = `${dir}${pascal}${ext}`;

            if (newPath !== filePath) {
                nameMapping[filePath] = newPath;
                console.log(`[Normalize] ${filePath} → ${newPath}`);
            }
            normalized[newPath] = code;
        } else {
            normalized[filePath] = code;
        }
    }

    if (Object.keys(nameMapping).length === 0) return normalized;

    const result = {};
    for (const [filePath, code] of Object.entries(normalized)) {
        if (typeof code !== 'string') { result[filePath] = code; continue; }

        let fixed = code;
        for (const [oldPath, newPath] of Object.entries(nameMapping)) {
            const oldName = oldPath.replace(/.*\//, '').replace(/\.(jsx?|tsx?)$/, '');
            const newName = newPath.replace(/.*\//, '').replace(/\.(jsx?|tsx?)$/, '');
            if (oldName !== newName) {
                const escapedOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                fixed = fixed.replace(
                    new RegExp(`(['"/])${escapedOld}(['"/])`, 'g'),
                    `$1${newName}$2`
                );
            }
        }
        result[filePath] = fixed;
    }
    return result;
}

// ── FIX 4: SMART CONTEXT BUILDER (prevent token overflow) ─────────────────────
/**
 * Instead of sending full code of all previous files (which overflows context),
 * send only what this specific task actually needs:
 * - App.jsx task: only filenames (no code) — it just needs to know what to import
 * - Page tasks: only Navbar + Footer (first 300 chars each) as style reference
 * - Component tasks: only list of built component names (no code)
 */
function buildSmartContext(task, existingFiles) {
    const existingKeys = Object.keys(existingFiles);
    if (existingKeys.length === 0) return '';

    const isAppJsx = task.files.includes('src/App.jsx');
    const isPage   = task.files.some(f => f.startsWith('src/pages/'));

    if (isAppJsx) {
        const components = existingKeys
            .filter(f => f.startsWith('src/components/') && !f.startsWith('src/components/ui/'))
            .map(f => f.replace('src/components/', '').replace(/\.(jsx?|tsx?)$/, ''));
        const uiComponents = existingKeys
            .filter(f => f.startsWith('src/components/ui/'))
            .map(f => f.replace('src/components/ui/', '').replace(/\.(jsx?|tsx?)$/, ''));
        const pages = existingKeys
            .filter(f => f.startsWith('src/pages/'))
            .map(f => f.replace('src/pages/', '').replace(/\.(jsx?|tsx?)$/, ''));
        const contexts = existingKeys
            .filter(f => f.startsWith('src/context/'))
            .map(f => f.replace('src/context/', '').replace(/\.(jsx?|tsx?)$/, ''));

        return `
COMPONENTS TO IMPORT (from ./components/NAME):
${components.map(c => `  - ${c}`).join('\n')}

UI COMPONENTS AVAILABLE (from ./components/ui/name):
${uiComponents.map(c => `  - ${c}`).join('\n')}

CONTEXT FILES AVAILABLE (from ./context/NAME):
${contexts.map(c => `  - ${c}`).join('\n')}

PAGES TO IMPORT (from ./pages/NAME):
${pages.map(p => `  - ${p}`).join('\n')}

IMPORT RULE: App.jsx uses ./ prefix — NEVER ../ from App.jsx
`;
    }

    if (isPage) {
        const layoutRef = ['src/components/Navbar.jsx', 'src/components/Footer.jsx']
            .filter(f => existingFiles[f])
            .map(f => `// ${f} (first 300 chars):\n${String(existingFiles[f]).slice(0, 300)}`)
            .join('\n\n');

        return layoutRef
            ? `\nLAYOUT REFERENCE (match design style):\n${layoutRef}\n`
            : '';
    }

    const built = existingKeys
        .filter(f => f.startsWith('src/components/') && !f.startsWith('src/components/ui/'))
        .map(f => f.replace('src/components/', '').replace(/\.(jsx?|tsx?)$/, ''));
    const builtUi = existingKeys
        .filter(f => f.startsWith('src/components/ui/'))
        .map(f => f.replace('src/components/ui/', '').replace(/\.(jsx?|tsx?)$/, ''));

    return (built.length > 0 || builtUi.length > 0)
        ? `\nALREADY BUILT CUSTOM COMPONENTS: ${built.join(', ') || 'none'}\nALREADY BUILT UI COMPONENTS: ${builtUi.join(', ') || 'none'}\n`
        : '';
}

// ── System Prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
    const basePrompt = `You are a world-class React + Tailwind CSS + Framer Motion developer building premium websites.

OUTPUT: Return ONLY raw JSON: { "files": { "filePath": "complete file content" } }
No markdown, no backticks, no explanation. Start with { end with }.

⛔ NEVER GENERATE THESE FILES (pre-configured by template — your version WILL CRASH):
- package.json, vite.config.js, index.html, tailwind.config.js, postcss.config.js
- src/main.jsx, src/index.css
- ANY UI component files (button.jsx, card.jsx, dialog.jsx, form.jsx, etc.)
ONLY generate project files under:
- src/App.jsx
- src/pages/*
- src/components/* (custom components only — NOT ui primitives)
- src/context/*
- src/data/*
- src/hooks/*
- src/lib/*

═══════════════════════════════════════════════════════════════════════════════
🎯 UI COMPONENTS LIBRARY — IMPORT ONLY, NEVER GENERATE
═══════════════════════════════════════════════════════════════════════════════
The project includes a complete, pre-built GLOBAL UI component library. DO NOT generate new UI components.
Instead, IMPORT and USE from '@/components/ui/':

Available UI Primitives (ALWAYS USE THESE, NEVER GENERATE):
✅ Button, Card, Input, Label, Select, Dialog, AlertDialog
✅ Textarea, Checkbox, RadioGroup, Switch, Tabs, Accordion  
✅ Breadcrumb, Badge, Progress, Skeleton, Tooltip, Popover
✅ DropdownMenu, Sheet, Sidebar, Calendar, Avatar, AspectRatio
✅ AssertAlert, Form, Table, ScrollArea, Hover-Card, Collapsible
✅ Separator, MenuBar, Alert

IMPORT EXAMPLES:
❌ WRONG: function MyButton() { return <button className="...">Click</button> }
✅ RIGHT: import { Button } from '@/components/ui/button'
         export default function MyButton() { return <Button>Click</Button> }

Custom Components (CAN generate these):
- Page layouts: pages/Home.jsx, pages/About.jsx, pages/Pricing.jsx
- Feature components: components/Navbar.jsx, components/Hero.jsx, components/Footer.jsx
- Data displays: components/ProductCard.jsx, components/BlogPost.jsx, components/Team.jsx
- Forms: components/ContactForm.jsx, components/SignupForm.jsx
- Context providers: context/CartContext.jsx, context/ThemeContext.jsx

COMPOSITION PATTERN (Best Practice):
Instead of creating a new Button component, compose using the UI Button:
import { Button } from '@/components/ui/button'
export function MyCustomButton() {
  return <Button size="lg" className="custom-styling">Action</Button>
}

DO NOT CREATE NEW UI COMPONENT FILES.
If a needed primitive is missing, compose using existing primitives in regular feature components.
═══════════════════════════════════════════════════════════════════════════════

🚨 CRASH PREVENTION RULES — MANDATORY:

RULE 1 — LUCIDE ICONS:
lucide-react@0.383.0 has NO brand icons. These DO NOT EXIST and WILL CRASH:
❌ Github, Twitter, Instagram, Youtube, Facebook, LinkedIn, Google, Apple,
   Discord, Slack, TikTok, Pinterest, Reddit, WhatsApp, Telegram, Medium,
   Dribbble, Figma, Behance, Stripe, PayPal, AWS, Docker, React, Next, Vite
USE THESE INSTEAD:
✅ For social: ExternalLink, Link, Globe, Share2, MessageCircle, Send, Hash
✅ For tech: Code2, Terminal, Package, Server, Cloud, Cpu, Database, Zap, Atom
✅ For payments: CreditCard, Wallet, DollarSign
Safe icons: Star, Heart, Home, User, Users, Mail, Phone, MapPin, Calendar,
Clock, Check, X, ChevronDown, ChevronRight, ArrowRight, Search, Menu, Shield,
Lock, Unlock, Eye, EyeOff, Settings, Bell, Bookmark, Tag, Plus, Minus,
Upload, Download, Edit, Trash2, Copy, RefreshCw, Loader2, AlertCircle,
Info, HelpCircle, Play, Pause, SkipForward, Volume2, Image, Camera, Film,
FileText, Folder, Code, Monitor, Smartphone, Tablet, Wifi, Battery,
Sun, Moon, CloudRain, Wind, Flame, Leaf, Zap, Activity, TrendingUp,
ShoppingCart, Package, Truck, CreditCard, DollarSign, BarChart2, PieChart

RULE 2 — CONTEXT PROVIDERS:
If you create CartProvider, ThemeProvider, AuthProvider, or any React Context:
WRAP App.jsx with <CartProvider><...rest...</CartProvider>
NEVER leave hooks like useCart() without their Provider — instant crash!

RULE 3 — EXPORT DEFAULT:
Every JSX component MUST have: export default function ComponentName() { ... }
Without export default, React Router will crash trying to render it.

RULE 4 — IMPORT PATHS (CRITICAL):
- src/App.jsx → import from './pages/Name', './components/Name', './components/ui/name', './context/Name' (NEVER ../)
- src/pages/* → import from '../components/Name', '../components/ui/name', '../context/Name', '../data/file', '../hooks/hook'
- src/components/* → import ui primitives from './ui/name'
- src/components/ui/* → import { cn } from '../../lib/utils'
- Use JavaScript files only: .jsx for React components and .js for utilities/hooks/data

RULE 5 — NO EXTERNAL CSS IMPORTS:
NEVER use @import url() in any CSS. Google Fonts are ALREADY loaded in index.html.
Just use font-family: 'Inter', 'Plus Jakarta Sans', sans-serif directly.

━━━ DESIGN REQUIREMENTS ━━━

DARK THEME: bg-gray-950 (#0a0a0f) base, bg-gray-900 surfaces
GLASSMORPHISM: bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl
GRADIENT TEXT: bg-linear-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent
GRADIENT BG: bg-linear-to-br from-violet-950 via-gray-950 to-indigo-950
BUTTONS Primary: px-6 py-3 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 text-white
NAVBAR: fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50
ANIMATIONS: Always use framer-motion — motion.div whileInView whileHover variants
IMAGES: Real Unsplash URLs only. NEVER placeholder.com or picsum.photos`;

    // ✨ NEW: Inject code generation constraints
    const constraints = getCodeGenerationConstraints();
    const constraintAddendum = `

━━━ ADDITIONAL CODE GENERATION CONSTRAINTS ━━━

${constraints.slice(0, 8).map((c, idx) => `${idx + 1}. **${c.rule}**\n   ${c.description}`).join('\n\n')}

Follow ALL constraints strictly to prevent errors.`;

    return basePrompt + constraintAddendum;
}

function truncatePRDForPrompt(prd, maxChars = 800) {
    return {
        websiteType: prd.websiteType,
        projectName: prd.projectName,
        description: (prd.description || '').slice(0, maxChars),
        pages: (prd.pages || []).map(p => ({ name: p.name, route: p.route })),
        components: (prd.components || []).map(c => c.name || c),
        designSystem: {
            primaryColor: prd.designSystem?.primaryColor || 'violet',
            theme: 'dark'
        }
    };
}

function buildUserPrompt(task, prd, existingFiles) {
    const trimmedPrd = truncatePRDForPrompt(prd);
    const primaryColor = trimmedPrd.designSystem?.primaryColor || 'violet';
    const websiteType  = trimmedPrd.websiteType || 'generic';
    const typeConfig   = getTypeConfig(websiteType);
    const typeImages   = typeConfig.images || {};
    const heroImg      = typeImages.hero || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=85&auto=format&fit=crop';
    const typeAddendum = typeConfig.systemPromptAddendum || '';

    const smartCtx = buildSmartContext(task, existingFiles);

    return `WEBSITE TYPE: ${websiteType.toUpperCase()} — ${trimmedPrd.projectName}
DESCRIPTION: ${trimmedPrd.description || ''}
PRIMARY COLOR: ${primaryColor} | THEME: dark glassmorphic | FONTS: Inter, Plus Jakarta Sans (already loaded in index.html)
ALL PAGES: ${trimmedPrd.pages?.map(p => `${p.name}(${p.route})`).join(', ')}
ALL COMPONENTS: ${trimmedPrd.components?.join(', ')}
HERO IMAGE: ${heroImg}
${smartCtx}
━━━ NOW BUILD TASK ${task.id}: ${task.title} ━━━
${task.description}

CREATE EXACTLY THESE FILE(S) — no more, no less:
${task.files.map(f => `  • ${f}`).join('\n')}

REQUIREMENTS:
- Framer Motion: motion.div with whileInView={{ opacity:1, y:0 }} initial={{ opacity:0, y:30 }} on every section
- Real Unsplash images (never placeholder.com)
- All text content must be realistic for a ${websiteType} website (no lorem ipsum)
- Glassmorphic cards: bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl
- Gradient headline text using bg-clip-text text-transparent
- Use ONLY safe Lucide icons (see system rules — NO brand icons)
- Prefer composing page/component UIs with reusable primitives from src/components/ui
- Use data from src/data and shared state from src/context/src/hooks when relevant
${task.files.includes('src/App.jsx') ? `⚡ ROUTING RULES FOR App.jsx:
  1. Import from react-router-dom: { BrowserRouter, Routes, Route }
    2. Import Navbar and Footer: from './components/Navbar' and './components/Footer'
    3. Also import and connect: ScrollToTop, PageTransition, FloatingButtons, AppProvider
    4. Structure: <AppProvider> → <BrowserRouter> → <ScrollToTop /> → <Navbar /> → <PageTransition><Routes>[routes]</Routes></PageTransition> → <FloatingButtons /> → <Footer />
  4. ALL routes use ./ prefix for imports (./pages/PageName, ./components/ComponentName)
  5. Route syntax: <Route path="/path" element={<ComponentName />} />
  6. ALWAYS include catch-all route LAST: <Route path="*" element={null} />
  7. This prevents undefined paths from showing "404 - Page Not Found" errors
  8. Export as: export default function App() { ... }
  9. Wrap with Context Providers if needed (CartProvider, ThemeProvider, etc.)
    10. NO business logic in App — only composition and routing` : ''}
${task.files.some(f => f.startsWith('src/pages/')) ? '⚡ Pages: import components via ../components/Name (../ prefix)' : ''}
${typeAddendum ? `\nTYPE-SPECIFIC: ${typeAddendum}` : ''}

Return: { "files": { "path": "100% complete file content" } }`;
}

// ── Task-scoped validation ────────────────────────────────────────────────────
function validateTaskFiles(taskFiles, task) {
    const errors = [];

    for (const f of task.files) {
        if (!taskFiles[f]) errors.push(`MISSING_FILE: ${f}`);
    }

    for (const [fp, code] of Object.entries(taskFiles)) {
        if (!fp.endsWith('.jsx') && !fp.endsWith('.tsx')) continue;
        if (typeof code !== 'string') continue;
        if (!code.includes('export default')) {
            errors.push(`SYNTAX: ${fp} missing export default`);
        }
    }

    return { valid: errors.length === 0, errors };
}

function classifyError(msg) {
    const t = String(msg || '').toUpperCase();
    
    // Original categories
    if (t.startsWith('MISSING_FILE')) return 'MISSING_FILE';
    if (t.startsWith('SYNTAX'))       return 'SYNTAX';
    
    // Enhanced categories for better auto-fix
    if (t.includes('DOES NOT PROVIDE AN EXPORT NAMED') || t.includes('IS NOT A VALID EXPORT')) {
        return 'INVALID_EXPORT';
    }
    
    if (t.includes('MUST BE USED WITHIN') || t.includes('HOOK MUST BE') || t.includes('PROVIDER')) {
        return 'MISSING_PROVIDER';
    }
    
    if (t.includes('MODULE NOT FOUND') || t.includes('CANNOT FIND MODULE') || t.includes('IS NOT DEFINED')) {
        return 'IMPORT_ERROR';
    }
    
    if (t.includes('SYNTAX ERROR') || t.includes('UNEXPECTED TOKEN')) {
        return 'SYNTAX_ERROR';
    }
    
    return 'IMPORT';
}

function isFixerWorthy(errors) {
    return errors.some(e => {
        const type = classifyError(e);
        return ['SYNTAX', 'MISSING_FILE', 'INVALID_EXPORT', 'MISSING_PROVIDER', 'IMPORT_ERROR'].includes(type);
    });
}

function classifyValidationSeverity(message) {
    const t = String(message || '').toUpperCase();
    if (
        t.includes('MISSING SRC/APP.JSX') ||
        t.includes('NO PAGE COMPONENTS GENERATED') ||
        t.includes('MISSING EXPORT DEFAULT') ||
        t.includes('IMPORT ERROR IN') ||
        t.includes('MISSING REQUIRED FILE') ||
        t.includes('MISSING REQUIRED UI COMPONENT') ||
        t.includes('MISSING REQUIRED CUSTOM COMPONENT') ||
        t.includes('UNKNOWN EXTERNAL DEPENDENCY')
    ) {
        return 'critical';
    }
    if (t.includes('AUTO-FIXED') || t.includes('REMOVED @IMPORT')) {
        return 'warning';
    }
    return 'warning';
}

// ── Try one Groq model with smart key rotation ―――――――――――――――――――――――――――――――
async function tryGroqModel(model, messages, taskId) {
    const maxAttempts = GROQ_API_KEYS.length;
    let attemptCount = 0;
    let outputFormatFailures = 0;

    while (attemptCount < maxAttempts) {
        attemptCount++;
        
        let clientInfo;
        try {
            clientInfo = getGroqClient('groq', taskId);
        } catch (e) {
            console.error(`[Task ${taskId}] ❌ No available Groq keys: ${e.message}`);
            return null;
        }

        const { key, client } = clientInfo;
        const keyNum = GROQ_API_KEYS.indexOf(key) + 1;
        
        console.log(`[Task ${taskId}] 🚀 Groq/${model} Key #${keyNum}/${GROQ_API_KEYS.length} (attempt ${attemptCount})`);
        
        try {
            const res = await withTimeout(
                client.chat.completions.create({ model, messages, max_tokens: 8000, temperature: 0.15 }),
                GROQ_CALL_TIMEOUT_MS,
                `Groq/${model} Key #${keyNum} task ${taskId}`
            );
            
            const content = res.choices[0]?.message?.content;
            console.log(`[Task ${taskId}] RAW RESPONSE FIRST 500 CHARS:`, content?.slice(0, 500));
            if (!content) {
                console.warn(`[Task ${taskId}] Empty response, trying next key`);
                outputFormatFailures++;
                await sleep(GROQ_KEY_SWITCH_DELAY_MS());
                if (outputFormatFailures >= 2) {
                    console.warn(`[Task ${taskId}] Groq/${model} output was repeatedly empty. Switching provider/model.`);
                    return null;
                }
                continue;
            }

            let parsed;
            try {
                parsed = extractJSON(content);
            } catch {
                outputFormatFailures++;
                console.warn(`[Task ${taskId}] Groq/${model} returned non-JSON output (attempt ${outputFormatFailures}). Rotating.`);
                await sleep(GROQ_KEY_SWITCH_DELAY_MS());
                if (outputFormatFailures >= 2) {
                    console.warn(`[Task ${taskId}] Groq/${model} repeatedly returned non-JSON output. Switching provider/model.`);
                    return null;
                }
                continue;
            }

            if (!hasValidFiles(parsed)) {
                outputFormatFailures++;
                console.warn(`[Task ${taskId}] Invalid files payload, trying next key`);
                await sleep(GROQ_KEY_SWITCH_DELAY_MS());
                if (outputFormatFailures >= 2) {
                    console.warn(`[Task ${taskId}] Groq/${model} repeatedly returned invalid file payload. Switching provider/model.`);
                    return null;
                }
                continue;
            }

            console.log(`[Task ${taskId}] ✅ Groq/${model} Key #${keyNum} — SUCCESS`);
            recordSuccess('groq', key);
            return parsed.files;

        } catch (err) {
            const status = Number(err?.status || err?.response?.status || 0);
            const errMsg = err.message || '';
            
            // Rate limit: cool down this key and rotate immediately.
            // Waiting here causes very long task stalls when multiple keys are throttled.
            if (isRateLimit(err)) {
                recordRateLimit('groq', key, GROQ_TPM_WAIT_MS);
                console.log(`[Task ${taskId}] 429 Rate Limited on Key #${keyNum}. Rotating to next key/provider...`);
                await sleep(2000);
                continue;
            } else if (isTransient(err)) {
                const delayMs = 3000 * attemptCount;
                console.warn(`[Task ${taskId}] Transient error on Key #${keyNum}. Retrying after ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            
            // Hard failure: Move to next key
            console.warn(`[Task ${taskId}] ❌ Key #${keyNum} hard fail: ${errMsg.slice(0, 80)}`);
            recordFailure('groq', key, errMsg);
            await sleep(GROQ_KEY_SWITCH_DELAY_MS());
        }
    }
    
    console.warn(`[Task ${taskId}] ❌ Exhausted all ${GROQ_API_KEYS.length} Groq keys`);
    // FIX #10b: Only activate deterministicMode when BOTH providers have no available keys.
    // Activating it just because Groq is saturated is too aggressive — OpenRouter may still work.
    if (!hasAvailableKey('groq') && !hasAvailableKey('openrouter')) {
        activateDeterministicMode('All provider keys exhausted/rate-limited');
    }
    return null;
}

// ── Try one OpenRouter model with smart key rotation ――――――――――――――――――――――――――
async function tryOpenRouterModel(model, messages, taskId) {
    const maxAttempts = OPENROUTER_API_KEYS.length;
    let attemptCount = 0;
    let outputFormatFailures = 0;

    while (attemptCount < maxAttempts) {
        attemptCount++;
        
        let clientInfo;
        try {
            clientInfo = getORClient('openrouter', taskId);
        } catch (e) {
            console.error(`[Task ${taskId}] ❌ No available OpenRouter keys: ${e.message}`);
            return null;
        }

        const { key, client } = clientInfo;
        const keyNum = OPENROUTER_API_KEYS.indexOf(key) + 1;
        
        console.log(`[Task ${taskId}] 🌐 OpenRouter/${model} Key #${keyNum}/${OPENROUTER_API_KEYS.length} (attempt ${attemptCount})`);
        
        try {
            const res = await withTimeout(
                client.chat.completions.create({ model, messages, max_tokens: 16000, temperature: 0.15 }),
                OR_CALL_TIMEOUT_MS,
                `OpenRouter/${model} Key #${keyNum} task ${taskId}`
            );
            
            const content = res.choices[0]?.message?.content;
            if (!content) {
                console.warn(`[Task ${taskId}] Empty response from OpenRouter, trying next key`);
                outputFormatFailures++;
                if (outputFormatFailures >= 2) {
                    console.warn(`[Task ${taskId}] OpenRouter/${model} output was repeatedly empty. Switching provider/model.`);
                    return null;
                }
                continue;
            }

            let parsed;
            try {
                parsed = extractJSON(content);
            } catch {
                outputFormatFailures++;
                console.warn(`[Task ${taskId}] OpenRouter/${model} returned non-JSON output (attempt ${outputFormatFailures}). Rotating.`);
                if (outputFormatFailures >= 2) {
                    console.warn(`[Task ${taskId}] OpenRouter/${model} repeatedly returned non-JSON output. Switching provider/model.`);
                    return null;
                }
                continue;
            }

            if (!hasValidFiles(parsed)) {
                outputFormatFailures++;
                console.warn(`[Task ${taskId}] Invalid files from OpenRouter, trying next key`);
                if (outputFormatFailures >= 2) {
                    console.warn(`[Task ${taskId}] OpenRouter/${model} repeatedly returned invalid file payload. Switching provider/model.`);
                    return null;
                }
                continue;
            }
            
            console.log(`[Task ${taskId}] ✅ OpenRouter/${model} Key #${keyNum} — SUCCESS`);
            recordSuccess('openrouter', key);
            return parsed.files;
            
        } catch (err) {
            const status = Number(err?.status || err?.response?.status || 0);
            const errMsg = err.message || '';
            
            if (isRateLimit(err)) {
                recordRateLimit('openrouter', key, OPENROUTER_RATE_WAIT_MS);
                console.log(`[Task ${taskId}] 429 Rate Limited on Key #${keyNum}. Rotating to next key/provider...`);
                await sleep(2000);
                continue;
            } else if (isTransient(err)) {
                const delayMs = 2000 * attemptCount;
                console.warn(`[Task ${taskId}] Transient error on Key #${keyNum}. Retrying after ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }

            if (/timed out|timeout/i.test(errMsg)) {
                recordRateLimit('openrouter', key, 90_000);
                console.warn(`[Task ${taskId}] OpenRouter timeout on Key #${keyNum}. Cooling key and rotating...`);
                continue;
            }
            
            // Hard error (e.g. 401, 403, 404, 400): Record and move to next key immediately
            recordFailure('openrouter', key, `${status} ${errMsg}`);
            
            if (status === 404 || errMsg.includes('No endpoints found')) {
                markModelDead(model);
                return null;
            }
            
            // Insufficient credits: Hard failure for this key
            if (status === 402) {
                console.error(`[Task ${taskId}] ❌ Key #${keyNum} insufficient credits (402)`);
                recordFailure('openrouter', key, 'Insufficient credits (402)');
                continue; // Try next key
            }
            
            // Rate limit: cool down this key and rotate immediately.
            // Avoid per-key 60s sleeps that can block the entire task pipeline.
            if (isRateLimit(err)) {
                recordRateLimit('openrouter', key, OPENROUTER_RATE_WAIT_MS);
                console.log(`[Task ${taskId}] 429 Rate Limited on Key #${keyNum}. Rotating to next key/provider...`);
                await sleep(2000);
            } else if (isTransient(err)) {
                const delayMs = 2000 * attemptCount;
                console.warn(`[Task ${taskId}] Transient error on Key #${keyNum}. Retrying after ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }

            if (/timed out|timeout/i.test(errMsg)) {
                recordRateLimit('openrouter', key, 90_000);
                console.warn(`[Task ${taskId}] OpenRouter timeout on Key #${keyNum}. Cooling key and rotating...`);
                continue;
            }
            
            // Transient error: Retry after delay
            if (isTransient(err)) {
                const delayMs = 2000 * attemptCount;
                console.warn(`[Task ${taskId}] Transient error on Key #${keyNum}. Retrying after ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            
            // Hard failure: Move to next key
            console.warn(`[Task ${taskId}] ❌ Key #${keyNum} hard fail: ${errMsg.slice(0, 80)}`);
            recordFailure('openrouter', key, errMsg);
        }
    }
    
    console.warn(`[Task ${taskId}] ❌ Exhausted all ${OPENROUTER_API_KEYS.length} OpenRouter keys`);
    // FIX #10b: Only activate deterministicMode when BOTH providers have no available keys.
    // Activating it just because OpenRouter is saturated is too aggressive — Groq may still work.
    if (!hasAvailableKey('openrouter') && !hasAvailableKey('groq')) {
        activateDeterministicMode('All provider keys exhausted/rate-limited');
    }
    return null;
}

function toPascalFromPath(filePath) {
        const fileName = String(filePath || '').split('/').pop() || 'Component';
        const base = fileName.replace(/\.(jsx?|tsx?)$/, '');
        return base
                .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
                .replace(/^[a-z]/, (c) => c.toUpperCase()) || 'Component';
}

function buildFallbackApp(prd) {
        const pages = Array.isArray(prd?.pages) ? prd.pages : [];
        const pageImports = pages
                .map((p) => {
                        const name = toPascalFromPath(`${p?.name || 'Home'}.jsx`);
                        return `import ${name} from './pages/${name}';`;
                })
                .join('\n');

        const pageRoutes = pages
                .map((p) => {
                        const name = toPascalFromPath(`${p?.name || 'Home'}.jsx`);
                        const route = p?.route || `/${name.toLowerCase()}`;
                        return `            <Route path="${route}" element={<${name} />} />`;
                })
                .join('\n');

        return `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import PageTransition from './components/PageTransition';
import FloatingButtons from './components/FloatingButtons';
import { AppProvider } from './context/AppContext';
${pageImports}

export default function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <ScrollToTop />
                <Navbar />
                <PageTransition>
                    <Routes>
${pageRoutes}
                        <Route path="*" element={null} />
                    </Routes>
                </PageTransition>
                <FloatingButtons />
                <Footer />
            </BrowserRouter>
        </AppProvider>
    );
}
`;
}

function buildDeterministicTaskFallback(task, prd) {
        const files = {};

        for (const fp of task.files || []) {
                if (fp === 'src/lib/utils.js') {
                        files[fp] = `import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export default cn;
`;
                        continue;
                }

                if (fp === 'src/data/siteData.js') {
                        files[fp] = `export const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
];

export const stats = [
    { label: 'Happy Customers', value: '10k+' },
    { label: 'Products', value: '250+' },
    { label: 'Countries Served', value: '40+' },
];

export const testimonials = [
    { name: 'Alex', role: 'Founder', quote: 'Fast, beautiful, and easy to use.' },
    { name: 'Jordan', role: 'Manager', quote: 'The experience feels premium and reliable.' },
];

export const faqItems = [
    { question: 'How fast is delivery?', answer: 'Most orders ship within 24 hours.' },
    { question: 'Can I return products?', answer: 'Yes, 30-day return policy applies.' },
];
`;
                        continue;
                }

                if (fp === 'src/hooks/useScrollToTop.js') {
                        files[fp] = `import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function useScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pathname]);
}
`;
                        continue;
                }

                if (fp === 'src/context/AppContext.jsx') {
                        files[fp] = `import React, { createContext, useContext, useMemo, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const value = useMemo(() => ({ isMenuOpen, setIsMenuOpen }), [isMenuOpen]);
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within AppProvider');
    return context;
}

export default AppContext;
`;
                        continue;
                }

                if (fp === 'src/App.jsx') {
                        files[fp] = buildFallbackApp(prd);
                        continue;
                }

        }

        return files;
}

    function shouldUseDeterministicFirst(task) {
        const files = Array.isArray(task?.files) ? task.files : [];
        
        const foundationFiles = new Set([
            'src/lib/utils.js',
            'src/data/siteData.js',
            'src/hooks/useScrollToTop.js',
            'src/context/AppContext.jsx',
        ]);

        if (task?.type === 'foundation') return true;
        if (files.length === 1 && foundationFiles.has(files[0])) return true;

        return false;
    }

function selectModelForTask(task) {
    const files = Array.isArray(task?.files) ? task.files : [];
    const isHeavyTask = 
        files.some(f => f.includes('App.jsx')) ||
        files.some(f => f.includes('pages/')) ||
        task.title.toLowerCase().includes('hero') ||
        task.title.toLowerCase().includes('navbar') ||
        task.title.toLowerCase().includes('footer');

    const isLightTask =
        files.some(f => f.includes('utils')) ||
        files.some(f => f.includes('hooks/')) ||
        files.some(f => f.includes('context/')) ||
        task.type === 'foundation';

    if (isHeavyTask) {
        return [
            { provider: 'groq', model: 'llama-3.3-70b-versatile' },
            { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
        ];
    }

    if (isLightTask) {
        return [
            { provider: 'groq', model: 'llama-3.1-8b-instant' },
            { provider: 'groq', model: 'qwen/qwen3-32b' },
            { provider: 'groq', model: 'openai/gpt-oss-20b' },
            { provider: 'openrouter', model: 'google/gemma-3-27b-it:free' },
        ];
    }

    return PRIMARY_MODEL_SEQUENCE;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function executeTask(projectId, task, prd, existingFiles = {}, isFirstTask = false) {
        if (isFirstTask) {
            resetForGeneration();
            console.log('[Task Executor] 🔄 Key manager reset for new generation');
        }

        if (isDeterministicModeActive()) {
            const deterministicFiles = buildDeterministicTaskFallback(task, prd);
            if (deterministicFiles && Object.keys(deterministicFiles).length > 0) {
                console.warn(`[Task ${task.id}] ⚠️ Deterministic mode active. Skipping provider calls for ${task.title}`);
                return deterministicFiles;
            }
        }

        if (shouldUseDeterministicFirst(task)) {
            const deterministicFiles = buildDeterministicTaskFallback(task, prd);
            if (deterministicFiles && Object.keys(deterministicFiles).length > 0) {
                console.log(`[Task ${task.id}] 🧩 Deterministic-first mode for ${task.title} (saved API calls)`);
                return deterministicFiles;
            }
        }

    const system   = buildSystemPrompt();
    let   userMsg  = buildUserPrompt(task, prd, existingFiles);
    let   attempt  = 0;
    const MAX_FIX  = 2;

    fix_loop: while (attempt <= MAX_FIX) {
        if (attempt > 0) console.log(`[Task ${task.id}] 🛠️ Fix attempt ${attempt}/${MAX_FIX}`);

        const messages = [
            { role: 'system', content: system },
            { role: 'user',   content: userMsg },
        ];

        if (!hasAvailableKey('groq') && !hasAvailableKey('openrouter')) {
            activateDeterministicMode('No provider keys available');
            const fallbackFiles = buildDeterministicTaskFallback(task, prd);
            if (fallbackFiles && Object.keys(fallbackFiles).length > 0) {
                console.warn(`[Task ${task.id}] ⚠️ No provider keys available. Using deterministic fallback immediately for ${task.title}`);
                return fallbackFiles;
            }
        }

        let files = null;
        const modelSequence = selectModelForTask(task);

        for (const candidate of modelSequence) {
            if (candidate.provider === 'openrouter') {
                if (!hasAvailableKey('openrouter')) {
                    console.warn(`[Task ${task.id}] OpenRouter keys unavailable, skipping primary model ${candidate.model}`);
                    continue;
                }
                if (isModelDead(candidate.model)) {
                    console.log(`[Task ${task.id}] ⏭️ Skipping dead model: ${candidate.model}`);
                    continue;
                }
                files = await tryOpenRouterModel(candidate.model, messages, task.id);
                if (files) break;
                console.log(`[Task ${task.id}] OpenRouter/${candidate.model} exhausted → next`);
            } else if (candidate.provider === 'groq') {
                if (!hasAvailableKey('groq')) {
                    console.warn(`[Task ${task.id}] Groq keys unavailable, skipping primary model ${candidate.model}`);
                    continue;
                }
                files = await tryGroqModel(candidate.model, messages, task.id);
                if (files) break;
                console.log(`[Task ${task.id}] Groq/${candidate.model} exhausted → next`);
            }
        }

        if (!files) {
            const primaryModels = new Set(
                PRIMARY_MODEL_SEQUENCE
                    .filter((c) => c.provider === 'groq')
                    .map((c) => c.model)
            );

            if (!hasAvailableKey('groq')) {
                console.warn(`[Task ${task.id}] Groq keys unavailable, skipping remaining Groq models`);
            }

            for (const model of GROQ_MODELS) {
                if (!hasAvailableKey('groq')) break;
                if (primaryModels.has(model)) continue;
                files = await tryGroqModel(model, messages, task.id);
                if (files) break;
                console.log(`[Task ${task.id}] Groq/${model} exhausted → next`);
            }
        }

        if (!files) {
            console.log(`[Task ${task.id}] ↩ OpenRouter fallback`);
            if (!hasAvailableKey('openrouter')) {
                console.warn(`[Task ${task.id}] OpenRouter keys unavailable, skipping OpenRouter fallback models`);
            }
            for (const model of OPENROUTER_FALLBACKS) {
                if (!hasAvailableKey('openrouter')) break;
                if (isModelDead(model)) {
                    console.log(`[Task ${task.id}] ⏭️ Skipping dead model: ${model}`);
                    continue;
                }
                files = await tryOpenRouterModel(model, messages, task.id);
                if (files) break;
            }
        }

        if (!files) {
            const fallbackFiles = buildDeterministicTaskFallback(task, prd);
            if (fallbackFiles && Object.keys(fallbackFiles).length > 0) {
                console.warn(`[Task ${task.id}] ⚠️ All models unavailable. Using deterministic fallback for ${task.title}`);
                return fallbackFiles;
            }
            throw new Error(`RateLimitExhausted: Task ${task.id} (${task.title}) failed on all models`);
        }

        // Apply FIX 1: Replace brand icons
        for (const [fp, code] of Object.entries(files)) {
            files[fp] = fixLucideBrandIcons(code);
        }

        // Apply FIX 6: Named → Default import fix
        for (const [fp, code] of Object.entries(files)) {
            if (typeof code === 'string') {
                files[fp] = fixNamedComponentImports(code);
            }
        }

        // Apply FIX 3: Strip protected files if AI generated them
        files = stripProtectedFiles(files);

        // Apply FIX 5: Normalize file names
        files = normalizeFileNames(files);

        const { valid, errors } = validateTaskFiles(files, task);

        if (!valid) {
            console.warn(`[Task ${task.id}] ⚠️ Validation:\n${errors.join('\n')}`);

            if (projectId) {
                logGenerationError({ projectId, taskId: task.id.toString(), errorMessage: errors.join('\n'), errorType: classifyError(errors[0]) }).catch(() => {});
            }

            const cached = await findMemoryCache(errors[0]).catch(() => null);
            if (cached?.fix_solution) {
                try {
                    const fp = extractJSON(cached.fix_solution);
                    if (hasValidFiles(fp)) { console.log(`[Task ${task.id}] 🧠 Cache hit`); return fp.files; }
                } catch { /* ignore */ }
            }

            if (!isFixerWorthy(errors)) {
                console.log(`[Task ${task.id}] ℹ️ Cross-task imports — accepting`);
                return files;
            }

            if (attempt < MAX_FIX) {
                userMsg = `${buildUserPrompt(task, prd, existingFiles)}

🚨 FIX THESE ERRORS:
${errors.map((e, i) => `${i+1}. ${e}`).join('\n')}

Return: { "files": { ... } } — every JSX needs export default`;
                attempt++;
                continue fix_loop;
            }

            console.warn(`[Task ${task.id}] Max attempts — returning best effort`);
            return files;
        }

        if (attempt > 0 && projectId) {
            saveMemoryCache(userMsg, JSON.stringify({ files })).catch(() => {});
        }

        console.log(`[Task ${task.id}] ✅ Done — ${Object.keys(files).length} file(s)`);
        return files;
    }

    throw new Error(`Task ${task.id} fix_loop exited unexpectedly`);
}

// ── Final validation + all post-processing (after ALL tasks) ─────────────────
export function validateGeneratedFiles(files, websiteType = 'generic') {
    const errors = [];
    const fixed  = [];

    if (!files || Object.keys(files).length === 0) {
        return { files, valid: false, errors: ['No files generated'], fixed };
    }

    // Get type-specific required custom components
    const requiredCustomComps = getRequiredCustomComponentsForType(websiteType);

    if (!files || Object.keys(files).length === 0) {
        return { files, valid: false, errors: ['No files generated'], fixed };
    }

    // Apply all fixes in sequence
    let processed = { ...files };

    // FIX 1: Brand icons (final pass over all files)
    for (const [fp, code] of Object.entries(processed)) {
        processed[fp] = fixLucideBrandIcons(code);
    }

    // FIX 6: Named → Default import fix for custom components
    for (const [fp, code] of Object.entries(processed)) {
        if (typeof code === 'string') {
            processed[fp] = fixNamedComponentImports(code);
        }
    }

    // FIX 2: Context providers
    processed = injectContextProviders(processed);

    // FIX 3: Strip protected files
    processed = stripProtectedFiles(processed);

    // FIX 5: Normalize names
    processed = normalizeFileNames(processed);

    // Auto-fix import paths
    const corrected = {};
    for (const [fp, code] of Object.entries(processed)) {
        if (typeof code !== 'string') { corrected[fp] = code; continue; }
        let c = code;

        // App.jsx: ensure local imports use ./ (not ../)
        if (fp === 'src/App.jsx' || fp.endsWith('/App.jsx')) {
            const before = c;
            c = c.replace(/from\s+['"]\.\.\/pages\//g,      "from './pages/");
            c = c.replace(/from\s+['"]\.\.\/components\//g, "from './components/");
            c = c.replace(/from\s+['"]\.\.\/context\//g,    "from './context/");
            c = c.replace(/from\s+['"]\.\.\/data\//g,       "from './data/");
            c = c.replace(/from\s+['"]\.\.\/hooks\//g,      "from './hooks/");
            c = c.replace(/from\s+['"]\.\.\/lib\//g,        "from './lib/");
            if (c !== before) fixed.push('Auto-fixed App.jsx: ../pages → ./pages');
        }

        // Pages: ensure relative depth from src/pages
        if (fp.startsWith('src/pages/')) {
            const before = c;
            c = c.replace(/from\s+['"]\.(\/components\/)/g, "from '..$1");
            c = c.replace(/from\s+['"]\.(\/context\/)/g, "from '..$1");
            c = c.replace(/from\s+['"]\.(\/data\/)/g, "from '..$1");
            c = c.replace(/from\s+['"]\.(\/hooks\/)/g, "from '..$1");
            c = c.replace(/from\s+['"]\.(\/lib\/)/g, "from '..$1");
            if (c !== before) fixed.push(`Auto-fixed ${fp}: ./components → ../components`);
        }

        // Custom components under src/components import ui via ./ui/*
        if (fp.startsWith('src/components/') && !fp.startsWith('src/components/ui/')) {
            const before = c;
            c = c.replace(/from\s+['"]\.\.\/components\/ui\//g, "from './ui/");
            if (c !== before) fixed.push(`Auto-fixed ${fp}: ../components/ui → ./ui`);
        }

        // UI primitives in src/components/ui should use ../../ for shared folders
        if (fp.startsWith('src/components/ui/')) {
            const before = c;
            c = c.replace(/from\s+['"]\.\/lib\//g, "from '../../lib/");
            c = c.replace(/from\s+['"]\.\/hooks\//g, "from '../../hooks/");
            c = c.replace(/from\s+['"]\.\/context\//g, "from '../../context/");
            c = c.replace(/from\s+['"]\.\/data\//g, "from '../../data/");
            if (c !== before) fixed.push(`Auto-fixed ${fp}: ./shared → ../../shared`);
        }

        // Strip any @import url() from CSS files
        if (fp.endsWith('.css')) {
            const before = c;
            c = c.replace(/@import\s+url\([^)]+\);?\s*/g, '');
            c = c.replace(/@import\s+['"][^'"]+['"];?\s*/g, '');
            if (c !== before) fixed.push(`Auto-fixed ${fp}: removed @import statements`);
        }

        corrected[fp] = c;
    }

    const paths = Object.keys(corrected);

    // Structural checks
    if (!paths.some(p => p === 'src/App.jsx' || p.endsWith('/App.jsx'))) {
        errors.push('Missing src/App.jsx');
    }
    if (!paths.some(p => p.startsWith('src/pages/'))) {
        errors.push('No page components generated');
    }

    for (const requiredPath of REQUIRED_STRUCTURE_FILES) {
        if (!paths.includes(requiredPath)) {
            errors.push(`Missing required file: ${requiredPath}`);
        }
    }

    // UI primitives are injected from global template setup at save-time.
    // Do not require them to be generated per task.

    for (const compName of requiredCustomComps) {
        const customPath = `src/components/${compName}.jsx`;
        if (!paths.includes(customPath)) {
            errors.push(`Missing required custom component: ${customPath}`);
        }
    }

    if (!paths.some(p => p.startsWith('src/context/'))) {
        errors.push('Missing required file: src/context/*');
    }
    if (!paths.some(p => p.startsWith('src/data/'))) {
        errors.push('Missing required file: src/data/*');
    }
    if (!paths.some(p => p.startsWith('src/hooks/'))) {
        errors.push('Missing required file: src/hooks/*');
    }
    if (!paths.some(p => p.startsWith('src/lib/'))) {
        errors.push('Missing required file: src/lib/*');
    }

    for (const [fp, code] of Object.entries(corrected)) {
        if (!fp.endsWith('.jsx') && !fp.endsWith('.tsx')) continue;
        if (!code?.includes('export default')) errors.push(`${fp} missing export default`);
    }

    // Cross-file import check
    const externalDepsUsed = new Set();
    for (const [fp, code] of Object.entries(corrected)) {
        if (!code || typeof code !== 'string') continue;
        const importLines = code.match(/^import\s+.+\s+from\s+['"]([^'"]+)['"]/gm) || [];
        for (const line of importLines) {
            const m = line.match(/from\s+['"]([^'"]+)['"]/);
            if (!m) continue;

            if (!m[1].startsWith('.')) {
                const depName = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0];
                externalDepsUsed.add(depName);
                continue;
            }

            const parts = fp.split('/'); parts.pop();
            const segs  = [...parts, ...m[1].split('/')];
            const res   = [];
            for (const s of segs) {
                if (s === '.') continue;
                if (s === '..') { res.pop(); continue; }
                res.push(s);
            }
            const norm   = res.join('/');
            const exists = paths.some(p => p === norm || p === norm + '.jsx' || p === norm + '.js' || p === norm + '/index.jsx');
            const isTemplateProvidedUiImport = norm.startsWith('src/components/ui/');
            if (!exists && !isTemplateProvidedUiImport) {
                errors.push(`Import error in ${fp}: '${m[1]}' not generated`);
            }
        }
    }

    for (const dep of externalDepsUsed) {
        if (!KNOWN_EXTERNAL_DEPENDENCIES.has(dep)) {
            errors.push(`Unknown external dependency in imports: ${dep}`);
        }
    }

    const severity = {
        critical: errors.filter((e) => classifyValidationSeverity(e) === 'critical'),
        warning: errors.filter((e) => classifyValidationSeverity(e) === 'warning'),
    };

    const summary = {
        criticalCount: severity.critical.length,
        warningCount: severity.warning.length,
        totalCount: errors.length,
    };

    return { files: corrected, valid: errors.length === 0, errors, fixed, severity, summary };
}
