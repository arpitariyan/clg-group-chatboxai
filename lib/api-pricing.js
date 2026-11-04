/**
 * Token Metering & Pricing Engine
 * Derives pricing from MODEL_REGISTRY using publicId as the key.
 * Adding a model to lib/models-registry.js with a pricing field
 * is all you need — no manual changes here.
 */

import { MODEL_REGISTRY, isPaidModelPublicId } from '@/lib/models-registry.js';

// ── Build PRICING_MATRIX from MODEL_REGISTRY ─────────────────────────────────
export const PRICING_MATRIX = {};

MODEL_REGISTRY.forEach((model) => {
  if (!model.publicId) return;
  PRICING_MATRIX[model.publicId] = {
    input:    model.pricing?.input  ?? 0,
    output:   model.pricing?.output ?? 0,
    provider: model.providers?.[0]?.provider ?? 'unknown',
  };
});

// ── Specialized call pricing ──────────────────────────────────────────────────
export const SPECIALIZED_PRICING = {
  search_call:           0.001,
  embeddings_1k_tokens:  0.00002,
  file_parsing_page:     0.0001,
  image_generation:      0.01,   // per image generated
  code_execution:        0.001,
  tts_per_1k_chars:      0.015,  // per 1,000 characters of TTS input
};

/**
 * Calculate cost for a chat completion using the publicId.
 * @param {string} publicId
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number} Cost in USD
 */
export function calculateChatCost(publicId, inputTokens, outputTokens) {
  const pricing = PRICING_MATRIX[publicId];
  if (!pricing) return 0;
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

export function calculateEmbeddingsCost(tokens) {
  return (tokens / 1000) * SPECIALIZED_PRICING.embeddings_1k_tokens;
}

export function calculateSearchCost(count = 1) {
  return count * SPECIALIZED_PRICING.search_call;
}

/**
 * Calculate cost for image generation.
 * @param {number} count - Number of images generated
 * @returns {number} Cost in credits
 */
export function calculateImageCost(count = 1) {
  return count * 1;
}

/**
 * Calculate cost for text-to-speech.
 * @param {string} text - Input text
 * @returns {number} Cost in USD
 */
export function calculateAudioCost(text = '') {
  return (text.length / 1000) * SPECIALIZED_PRICING.tts_per_1k_chars;
}

/**
 * Get all models as an OpenAI-compatible list.
 * Only public-facing fields are returned — provider details are never exposed.
 * @returns {Array}
 */
export function getAllModels() {
  return MODEL_REGISTRY
    .filter((m) => m.publicId !== 'auto')
    .map((m) => ({
      id:      m.publicId,     // e.g. "chatboxai/llama-3.3-70b"
      object:  'model',
      owned_by: 'chatboxai',  // always ChatboxAI — provider is never disclosed
      name:    m.name,
      description: m.desc,
      is_pro:  isPaidModelPublicId(m.publicId),
      pricing: m.pricing,
      created: Math.floor(Date.now() / 1000),
    }));
}
