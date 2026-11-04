/**
 * ChatboxAI — Unified Model Registry
 * ═══════════════════════════════════
 * SINGLE SOURCE OF TRUTH for all models.
 *
 * Architecture:
 *   User sends  →  publicId (e.g. "chatboxai/llama-70b")
 *   API resolves → providers[] in priority order
 *   Router calls → first provider that succeeds
 *
 * To add a model: add ONE entry here. No other files need to change.
 *
 * Fields:
 *   id          – unique numeric id
 *   name        – display name shown in the UI
 *   publicId    – the model string your API users pass (stable, never changes)
 *   desc        – short description for UI / docs
 *   isPro       – true = Paid plan only (legacy gate, use accessTier for precise control)
 *   accessTier  – 'free' | 'pro' | 'max' — plan required to access this model
 *   costTier    – 1 (ultra-cheap) … 5 (ultra-premium) — drives budget router
 *   pricing     – per 1K tokens in USD { input, output } — used for dynamic credit calc
 *   providers   – ordered list: first = primary, rest = fallbacks
 *     └ provider  – 'groq' | 'openrouter' | 'google' | 'openai' | 'anthropic' | 'replicate'
 *     └ modelApi  – exact string the provider's API expects
 *
 * Cost Tiers:
 *   Tier 1 – ultra-cheap  : free OpenRouter models, tiny models
 *   Tier 2 – cheap        : Gemini Flash-Lite, small Groq models
 *   Tier 3 – balanced     : Gemini 2.5 Flash, Llama 70B, Qwen3 32B, Kimi K2
 *   Tier 4 – premium      : Gemini Pro, GPT-OSS 120B, Claude Haiku/Sonnet
 *   Tier 5 – ultra-premium: Claude Opus, GPT-5.x, Gemini 3.x Pro
 *
 * Providers supported:
 *   'google'      → Google Generative AI (gemini-*)
 *   'groq'        → Groq Cloud   (openai-compat, baseURL override)
 *   'openrouter'  → OpenRouter   (openai-compat, baseURL override)
 *   'openai'      → OpenAI direct
 *   'anthropic'   → Anthropic SDK
 *   'replicate'   → Replicate    (openai-compat)
 */

export function isFreeModelPublicId(publicId) {
  const pid = String(publicId || "").trim();
  if (pid === "auto") return true;
  const model = MODEL_REGISTRY.find(
    (m) => m.publicId === pid || m.providers.some((p) => p.modelApi === pid),
  );
  return model ? model.isPro === false : false;
}

export function isPaidModelPublicId(publicId) {
  const pid = String(publicId || "").trim();
  if (pid === "auto") return false;
  const model = MODEL_REGISTRY.find(
    (m) => m.publicId === pid || m.providers.some((p) => p.modelApi === pid),
  );
  return model ? model.isPro === true : false;
}

