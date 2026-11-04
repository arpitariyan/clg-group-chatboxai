// ============================================================
// AIModelsOption — ChatBox AI
// Single source of truth: lib/models-registry.js
// Add / remove models ONLY there. No other files need to change.
// ============================================================

import { toUIModels } from '@/lib/models-registry.js';

/**
 * UI model list — same shape as before: { id, name, desc, modelApi, provider, isPro }
 * modelApi is now the stable publicId (e.g. "chatboxai/llama-3.3-70b")
 */
export const AIModelsOption = toUIModels();

// ============================================================
// DEEP RESEARCH MODELS — Sirf research mode ke liye show hoge
// ============================================================
export const DEEP_RESEARCH_MODELS = [

    // ── AUTO (Best available for Research) ──────────────────
    {
        id: 'dr-auto',
        name: 'Auto (Best)',
        desc: 'Automatically picks best research model',
        modelApi: 'auto',
        provider: 'mixed',
        reasoningParam: null,
        isPro: false,
    },

    // ── REPLICATE (priority: Claude access) ─────────────────
    {
        id: 'dr-1',
        name: 'Claude 3.7 Sonnet Thinking',
        desc: 'Claude 3.7 Sonnet — Anthropic top model via Thinking',
        modelApi: 'anthropic/claude-3.7-sonnet',
        provider: 'replicate',
        reasoningParam: null,
        isPro: true,
    },
    {
        id: 'dr-2',
        name: 'Claude 4.5 Sonnet Thinking',
        desc: 'Claude 4.5 Sonnet — newest Anthropic model via Thinking',
        modelApi: 'anthropic/claude-4.5-sonnet',
        provider: 'replicate',
        reasoningParam: null,
        isPro: true,
    },

    // ── GROQ (priority: speed + reasoning) ──────────────────
    {
        id: 'dr-3',
        name: 'Qwen3 32B Thinking',
        desc: 'Dual-mode thinking model — deep reasoning, 6K ctx/min on Groq',
        modelApi: 'qwen/qwen3-32b',
        provider: 'groq',
        reasoningParam: { type: 'groq', key: 'reasoning_effort', value: 'default' },
        isPro: false,
    },
    {
        id: 'dr-4',
        name: 'GPT-OSS 120B Reasoning',
        desc: 'OpenAI 120B — highest reasoning quality on Groq, reasoning_effort: high',
        modelApi: 'openai/gpt-oss-120b',
        provider: 'groq',
        reasoningParam: { type: 'groq', key: 'reasoning_effort', value: 'high' },
        isPro: true,
    },
    {
        id: 'dr-5',
        name: 'GPT-OSS 20B Fast Thinking',
        desc: 'OpenAI 20B — fastest reasoning on Groq (~1000 t/s), great fallback',
        modelApi: 'openai/gpt-oss-20b',
        provider: 'groq',
        reasoningParam: { type: 'groq', key: 'reasoning_effort', value: 'high' },
        isPro: false,
    },
    {
        id: 'dr-6',
        name: 'Kimi K2 Agentic',
        desc: 'Multi-step agentic reasoning — best for long-chain research tasks',
        modelApi: 'moonshotai/kimi-k2-instruct',
        provider: 'openrouter',
        reasoningParam: null,
        isPro: false,
    },
    {
        id: 'dr-7',
        name: 'Llama 3.3 70B Versatile',
        desc: 'Llama 3.3 70B — best general quality on Groq, lightning fast',
        modelApi: 'llama-3.3-70b-versatile',
        provider: 'groq',
        reasoningParam: null,
        isPro: false,
    },

    // ── OPENROUTER (priority: depth + free) ─────────────────
    {
        id: 'dr-8',
        name: 'Qwen 3.6 Plus Preview Thinking',
        desc: 'Qwen 3.6 Plus Preview — top free reasoning/coding depth with long context',
        modelApi: 'qwen/qwen3.6-plus-preview:free',
        provider: 'openrouter',
        reasoningParam: { type: 'openrouter', enabled: true },
        isPro: false,
    },
    {
        id: 'dr-9',
        name: 'NVIDIA Nemotron 3 Super',
        desc: 'Nemotron 3 Super — 1M context for long-form research and agent workflows',
        modelApi: 'nvidia/nemotron-3-super:free',
        provider: 'openrouter',
        reasoningParam: { type: 'openrouter', enabled: true },
        isPro: false,
    },
    {
        id: 'dr-10',
        name: 'MiniMax M2.5 Thinking',
        desc: 'MiniMax M2.5 — strong software + office workflow reasoning',
        modelApi: 'minimax/minimax-m2.5:free',
        provider: 'openrouter',
        reasoningParam: { type: 'openrouter', enabled: true },
        isPro: false,
    },
    {
        id: 'dr-11',
        name: 'StepFun 3.5 Flash Thinking',
        desc: 'Native reasoning model — 196B MoE, 256K ctx, reasoning tokens visible',
        modelApi: 'stepfun/step-3.5-flash:free',
        provider: 'openrouter',
        reasoningParam: { type: 'openrouter', enabled: true },
        isPro: false,
    },
    {
        id: 'dr-12',
        name: 'GLM 4.5 Air Thinking',
        desc: 'Thinking mode ON — agentic, tool use, 131K ctx, toggle anytime',
        modelApi: 'z-ai/glm-4.5-air:free',
        provider: 'openrouter',
        reasoningParam: { type: 'openrouter', enabled: true },
        isPro: false,
    },
    {
        id: 'dr-13',
        name: 'Trinity Large Thinking',
        desc: 'Arcee 400B MoE — frontier reasoning, 131K ctx, free',
        modelApi: 'arcee-ai/trinity-large-preview:free',
        provider: 'openrouter',
        reasoningParam: { type: 'openrouter', enabled: true },
        isPro: false,
    },
    {
        id: 'dr-14',
        name: 'GPT-OSS 20B Thinking',
        desc: 'OpenAI 20B free on OpenRouter — reasoning config support, 131K ctx',
        modelApi: 'openai/gpt-oss-20b:free',
        provider: 'openrouter',
        reasoningParam: { type: 'openrouter', enabled: true },
        isPro: false,
    },
    {
        id: 'dr-15',
        name: 'Qwen3 Coder 480B',
        desc: '480B MoE coding + research — chain-of-thought, 262K ctx',
        modelApi: 'qwen/qwen3-coder:free',
        provider: 'openrouter',
        reasoningParam: { type: 'openrouter', enabled: true },
        isPro: false,
    }
];

