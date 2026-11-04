// Source: https://chatboxai.co.in/docs/models. Names, IDs, tiers and
// purposes are copied from the docs. The directory groups by the docs' own categories and tiers.
export type ModelTier = "Free" | "Paid";
export type ModelCategory = "Chat" | "Deep Research" | "Image" | "Audio";

export interface CatalogModel {
  name: string;
  id: string;
  tier: ModelTier;
  category: ModelCategory;
  purpose: string;
}

export const DOCS_URL = "/docs";
export const MODELS_DOCS_URL = "/docs/models";

export const categoryInfo: Record<ModelCategory, string> = {
  Chat: "Everyday conversation, writing, extraction and normal queries.",
  "Deep Research": "Multi-step reasoning, agents, tool use and web research workflows.",
  Image: "Used with the POST /api/v1/images/generations endpoint.",
  Audio: "Used with the POST /api/v1/audio/speech endpoint for text-to-speech.",
};

export const models: CatalogModel[] = [
  {
    name: "Llama 3.3 70B",
    id: "chatboxai/llama-3.3-70b",
    tier: "Free",
    category: "Chat",
    purpose:
      "Best overall open-source model. Excellent for general chat, creative writing, and robust instruction following.",
  },
  {
    name: "Gemini 2.5 Flash",
    id: "chatboxai/gemini-2.5-flash",
    tier: "Free",
    category: "Chat",
    purpose:
      "Extremely fast, next-generation multimodal model. Best for high-speed text and vision tasks.",
  },
  {
    name: "Qwen3 32B",
    id: "chatboxai/qwen3-32b",
    tier: "Free",
    category: "Chat",
    purpose: "Strong coding and logic reasoning. Ideal for general-purpose programming queries.",
  },
  {
    name: "Qwen 3.6 Plus Preview",
    id: "chatboxai/qwen-3.6-plus",
    tier: "Free",
    category: "Chat",
    purpose: "Advanced multi-turn conversation and coding logic.",
  },
  {
    name: "Mistral Small 3.1",
    id: "chatboxai/mistral-small-3.1",
    tier: "Free",
    category: "Chat",
    purpose: "Fast and lightweight with native function calling support.",
  },
  {
    name: "GLM 4.5 Air",
    id: "chatboxai/glm-4.5-air",
    tier: "Free",
    category: "Chat",
    purpose: "Built-in chain-of-thought processing for structured problem solving.",
  },
  {
    name: "Llama 3.1 8B Turbo",
    id: "chatboxai/llama-3.1-8b",
    tier: "Free",
    category: "Chat",
    purpose: "Ultra-fast, high-throughput model. Best for simple queries and API fallback.",
  },
  {
    name: "Gemma 3 27B",
    id: "chatboxai/gemma-3-27b",
    tier: "Free",
    category: "Chat",
    purpose: "Highly capable, balanced text and vision processing.",
  },
  {
    name: "Claude Opus 4.7",
    id: "chatboxai/claude-opus-4.7",
    tier: "Paid",
    category: "Chat",
    purpose:
      "Flagship reasoning. Best for highly complex problem solving, deep analysis, and high-fidelity content generation.",
  },
  {
    name: "Claude 4.5 Sonnet",
    id: "chatboxai/claude-4.5-sonnet",
    tier: "Paid",
    category: "Chat",
    purpose:
      "Perfect balance of speed and top-tier intelligence. Ideal for versatile everyday tasks.",
  },
  {
    name: "Gemini 2.5 Pro",
    id: "chatboxai/gemini-2.5-pro",
    tier: "Paid",
    category: "Chat",
    purpose:
      "Premium performance with massive context (up to 2M tokens). Best for analyzing entire codebases or huge document sets.",
  },
  {
    name: "Qwen3 Coder 480B",
    id: "chatboxai/qwen3-coder",
    tier: "Paid",
    category: "Chat",
    purpose:
      "Heavy-duty coding. Best for building complex applications and debugging huge codebases.",
  },
  {
    name: "GPT-OSS 120B",
    id: "chatboxai/gpt-oss-120b",
    tier: "Paid",
    category: "Chat",
    purpose: "Top-tier open-source synthesis and architectural design.",
  },
  {
    name: "Kimi K2",
    id: "chatboxai/kimi-k2",
    tier: "Free",
    category: "Deep Research",
    purpose:
      "Highly optimized for agentic workflows and tool usage. Capable of handling deep web searches and synthesizing information autonomously.",
  },
  {
    name: "NVIDIA Nemotron 3 Super",
    id: "chatboxai/nemotron-3-super",
    tier: "Paid",
    category: "Deep Research",
    purpose:
      "Massive 1M context window combined with deep agentic reasoning. Best for orchestrating complex research workflows over massive document libraries.",
  },
  {
    name: "Hermes 3 405B",
    id: "chatboxai/hermes-3-405b",
    tier: "Paid",
    category: "Deep Research",
    purpose:
      "Frontier reasoning and strict tool-use. Best for handling multi-step logic puzzles and autonomous agents.",
  },
  {
    name: "Trinity Large Preview",
    id: "chatboxai/trinity-large",
    tier: "Paid",
    category: "Deep Research",
    purpose:
      "Massive 400B MoE model. Best for expansive, complex persona adoption during agentic interactions.",
  },
  {
    name: "FLUX Schnell",
    id: "chatboxai/image-flux-schnell",
    tier: "Free",
    category: "Image",
    purpose:
      "High-speed image generation. Ideal for rapid visual prototyping and quick concept art.",
  },
  {
    name: "FLUX Dev",
    id: "chatboxai/image-flux-dev",
    tier: "Paid",
    category: "Image",
    purpose:
      "Ultra-high-quality image generation. Best for production-ready artwork, hyper-realistic photos, and detailed visuals.",
  },
  {
    name: "Stable Diffusion 3.5",
    id: "chatboxai/image-stable-diffusion-3.5",
    tier: "Paid",
    category: "Image",
    purpose:
      "Highly flexible generation. Best for complex prompt adherence and highly stylized artistic rendering.",
  },
  {
    name: "Stable Diffusion XL",
    id: "chatboxai/image-sdxl",
    tier: "Paid",
    category: "Image",
    purpose:
      "Cinematic and photographic visuals. Best for highly realistic character portraits and environments.",
  },
  {
    name: "TTS-1",
    id: "tts-1",
    tier: "Free",
    category: "Audio",
    purpose:
      "Standard text-to-speech for everyday voice generation and basic app accessibility features.",
  },
  {
    name: "TTS-1 HD",
    id: "tts-1-hd",
    tier: "Paid",
    category: "Audio",
    purpose:
      "High-definition, low-noise audio generation. Best for professional voiceovers, podcasts, and media production.",
  },
];

export const extraFreeIds = ["llama-3.2-3b", "qwen3-next-80b", "minimax-m2.5", "nemotron-3-nano"];