export const MODEL_REGISTRY = [
  // ── 🌟 AUTO (Recommended) ────────────────────────────────────────────────
  {
    id: 1,
    name: "Auto",
    publicId: "auto",
    desc: "Automatic model selection — fastest available model chosen for you",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [],
  },

  // ── 👑 MAX TIER (Ultimate Performance & Reasoning) ────────────────────────
  {
    id: 120,
    name: "Claude Fable 5",
    publicId: "chatboxai/claude-fable-5",
    desc: "Anthropic Claude Fable 5 — next-gen intelligence for hardest knowledge & coding problems",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.015, output: 0.075 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-fable-5" }],
  },
  {
    id: 119,
    name: "Claude Sonnet 5",
    publicId: "chatboxai/claude-sonnet-5",
    desc: "Anthropic Claude Sonnet 5 — frontier-level coding and tool use at Sonnet speed",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.008, output: 0.024 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-sonnet-5" }],
  },
  {
    id: 102,
    name: "Claude Opus 4.6",
    publicId: "chatboxai/claude-opus-4.6",
    desc: "Anthropic Claude Opus 4.6 — state-of-the-art coding, reasoning & agentic capabilities",
    isPro: true,
    accessTier: "max",
    costTier: 5,
    pricing: { input: 0.015, output: 0.075 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-opus-4.6" }],
  },
  {
    id: 101,
    name: "Claude Opus 4.7",
    publicId: "chatboxai/claude-opus-4.7",
    desc: "Anthropic Claude Opus 4.7 — flagship reasoning, vision & multi-step agentic coding",
    isPro: true,
    accessTier: "max",
    costTier: 5,
    pricing: { input: 0.015, output: 0.075 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-opus-4.7" }],
  },


  {
    id: 107,
    name: "GPT-5.6 Sol",
    publicId: "chatboxai/gpt-5.5",
    desc: "OpenAI GPT-5.6 Sol — flagship tier for complex professional work & deep reasoning",
    isPro: true,
    accessTier: "max",
    costTier: 5,
    pricing: { input: 0.012, output: 0.048 },
    providers: [
      { provider: "replicate", modelApi: "openai/gpt-5.6-sol" },
      { provider: "replicate", modelApi: "openai/gpt-5" },
    ],
  },
  {
    id: 121,
    name: "GPT-5",
    publicId: "chatboxai/gpt-5",
    desc: "OpenAI GPT-5 — excels at coding, writing, and reasoning",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.008, output: 0.032 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-5" }],
  },
  {
    id: 122,
    name: "GPT-5 Pro",
    publicId: "chatboxai/gpt-5-pro",
    desc: "OpenAI GPT-5 Pro — smartest & fastest with built-in thinking for expert-level intelligence",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.015, output: 0.06 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-5-pro" }],
  },
  {
    id: 123,
    name: "GPT-5.4",
    publicId: "chatboxai/gpt-5.4",
    desc: "OpenAI GPT-5.4 — most capable frontier model for complex professional work & coding",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.01, output: 0.04 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-5.4" }],
  },

  // ── ⚡ PRO TIER (Advanced Intelligence & Speed) ───────────────────────────
  {
    id: 106,
    name: "Claude 3.7 Sonnet",
    publicId: "chatboxai/claude-3.7-sonnet",
    desc: "Anthropic Claude 3.7 Sonnet — most intelligent Claude, first hybrid reasoning model",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.003, output: 0.015 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-3.7-sonnet" }],
  },
  {
    id: 105,
    name: "Claude 4 Sonnet",
    publicId: "chatboxai/claude-4-sonnet",
    desc: "Anthropic Claude 4 Sonnet — superior coding & reasoning, precise instruction following",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.003, output: 0.015 },
    providers: [
      { provider: "replicate", modelApi: "anthropic/claude-sonnet-4.6" },
      { provider: "replicate", modelApi: "anthropic/claude-4.5-sonnet" },
    ],
  },
  {
    id: 124,
    name: "Claude Sonnet 4.6",
    publicId: "chatboxai/claude-sonnet-4.6",
    desc: "Anthropic Claude Sonnet 4.6 — upgraded coding, computer use & 1M token context window",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.003, output: 0.015 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-sonnet-4.6" }],
  },
  {
    id: 103,
    name: "Claude 4.5 Sonnet",
    publicId: "chatboxai/claude-4.5-sonnet",
    desc: "Anthropic Claude 4.5 Sonnet — best coding model with full dev lifecycle improvements",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.003, output: 0.015 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-4.5-sonnet" }],
  },
  {
    id: 104,
    name: "Claude 4.5 Haiku",
    publicId: "chatboxai/claude-4.5-haiku",
    desc: "Anthropic Claude 4.5 Haiku — similar coding performance at 1/3 cost & 2x speed",
    isPro: true,
    accessTier: "pro",
    costTier: 3,
    pricing: { input: 0.0008, output: 0.004 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-4.5-haiku" }],
  },
  {
    id: 125,
    name: "Claude 3.5 Haiku",
    publicId: "chatboxai/claude-3.5-haiku",
    desc: "Anthropic Claude 3.5 Haiku — fastest, most cost-effective with 200K context window",
    isPro: true,
    accessTier: "pro",
    costTier: 2,
    pricing: { input: 0.0008, output: 0.004 },
    providers: [{ provider: "replicate", modelApi: "anthropic/claude-3.5-haiku" }],
  },
  {
    id: 108,
    name: "GPT-5.2",
    publicId: "chatboxai/gpt-5.0",
    desc: "OpenAI GPT-5.2 — best model for coding and agentic tasks across industries",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.004, output: 0.016 },
    providers: [
      { provider: "replicate", modelApi: "openai/gpt-5.2" },
      { provider: "replicate", modelApi: "openai/gpt-5.1" },
    ],
  },
  {
    id: 109,
    name: "GPT-5.6 Terra",
    publicId: "chatboxai/gpt-4.5-turbo",
    desc: "OpenAI GPT-5.6 Terra — balanced tier for everyday production at half flagship cost",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.006, output: 0.024 },
    providers: [
      { provider: "replicate", modelApi: "openai/gpt-5.6-terra" },
      { provider: "replicate", modelApi: "openai/gpt-5.2" },
    ],
  },
  {
    id: 126,
    name: "GPT-5.1",
    publicId: "chatboxai/gpt-5.1",
    desc: "OpenAI GPT-5.1 — best for coding & agentic tasks with configurable reasoning effort",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.003, output: 0.012 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-5.1" }],
  },
  {
    id: 127,
    name: "GPT-5 Structured",
    publicId: "chatboxai/gpt-5-structured",
    desc: "OpenAI GPT-5 Structured — GPT-5 with structured outputs, web search & custom tools",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: { input: 0.008, output: 0.032 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-5-structured" }],
  },
  {
    id: 128,
    name: "GPT-5.6 Luna",
    publicId: "chatboxai/gpt-5.6-luna",
    desc: "OpenAI GPT-5.6 Luna — cost-optimized for fast, high-volume, latency-sensitive workloads",
    isPro: true,
    accessTier: "pro",
    costTier: 3,
    pricing: { input: 0.003, output: 0.012 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-5.6-luna" }],
  },
  {
    id: 129,
    name: "GPT-5 Mini",
    publicId: "chatboxai/gpt-5-mini",
    desc: "OpenAI GPT-5 Mini — faster version of flagship GPT-5 model",
    isPro: true,
    accessTier: "pro",
    costTier: 3,
    pricing: { input: 0.002, output: 0.008 },
    providers: [
      { provider: "replicate", modelApi: "openai/gpt-5-mini" },
      { provider: "replicate", modelApi: "openai/gpt-4o-mini" },
    ],
  },
  {
    id: 8,
    name: "GPT-OSS 120B",
    publicId: "chatboxai/gpt-oss-120b",
    supportsNativeReasoning: true,
    desc: "OpenAI OSS 120B — top reasoning & knowledge synthesis",
    isPro: false,
    accessTier: "free",
    costTier: 4,
    pricing: {
      input: 0.0009,
      output: 0.0009,
    },
    providers: [
      {
        provider: "nvidia",
        modelApi: "openai/gpt-oss-120b",
      },
    ],
  },
  {
    id: 31,
    name: "Gemini 3.5 Flash",
    publicId: "chatboxai/gemini-3.5-flash",
    desc: "Google Gemini 3.5 Flash — most intelligent, frontier agentic & coding",
    isPro: true,
    accessTier: "pro",
    costTier: 4,
    pricing: {
      input: 0.0015,
      output: 0.006,
    },
    providers: [
      {
        provider: "google",
        modelApi: "gemini-3.5-flash",
      },
    ],
  },

  // ── 🚀 FREE TIER (High Performance) ───────────────────────────────────────
  {
    id: 52,
    name: "Lyria 3 Pro Preview",
    publicId: "chatboxai/lyria-3-pro",
    desc: "Google Lyria 3 Pro Preview — multimodal and creative intelligence",
    isPro: false,
    accessTier: "free",
    costTier: 3,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "google/lyria-3-pro-preview",
      },
    ],
  },
  {
    id: 33,
    name: "Gemini 3.1 Flash-Lite",
    publicId: "chatboxai/gemini-3.1-flash-lite",
    desc: "Google Gemini 3.1 Flash-Lite — frontier performance at fraction of cost",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0.0002,
      output: 0.0008,
    },
    providers: [
      {
        provider: "google",
        modelApi: "gemini-3.1-flash-lite",
      },
    ],
  },
  {
    id: 34,
    name: "Gemini 2.5 Flash-Lite",
    publicId: "chatboxai/gemini-2.5-flash-lite",
    desc: "Google Gemini 2.5 Flash-Lite — fastest, most budget-friendly multimodal",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0.0001,
      output: 0.0004,
    },
    providers: [
      {
        provider: "google",
        modelApi: "gemini-2.5-flash-lite",
      },
    ],
  },
  {
    id: 4,
    name: "Llama 3.3 70B",
    publicId: "chatboxai/llama-3.3-70b",
    desc: "Meta Llama 3.3 70B — best open-source quality",
    isPro: false,
    accessTier: "free",
    costTier: 3,
    pricing: {
      input: 0.00059,
      output: 0.00079,
    },
    providers: [
      {
        provider: "groq",
        modelApi: "llama-3.3-70b-versatile",
      },
      {
        provider: "nvidia",
        modelApi: "meta/llama-3.1-70b-instruct",
      },
    ],
  },
  ,
  {
    id: 51,
    name: "Nemotron 3 Super 120B",
    publicId: "chatboxai/nemotron-3-super",
    desc: "NVIDIA Nemotron 3 Super 120B — high performance agentic model",
    isPro: false,
    accessTier: "free",
    costTier: 3,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "nvidia/nemotron-3-super-120b-a12b:free",
      },
    ],
  },
  {
    id: 50,
    name: "Nemotron 3 Ultra 550B",
    publicId: "chatboxai/nemotron-3-ultra",
    desc: "NVIDIA Nemotron 3 Ultra 550B — massive scale reasoning and knowledge",
    isPro: false,
    accessTier: "free",
    costTier: 3,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "nvidia/nemotron-3-ultra-550b-a55b:free",
      },
    ],
  },
  ,
  ,
  ,
  {
    id: 53,
    name: "Gemma 4 31B",
    publicId: "chatboxai/gemma-4-31b",
    desc: "Google Gemma 4 31B — fast and intelligent instruction tuned model",
    isPro: false,
    accessTier: "free",
    costTier: 3,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "google/gemma-4-31b-it:free",
      },
    ],
  },
  {
    id: 54,
    name: "Laguna M.1",
    publicId: "chatboxai/laguna-m1",
    desc: "Poolside Laguna M.1 — optimized for coding and complex logic",
    isPro: false,
    accessTier: "free",
    costTier: 3,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "poolside/laguna-m.1:free",
      },
    ],
  },

  // ── 🛠️ FREE TIER (Medium & Specialized) ───────────────────────────────────
  {
    id: 9,
    name: "GPT-OSS 20B Fast",
    publicId: "chatboxai/gpt-oss-20b",
    supportsNativeReasoning: true,
    desc: "OpenAI OSS 20B — ultra-fast, ~1000 tokens/sec",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0.0006,
      output: 0.0006,
    },
    providers: [
      {
        provider: "groq",
        modelApi: "openai/gpt-oss-20b",
      },
    ],
  },
  {
    id: 24,
    name: "GPT-OSS 20B",
    publicId: "chatboxai/gpt-oss-20b",
    supportsNativeReasoning: true,
    desc: "OpenAI GPT-OSS 20B — MoE, tool use",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "openai/gpt-oss-20b:free",
      },
    ],
  },
  {
    id: 56,
    name: "Lyria 3 Clip Preview",
    publicId: "chatboxai/lyria-3-clip",
    desc: "Google Lyria 3 Clip Preview — highly optimized preview model",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "google/lyria-3-clip-preview",
      },
    ],
  },
  ,
  {
    id: 44,
    name: "Qwen 3.6 27B",
    publicId: "chatboxai/qwen-3.6-27b",
    desc: "Qwen 3.6 27B — Balanced capabilities for reasoning and coding",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "groq",
        modelApi: "qwen/qwen3.6-27b",
      },
    ],
  },
  {
    id: 42,
    name: "Groq Compound",
    publicId: "chatboxai/groq-compound",
    desc: "Groq Compound — Balanced composite model routing",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "groq",
        modelApi: "groq/compound",
      },
    ],
  },
  ,
  ,
  {
    id: 55,
    name: "Gemma 4 26B A4B",
    publicId: "chatboxai/gemma-4-26b",
    desc: "Google Gemma 4 26B A4B — MoE based fast inference",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "google/gemma-4-26b-a4b-it:free",
      },
    ],
  },
  {
    id: 58,
    name: "Laguna S 2.1",
    publicId: "chatboxai/laguna-s",
    desc: "Poolside Laguna S 2.1 — balanced code and logic model",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "poolside/laguna-s-2.1:free",
      },
    ],
  },
  {
    id: 57,
    name: "Ling 3.0 Flash",
    publicId: "chatboxai/ling-3-flash",
    desc: "InclusionAI Ling 3.0 Flash — extremely fast response generation",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "inclusionai/ling-3.0-flash:free",
      },
    ],
  },
  ,
  ,
  // ── 🍃 FREE TIER (Lightweight & Compact) ──────────────────────────────────
  {
    id: 10,
    name: "Llama 3.1 8B Turbo",
    publicId: "chatboxai/llama-3.1-8b",
    desc: "Meta Llama 3.1 8B — ultra-fast, high-volume fallback",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0.00005,
      output: 0.00008,
    },
    providers: [
      {
        provider: "groq",
        modelApi: "llama-3.1-8b-instant",
      },
      {
        provider: "nvidia",
        modelApi: "meta/llama-3.1-8b-instruct",
      },
    ],
  },
  {
    id: 43,
    name: "Groq Compound Mini",
    publicId: "chatboxai/groq-compound-mini",
    desc: "Groq Compound Mini — Fast composite routing",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "groq",
        modelApi: "groq/compound-mini",
      },
    ],
  },
  {
    id: 25,
    name: "Nemotron 3 Nano 30B",
    publicId: "chatboxai/nemotron-3-nano",
    supportsNativeReasoning: true,
    desc: "NVIDIA Nemotron 3 Nano 30B — MoE, agentic, balanced",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "nvidia/nemotron-3-nano-30b-a3b:free",
      },
    ],
  },
  {
    id: 36,
    name: "Nemotron 3 Nano Omni Reasoning",
    publicId: "chatboxai/nemotron-3-nano-omni-reasoning",
    supportsNativeReasoning: true,
    desc: "NVIDIA Nemotron 3 Nano Omni 30B — omni-modal reasoning model",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "nvidia",
        modelApi: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      },
    ],
  },
  {
    id: 20,
    name: "Nemotron Nano 12B VL",
    publicId: "chatboxai/nemotron-nano-vl",
    desc: "NVIDIA Nemotron Nano — video, document, OCR intelligence",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "nvidia/nemotron-nano-12b-v2-vl:free",
      },
    ],
  },
  {
    id: 59,
    name: "Nemotron Nano 9B V2",
    publicId: "chatboxai/nemotron-nano-9b",
    desc: "NVIDIA Nemotron Nano 9B V2 — compact and efficient edge model",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "nvidia/nemotron-nano-9b-v2:free",
      },
    ],
  },
  {
    id: 41,
    name: "ALLAM 2 7B",
    publicId: "chatboxai/allam-2-7b",
    desc: "ALLAM 2 7B — Lightweight and extremely fast inference",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "groq",
        modelApi: "allam-2-7b",
      },
    ],
  },
  {
    id: 60,
    name: "Laguna XS 2.1",
    publicId: "chatboxai/laguna-xs",
    desc: "Poolside Laguna XS 2.1 — lightweight specialized model",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "poolside/laguna-xs-2.1:free",
      },
    ],
  },
  {
    id: 61,
    name: "North Mini Code",
    publicId: "chatboxai/north-mini-code",
    desc: "Cohere North Mini Code — compact code completion assistant",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: {
      input: 0,
      output: 0,
    },
    providers: [
      {
        provider: "openrouter",
        modelApi: "cohere/north-mini-code:free",
      },
    ],
  },

  // ── NVIDIA Llama 3.2 Additions ────────────────────────────────────────────────
  {
    id: 110,
    name: "Llama 3.2 1B Instruct",
    publicId: "chatboxai/llama-3.2-1b",
    desc: "Meta Llama 3.2 1B — fast lightweight model",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: { input: 0, output: 0 },
    providers: [{ provider: "nvidia", modelApi: "meta/llama-3.2-1b-instruct" }],
  },
  {
    id: 111,
    name: "Llama 3.2 11B Vision",
    publicId: "chatboxai/llama-3.2-11b-vision",
    desc: "Meta Llama 3.2 11B Vision — multimodal vision support",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: { input: 0, output: 0 },
    providers: [
      { provider: "nvidia", modelApi: "meta/llama-3.2-11b-vision-instruct" },
    ],
  },
  {
    id: 112,
    name: "Llama 3.2 90B Vision",
    publicId: "chatboxai/llama-3.2-90b-vision",
    desc: "Meta Llama 3.2 90B Vision — flagship multimodal model",
    isPro: false,
    accessTier: "free",
    costTier: 3,
    pricing: { input: 0, output: 0 },
    providers: [
      { provider: "nvidia", modelApi: "meta/llama-3.2-90b-vision-instruct" },
    ],
  },
  {
    id: 113,
    name: "MiniMax M3",
    publicId: "chatboxai/minimax-m3",
    desc: "MiniMax M3 — high efficiency reasoning model",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: { input: 0, output: 0 },
    providers: [{ provider: "nvidia", modelApi: "minimaxai/minimax-m3" }],
  },
  {
    id: 114,
    name: "StepFun Step 3.7 Flash",
    publicId: "chatboxai/step-3.7-flash",
    desc: "StepFun 3.7 Flash — optimized for speed and complex tasks",
    isPro: false,
    accessTier: "free",
    costTier: 2,
    pricing: { input: 0, output: 0 },
    providers: [{ provider: "nvidia", modelApi: "stepfun-ai/step-3.7-flash" }],
  },

  // ── 🤖 REPLICATE FREE TIER (OpenAI lightweight models) ────────────────────
  {
    id: 130,
    name: "GPT-5 Nano",
    publicId: "chatboxai/gpt-5-nano",
    desc: "OpenAI GPT-5 Nano — fastest, most cost-effective GPT-5 model",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: { input: 0.0001, output: 0.0004 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-5-nano" }],
  },
  {
    id: 131,
    name: "GPT-4o Mini",
    publicId: "chatboxai/gpt-4o-mini",
    desc: "OpenAI GPT-4o Mini — low latency, low cost version of GPT-4o",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: { input: 0.00015, output: 0.0006 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-4o-mini" }],
  },
  {
    id: 132,
    name: "GPT-4.1 Nano",
    publicId: "chatboxai/gpt-4.1-nano",
    desc: "OpenAI GPT-4.1 Nano — fastest, most cost-effective GPT-4.1 model",
    isPro: false,
    accessTier: "free",
    costTier: 1,
    pricing: { input: 0.0001, output: 0.0004 },
    providers: [{ provider: "replicate", modelApi: "openai/gpt-4.1-nano" }],
  },
].filter(Boolean);


// ── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Find a model by its publicId (what users pass in the API request).
 * Also accepts the raw modelApi string for backwards compat.
 * @param {string} id
 * @returns {object|null}
 */
export function findModel(id) {
  if (!id || id === "auto") return MODEL_REGISTRY[0];
  return (
    MODEL_REGISTRY.find((m) => m.publicId === id) ||
    MODEL_REGISTRY.find((m) => m.providers.some((p) => p.modelApi === id)) ||
    null
  );
}

export function supportsNativeReasoning(publicId) {
  const model = findModel(publicId);
  return model?.supportsNativeReasoning === true;
}

/**
 * Check if a publicId is valid (registered in the registry).
 * @param {string} id
 * @returns {boolean}
 */
export function isRegisteredModel(id) {
  if (id === "auto") return true;
  return MODEL_REGISTRY.some(
    (m) => m.publicId === id || m.providers.some((p) => p.modelApi === id),
  );
}

/**
 * Get all models, grouped by their primary provider.
 * @returns {Record<string, object[]>}
 */
export function getModelsByProvider() {
  return MODEL_REGISTRY.filter((m) => m.publicId !== "auto").reduce(
    (acc, model) => {
      const key = model.providers[0]?.provider ?? "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(model);
      return acc;
    },
    {},
  );
}

/**
 * Get only free-tier models.
 * @returns {object[]}
 */
export function getFreeModels() {
  return MODEL_REGISTRY.filter((m) => isFreeModelPublicId(m.publicId));
}

/**
 * Get only pro-tier models.
 * @returns {object[]}
 */
export function getProModels() {
  return MODEL_REGISTRY.filter((m) => isPaidModelPublicId(m.publicId));
}

/**
 * Get models accessible for a given plan.
 * Uses accessTier field for precise plan gating.
 * @param {'free'|'pro'|'max'} plan
 * @returns {object[]}
 */
export function getModelsForPlan(plan) {
  const tier = String(plan || "free").toLowerCase();
  return MODEL_REGISTRY.filter((m) => {
    if (tier === "max") return true;
    if (tier === "pro") return m.accessTier !== "max";
    return m.accessTier === "free";
  });
}

/**
 * Derive a flat AIModelsOption-compatible array for the UI.
 * Each model is represented by its primary provider.
 * @returns {object[]}
 */
export function toUIModels() {
  return MODEL_REGISTRY.map((m) => ({
    id: m.id,
    name: m.name,
    desc: m.desc,
    modelApi: m.publicId, // what the UI sends to the API
    provider: m.providers[0]?.provider ?? "mixed",
    isPro: isPaidModelPublicId(m.publicId),
    accessTier: m.accessTier ?? "free",
    costTier: m.costTier ?? 2,
  }));
}