// ============================================================
// GROQ CONSTANTS — use in callGroqAPI() fallback chain
// ============================================================
export const GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile';        // best quality (1K req/day)
export const GROQ_VOLUME_MODEL = 'llama-3.1-8b-instant';            // 14.4K req/day — insurance
export const GROQ_FAST_MODEL = 'openai/gpt-oss-20b';              // ~1000 t/s

export const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'qwen/qwen3-32b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'llama-3.1-8b-instant',
];

// ============================================================
// UNSTABLE MODELS — auto-redirect karo stable model pe
// ============================================================
const TEMP_UNSTABLE_MODELS = new Set([
    'liquid/lfm-2.5-1.2b-instruct:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'google/gemma-3n-e4b-it:free',
    'google/gemma-3-4b-it:free',
    'arcee-ai/trinity-large-preview:free',
]);

// Verified stable free model (GLM 4.5 Air — best for general + coding)
const VERIFIED_FREE_STABLE_MODEL = 'z-ai/glm-4.5-air:free';

function getPreferredFreeStableModel() {
    return AIModelsOption.find((m) => m.modelApi === VERIFIED_FREE_STABLE_MODEL) || null;
}

function pickWeightedAutoModel(pool, isPro) {
    if (!Array.isArray(pool) || pool.length === 0) return null;

    if (isPro) {
        // If Pro, strongly prefer Pro models so they get the value of their subscription
        const proModels = pool.filter(candidate => candidate.isPro);
        if (proModels.length > 0) {
            return proModels[Math.floor(Math.random() * proModels.length)];
        }
    }

    // Position mapping is based on AIModelsOption with Auto at position 1.
    const preferredPool = AIModelsOption.filter((model, index) =>
        index >= 1 &&
        index <= 11 &&
        model.modelApi !== 'auto' &&
        pool.some((candidate) => candidate.modelApi === model.modelApi)
    );

    const secondaryPool = AIModelsOption.filter((model, index) =>
        index >= 12 &&
        model.modelApi !== 'auto' &&
        pool.some((candidate) => candidate.modelApi === model.modelApi)
    );

    const useSecondary = Math.random() < 0.05;
    let activePool = useSecondary ? secondaryPool : preferredPool;

    // If the target bucket is empty after plan filtering, fallback safely.
    if (activePool.length === 0) {
        activePool = useSecondary ? preferredPool : secondaryPool;
    }
    if (activePool.length === 0) {
        activePool = pool;
    }

    return activePool[Math.floor(Math.random() * activePool.length)];
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/** Random model picker — respects isPro flag and research mode */
export function getRandomModel(userPlan = 'free', isResearch = false) {
    const planStr = typeof userPlan === 'boolean' ? (userPlan ? 'pro' : 'free') : String(userPlan || 'free').toLowerCase();

    let pool = isResearch ? [...DEEP_RESEARCH_MODELS] : [...AIModelsOption];
    pool = pool.filter((m) => m.modelApi !== 'auto');

    // Filter models based on the user's plan
    pool = pool.filter((m) => canAccessModel(m, planStr));

    if (pool.length === 0) {
        pool = (isResearch ? DEEP_RESEARCH_MODELS : AIModelsOption).filter((m) => m.modelApi !== 'auto');
        pool = pool.filter((m) => canAccessModel(m, planStr));
    }

    if (!isResearch) {
        const weightedPick = pickWeightedAutoModel(pool, planStr);
        if (weightedPick) return weightedPick;
    }

    // For Deep Research Auto: If Pro/Max, try to pick models they unlocked
    if (isResearch && (planStr === 'pro' || planStr === 'max')) {
        const premiumModels = pool.filter(candidate => candidate.isPro || candidate.accessTier === 'pro' || candidate.accessTier === 'max');
        if (premiumModels.length > 0) {
            return premiumModels[Math.floor(Math.random() * premiumModels.length)];
        }
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

/** Resolve final model — handles Auto + unstable redirects */
export function resolveModel(selectedModel, userPlan = 'free', isResearch = false) {
    const planStr = typeof userPlan === 'boolean' ? (userPlan ? 'pro' : 'free') : String(userPlan || 'free').toLowerCase();

    // If it's a string (e.g. from database or simple input), try to find the full object
    if (typeof selectedModel === 'string') {
        // Look in both standard and research pools
        const found = [...AIModelsOption, ...DEEP_RESEARCH_MODELS].find(
            (m) => m.modelApi === selectedModel || m.id === selectedModel
        );
        if (found) {
            selectedModel = found;
        } else {
            // If not found, it's either 'auto' or an invalid string
            if (selectedModel === 'auto' || selectedModel === 'best') {
                return getRandomModel(planStr, isResearch);
            }
            // Fallback to auto if string unknown
            return getRandomModel(planStr, isResearch);
        }
    }

    if (!selectedModel || selectedModel.modelApi === 'auto' || selectedModel.id === 'best' || selectedModel.id === 1 || selectedModel.id === 'dr-auto') {
        return getRandomModel(planStr, isResearch);
    }

    if (selectedModel?.modelApi && TEMP_UNSTABLE_MODELS.has(selectedModel.modelApi)) {
        return getPreferredFreeStableModel() || getRandomModel(planStr, isResearch);
    }

    return selectedModel;
}

/** Check if user plan can access this model.
 *  Free  → only accessTier:'free' models
 *  Pro   → ALL models while paid_credits > 0; free-tier models when paid_credits === 0
 *  Max   → ALL models while paid_credits > 0; free-tier models when paid_credits === 0
 *
 * @param {object} model
 * @param {string|boolean} planOrIsPro  – plan string ('free'|'pro'|'max') or legacy boolean
 * @param {number|null}    [paidCreditsRemaining]  – current paid-credits balance; if provided
 *                                                   and === 0, paid models are locked for UI
 */
export function canAccessModel(model, planOrIsPro, paidCreditsRemaining = null) {
    if (!model || model.modelApi === 'auto') return true;

    // Check if user has paid credits > 0 (from active or preserved subscription)
    const hasPaidCredits = paidCreditsRemaining !== null && Number(paidCreditsRemaining) > 0;
    if (hasPaidCredits) return true;

    // Accept plan string ('free' | 'pro' | 'max')
    if (typeof planOrIsPro === 'string') {
        const plan = planOrIsPro.toLowerCase();
        const hasPaidPlan = plan === 'pro' || plan === 'max';

        // If user has neither a paid plan nor remaining paid credits, lock paid models
        if (!hasPaidPlan) {
            const at = model.accessTier;
            if (at) return at === 'free';
            return !model.isPro;
        }

        // Pro / Max user: if paidCreditsRemaining is explicitly passed as <= 0, lock paid models
        if (paidCreditsRemaining !== null && Number(paidCreditsRemaining) <= 0) {
            const at = model.accessTier;
            const isPaidModel = at ? at !== 'free' : !!model.isPro;
            if (isPaidModel) return false;
        }

        return true;
    }

    // Legacy boolean isPro path (kept for backward compat)
    const isPro = Boolean(planOrIsPro);
    if (isPro) {
        if (paidCreditsRemaining !== null && Number(paidCreditsRemaining) <= 0) {
            const at = model.accessTier;
            const isPaidModel = at ? at !== 'free' : !!model.isPro;
            if (isPaidModel) return false;
        }
        return true;
    }
    return !model.isPro;
}


/** Get models list filtered by plan or paid credits */
export function getAvailableModels(isPro, paidCredits = null) {
    if (isPro || (paidCredits !== null && Number(paidCredits) > 0)) return AIModelsOption;
    return AIModelsOption.filter((m) => !m.isPro || m.modelApi === 'auto');
}

/** Get models with access metadata — useful for UI lock icons */
export function getModelsWithAccess(isPro, paidCredits = null) {
    const planStr = typeof isPro === 'string' ? isPro : (isPro ? 'pro' : 'free');
    return AIModelsOption.map((m) => ({
        ...m,
        isAccessible: canAccessModel(m, planStr, paidCredits),
        requiresPro: !canAccessModel(m, planStr, paidCredits),
    }));
}

function findModelByKey(modelLike) {
    if (!modelLike) return null;

    if (typeof modelLike === 'object') {
        return modelLike;
    }

    const key = String(modelLike).trim().toLowerCase();
    if (!key) return null;

    return [...AIModelsOption, ...DEEP_RESEARCH_MODELS].find((model) => {
        const modelApi = String(model?.modelApi || '').toLowerCase();
        const id = String(model?.id ?? '').toLowerCase();
        const name = String(model?.name || '').toLowerCase();
        return modelApi === key || id === key || name === key;
    }) || null;
}

function toPositiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function scaleTokenSuffix(amount, suffix) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return null;

    return suffix?.toLowerCase() === 'm'
        ? Math.round(numericAmount * 1000000)
        : Math.round(numericAmount * 1000);
}

function inferTokensFromText(text) {
    const content = String(text || '');
    if (!content.trim()) return null;

    const patterns = [
        /\b(\d+(?:\.\d+)?)\s*([km])\s*(?:ctx|context|token|tokens)\b/ig,
        /\bcontext\s*(?:window|limit)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*([km])\b/ig,
        /\b(\d+(?:\.\d+)?)\s*([km])\b/ig,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(content);
        if (match) {
            const amount = scaleTokenSuffix(match[1], match[2]);
            if (amount) return amount;
        }
    }

    return null;
}

function getModelSignalScore(modelText) {
    const text = String(modelText || '').toLowerCase();
    let score = 0;

    if (/\b(128k|256k|1m|context|ctx|long context)\b/.test(text)) score += 3;
    if (/\b(flagship|premium|reasoning|thinking|agentic|top|pro)\b/.test(text)) score += 2;
    if (/\b(fast|compact|small|mini|flash|8b|12b|low latency)\b/.test(text)) score -= 2;
    if (/\b(research|deep research|analysis|synthesis)\b/.test(text)) score += 1;

    return score;
}

export function normalizeModelTokenProfile(modelLike, { isResearch = false } = {}) {
    const model = findModelByKey(modelLike) || (typeof modelLike === 'object' ? modelLike : null) || {};
    const descriptor = [model.name, model.desc, model.modelApi, model.provider].filter(Boolean).join(' ');

    const explicitContext = toPositiveNumber(
        model.contextTokens ?? model.contextWindow ?? model.maxContextTokens ?? model.tokenLimit ?? model.maxInputTokens
    );
    const inferredContext = explicitContext || inferTokensFromText(descriptor);

    const explicitOutputCap = toPositiveNumber(
        model.maxOutputTokens ?? model.outputTokens ?? model.maxCompletionTokens ?? model.maxTokens
    );

    const signalScore = getModelSignalScore(descriptor);
    const derivedOutputCap = explicitOutputCap || (() => {
        if (inferredContext) {
            return Math.max(512, Math.min(4096, Math.round(inferredContext / 64)));
        }

        if (signalScore >= 3) {
            return isResearch ? 3072 : 2048;
        }

        if (signalScore <= -2) {
            return 1024;
        }

        return isResearch ? 2048 : 1536;
    })();

    return {
        id: model.id ?? null,
        name: model.name || 'Unknown Model',
        modelApi: model.modelApi || (typeof modelLike === 'string' ? modelLike : ''),
        provider: model.provider || 'unknown',
        contextTokens: inferredContext,
        maxOutputTokens: derivedOutputCap,
        signalScore,
        source: explicitOutputCap || explicitContext ? 'explicit' : inferredContext ? 'inferred' : 'fallback',
        isResearch: Boolean(isResearch),
    };
}

function countWords(text) {
    return (String(text || '').match(/[\p{L}\p{N}]+/gu) || []).length;
}

function countMatches(text, pattern) {
    return (String(text || '').match(pattern) || []).length;
}

function detectResponseSignals(text) {
    const raw = String(text || '').trim();
    const normalized = raw.replace(/\s+/g, ' ');
    const wordCount = countWords(normalized);
    const sentenceCount = Math.max(1, countMatches(normalized, /[.!?]+/g));
    const lineCount = raw ? raw.split(/\n+/).filter(Boolean).length : 0;
    const alnumCount = countMatches(normalized, /[\p{L}\p{N}]/gu);
    const symbolCount = countMatches(normalized, /[^\p{L}\p{N}\s.,!?"'()\[\]{}:/@#%&+=\-_*`|\\<>~^]/gu);
    const symbolDensity = alnumCount > 0 ? symbolCount / alnumCount : (symbolCount > 0 ? 1 : 0);

    const lower = normalized.toLowerCase();
    const hasCodeSignals = /```|\b(function|class|const|let|var|return|import|export|select|insert|update|sql|stack trace)\b/.test(lower) || /[{};=>]/.test(normalized);
    const hasAnalyticalSignals = /\b(explain|analyze|analyse|compare|contrast|evaluate|assess|reason|why|how|what if|hypothetical|paradox|identity|implication|meaning|philosophical|difference|trade[- ]?off|pros and cons|replace|piece by piece|same ship|same object|original remains|still the same)\b/.test(lower);
    const hasInstructionalSignals = /\b(how to|how do i|how can i|steps? to|best way to|what should i do|guide to|tutorial|walkthrough|fix|resolve|troubleshoot)\b/.test(lower);
    const hasDirectSignals = /\b(what is|who is|when is|where is|how many|define|meaning of|translate|spell|yes or no|briefly)\b/.test(lower);
    const hasMultiPartSignals = /\b(first|second|third|also|additionally|finally|plus|and then|step by step|bullet|list)\b/.test(lower) || countMatches(normalized, /[?]/g) > 1;
    const hasSmallSymbolicInput = wordCount <= 8 && symbolDensity > 0.25 && alnumCount <= 24;
    const hasLongContextSignals = lineCount > 3 || wordCount > 40 || countMatches(normalized, /\n\s*[-*\d]+[).]/g) > 0;

    // PEARL upgrade: Comparison signals — user wants to compare options
    const hasComparisonSignals = /\b(vs|versus|better|best|which one|which is|recommend|choose|choice|pick|pros and cons|difference between|konsa|sabse acha|sabse best|kya farak|suggest karo)\b/.test(lower);

    // PEARL upgrade: Decision signals — user wants help making a decision
    const hasDecisionSignals = /\b(should i|should we|worth it|is it worth|kya karu|kya karun|kya lena chahiye|lena chahiye|best option|right choice)\b/.test(lower);

    // PEARL upgrade: Research depth signals — user wants comprehensive analysis
    const hasResearchDepthSignals = /\b(research|deep dive|detailed analysis|comprehensive|in-depth|thorough|elaborate|breakdown|samjhao|batao)\b/.test(lower);

    return {
        raw,
        normalized,
        wordCount,
        sentenceCount,
        lineCount,
        alnumCount,
        symbolCount,
        symbolDensity,
        hasCodeSignals,
        hasAnalyticalSignals,
        hasInstructionalSignals,
        hasDirectSignals,
        hasMultiPartSignals,
        hasSmallSymbolicInput,
        hasLongContextSignals,
        hasComparisonSignals,
        hasDecisionSignals,
        hasResearchDepthSignals,
    };
}

function detectResponseIntent(promptSignals, responseMode = 'search') {
    const safeMode = responseMode === 'research' ? 'research' : 'search';
    const signals = promptSignals || detectResponseSignals('');

    let intentType = 'general_answer';
    let responseShape = 'structured';
    let recommendedDetailLevel = 'balanced';
    let label = 'Give a concise but useful answer';
    let guidance = 'Stay focused on the user need, avoid filler, and only include relevant details.';

    if (signals.hasCodeSignals) {
        intentType = 'code_help';
        responseShape = 'step_by_step';
        recommendedDetailLevel = signals.hasLongContextSignals ? 'detailed' : 'balanced';
        label = 'Explain the code issue and give the safest fix';
        guidance = 'Prefer a direct fix first, then short explanation and exact steps or code blocks only when helpful.';
    } else if (signals.hasComparisonSignals) {
        // PEARL upgrade: Comparison intent — user wants structured comparison
        intentType = 'comparison';
        responseShape = 'comparison_table';
        recommendedDetailLevel = 'detailed';
        label = 'Compare the options and give a clear recommendation';
        guidance = 'Use a structured comparison (table or side-by-side bullets). Cover all key criteria the user cares about. End with a clear recommendation based on the user\'s context.';
    } else if (signals.hasDecisionSignals) {
        // PEARL upgrade: Decision intent — user wants a recommendation
        intentType = 'decision_making';
        responseShape = 'recommendation';
        recommendedDetailLevel = 'balanced';
        label = 'Help the user make the right decision';
        guidance = 'Start with a direct recommendation, then explain the key reasons. Consider the user\'s context (budget, use case, constraints) when giving advice.';
    } else if (signals.hasAnalyticalSignals && signals.hasMultiPartSignals) {
        intentType = 'analysis_compare';
        responseShape = 'structured_analysis';
        recommendedDetailLevel = 'detailed';
        label = 'Analyze the topic and compare the important parts';
        guidance = 'Use headings, compare trade-offs, and keep each section tightly tied to the question.';
    } else if (signals.hasAnalyticalSignals || signals.hasLongContextSignals || signals.hasInstructionalSignals || signals.hasResearchDepthSignals) {
        intentType = 'explanation';
        responseShape = 'deep_explanation';
        recommendedDetailLevel = 'detailed';
        label = 'Explain the idea clearly and thoroughly';
        guidance = 'Break the answer into a clear structure, explain causes and implications, and avoid tangents.';
    } else if (signals.hasDirectSignals && signals.wordCount <= 10 && !signals.hasMultiPartSignals && !signals.hasInstructionalSignals && !signals.hasAnalyticalSignals) {
        intentType = 'direct_answer';
        responseShape = 'brief_direct';
        recommendedDetailLevel = 'brief';
        label = 'Answer directly and briefly';
        guidance = 'Answer in one direct sentence first, then add only the minimum useful context.';
    } else if (signals.hasMultiPartSignals) {
        intentType = 'step_by_step';
        responseShape = 'structured_steps';
        recommendedDetailLevel = 'balanced';
        label = 'Give a step-by-step or checklist style answer';
        guidance = 'Use numbered steps or bullets, keep the order logical, and omit unrelated details.';
    } else if (signals.hasSmallSymbolicInput) {
        intentType = 'troubleshooting';
        responseShape = 'debug_focused';
        recommendedDetailLevel = 'balanced';
        label = 'Diagnose the issue and show the quickest fix';
        guidance = 'Lead with the most likely cause, then show the fix and a quick verification step.';
    } else if (safeMode === 'research') {
        intentType = 'research_summary';
        responseShape = 'research_synthesis';
        recommendedDetailLevel = 'detailed';
        label = 'Synthesize the evidence and answer with depth';
        guidance = 'Stay evidence-led, summarize key findings, and keep the structure precise and useful.';
    }

    if (
        recommendedDetailLevel === 'balanced' &&
        (signals.hasInstructionalSignals || signals.hasAnalyticalSignals || signals.hasLongContextSignals || signals.hasMultiPartSignals)
    ) {
        recommendedDetailLevel = 'detailed';
    }

    // PEARL upgrade: Derive queryComplexity as single source of truth for PEARL module.
    // This prevents duplicate classification logic in pearlSystemPrompt.js.
    let queryComplexity = 'medium';
    if (
        recommendedDetailLevel === 'brief' &&
        !signals.hasComparisonSignals &&
        !signals.hasDecisionSignals &&
        !signals.hasResearchDepthSignals
    ) {
        queryComplexity = 'simple';
    } else if (
        recommendedDetailLevel === 'detailed' ||
        signals.hasComparisonSignals ||
        signals.hasResearchDepthSignals ||
        signals.wordCount > 28
    ) {
        queryComplexity = 'complex';
    }

    return {
        intentType,
        responseShape,
        recommendedDetailLevel,
        queryComplexity,
        label,
        guidance,
        keepFocus: 'Exclude irrelevant or generic information unless it directly helps the user.',
    };
}

export function getResponseStyleProfile({ prompt, model, responseMode = 'search' } = {}) {
    const promptSignals = detectResponseSignals(prompt);
    const modelProfile = normalizeModelTokenProfile(model, { isResearch: responseMode === 'research' });
    const intent = detectResponseIntent(promptSignals, responseMode);
    const isResearchMode = responseMode === 'research';

    let detailLevel = 'balanced';
    let confidence = 'medium';

    if (promptSignals.hasLongContextSignals || promptSignals.hasAnalyticalSignals || promptSignals.wordCount > 28) {
        detailLevel = 'detailed';
        confidence = 'high';
    } else if (
        promptSignals.hasDirectSignals &&
        promptSignals.wordCount <= 10 &&
        !promptSignals.hasCodeSignals &&
        !promptSignals.hasInstructionalSignals &&
        !promptSignals.hasMultiPartSignals &&
        !promptSignals.hasAnalyticalSignals &&
        promptSignals.symbolDensity < 0.2
    ) {
        detailLevel = 'brief';
        confidence = 'high';
    } else if (promptSignals.hasInstructionalSignals || promptSignals.hasAnalyticalSignals || promptSignals.hasLongContextSignals || promptSignals.hasCodeSignals || promptSignals.hasMultiPartSignals) {
        detailLevel = 'detailed';
        confidence = promptSignals.hasSmallSymbolicInput ? 'low' : 'medium';
    } else if (promptSignals.wordCount <= 18 && promptSignals.symbolDensity < 0.15) {
        detailLevel = 'balanced';
        confidence = 'medium';
    }

    if (intent.recommendedDetailLevel === 'brief') {
        detailLevel = 'brief';
    } else if (intent.recommendedDetailLevel === 'detailed') {
        detailLevel = 'detailed';
    } else if (intent.recommendedDetailLevel === 'balanced' && detailLevel === 'brief') {
        detailLevel = 'balanced';
    }

    if (responseMode === 'research' && detailLevel === 'brief') {
        detailLevel = 'balanced';
    }

    const detailMultiplier = isResearchMode
        ? (detailLevel === 'brief' ? 0.55 : detailLevel === 'balanced' ? 0.82 : 1)
        : (detailLevel === 'brief' ? 0.42 : detailLevel === 'balanced' ? 0.68 : 0.92);
    const maxOutputTokens = Math.max(
        256,
        Math.min(
            modelProfile.maxOutputTokens,
            Math.round(modelProfile.maxOutputTokens * detailMultiplier)
        )
    );

    return {
        detailLevel,
        maxOutputTokens,
        confidence,
        responseMode: responseMode === 'research' ? 'research' : 'search',
        promptSignals,
        modelProfile,
        intent,
    };
}
