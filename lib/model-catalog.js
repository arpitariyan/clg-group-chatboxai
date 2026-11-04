/**
 * ChatboxAI — Model Catalog
 * ═══════════════════════════════════════════════════════
 * DB-driven model rates engine.
 *
 * Reads model rates from the `model_catalog` Appwrite collection.
 * Falls back to MODEL_REGISTRY (hardcoded) if DB is unavailable.
 *
 * Credit Formula (from master spec):
 *   inputUnits  = ceil(prompt_tokens / 100)
 *   outputUnits = ceil(completion_tokens / 100)
 *   creditsUsed = (inputUnits × inputRate) + (outputUnits × outputRate)
 *
 * Tool / Image costs are also stored in the DB (category = 'tool' or 'image').
 */

import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { MODEL_REGISTRY } from '@/lib/models-registry';

// Collection ID — must be set in env or Appwrite console
export const MODEL_CATALOG_COLLECTION_ID =
  process.env.APPWRITE_MODEL_CATALOG_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_MODEL_CATALOG_COLLECTION_ID ||
  'model_catalog';

// ── In-process cache ──────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let _catalogCache = null;
let _cacheExpiresAt = 0;

/**
 * Fetch the full model catalog from Appwrite, with TTL caching.
 * Returns an array of catalog documents.
 */
export async function getModelCatalog({ forceRefresh = false } = {}) {
  if (!forceRefresh && _catalogCache && Date.now() < _cacheExpiresAt) {
    return _catalogCache;
  }

  const hasConfig = Boolean(DB_ID && process.env.APPWRITE_API_KEY);
  if (!hasConfig) {
    console.warn('[ModelCatalog] Appwrite not configured — using fallback registry rates.');
    return [];
  }

  try {
    const res = await databases.listDocuments(DB_ID, MODEL_CATALOG_COLLECTION_ID, [
      Query.equal('is_enabled', true),
      Query.limit(200),
    ]);
    _catalogCache = res.documents || [];
    _cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return _catalogCache;
  } catch (err) {
    console.warn('[ModelCatalog] Failed to load from DB:', err?.message, '— using fallback.');
    return _catalogCache || []; // return stale cache if available
  }
}

/**
 * Invalidate the in-process cache (e.g. after admin updates a rate).
 */
export function invalidateModelCatalogCache() {
  _catalogCache = null;
  _cacheExpiresAt = 0;
}

/**
 * Build a fallback rate map from the hardcoded MODEL_REGISTRY.
 * Used when the DB catalog is unavailable.
 *
 * Fallback rates (per 100 tokens):
 *   Free-tier models  → input: 1, output: 2
 *   Paid-tier models  → input: 5, output: 7
 */
function buildFallbackRateMap() {
  const map = {};
  for (const model of MODEL_REGISTRY) {
    const isFree = (model.accessTier || 'free') === 'free';
    map[model.publicId] = {
      publicId: model.publicId,
      name: model.name,
      category: isFree ? 'free' : 'paid',
      inputRate: isFree ? 1 : 5,
      outputRate: isFree ? 2 : 7,
      isEnabled: true,
      isFallback: true,
    };
  }
  return map;
}

/**
 * Get the rate info for a specific model by its publicId.
 *
 * @param {string} publicId – e.g. 'chatboxai/gemini-2.5-flash'
 * @returns {Promise<{ publicId, name, category, inputRate, outputRate, isEnabled }>}
 */
export async function getModelRate(publicId) {
  const catalog = await getModelCatalog();
  const entry = catalog.find((doc) => doc.public_id === publicId);

  if (entry) {
    return {
      publicId: entry.public_id,
      name: entry.name,
      category: entry.category, // 'free' | 'paid'
      inputRate: Number(entry.input_rate ?? 1),
      outputRate: Number(entry.output_rate ?? 2),
      isEnabled: entry.is_enabled !== false,
    };
  }

  // Fallback to registry
  const fallbackMap = buildFallbackRateMap();
  return (
    fallbackMap[publicId] ?? {
      publicId,
      name: publicId,
      category: 'free',
      inputRate: 1,
      outputRate: 2,
      isEnabled: true,
      isFallback: true,
    }
  );
}

/**
 * Get rate info for a tool (deep_search, web_search, etc.)
 *
 * @param {string} toolKey – e.g. 'deep_search', 'web_search'
 * @returns {Promise<{ fixedCost: number }>}
 */
export async function getToolRate(toolKey) {
  const catalog = await getModelCatalog();
  // Tools are stored with category = 'tool' and the tool key as public_id
  const entry = catalog.find(
    (doc) => doc.category === 'tool' && doc.public_id === toolKey
  );

  const TOOL_DEFAULTS = {
    deep_search: 100,
    website_builder: 250,
    code_interpreter: 80,
    web_search: 25,
    tts: 10,
    embeddings: 5,
  };

  const fixedCost = entry ? Number(entry.input_rate ?? 0) : (TOOL_DEFAULTS[toolKey] ?? 10);
  return { fixedCost };
}

/**
 * Get rate info for an image model.
 *
 * @param {string} imageModelKey – e.g. 'flux', 'gpt_image', 'dalle'
 * @returns {Promise<{ fixedCost: number }>}
 */
export async function getImageRate(imageModelKey) {
  const catalog = await getModelCatalog();
  const entry = catalog.find(
    (doc) => doc.category === 'image' && doc.public_id === imageModelKey
  );

  const IMAGE_DEFAULTS = {
    flux: 120,
    imagen: 180,
    gpt_image: 250,
    dalle: 300,
    sdxl: 80,
  };

  const fixedCost = entry ? Number(entry.input_rate ?? 120) : (IMAGE_DEFAULTS[imageModelKey] ?? 120);
  return { fixedCost };
}

/**
 * Calculate credit cost for a chat/completion request.
 *
 * Formula (per master spec):
 *   inputUnits  = ceil(promptTokens / 100)
 *   outputUnits = ceil(completionTokens / 100)
 *   creditsUsed = (inputUnits × inputRate) + (outputUnits × outputRate)
 *
 * @param {string} publicId
 * @param {number} promptTokens
 * @param {number} completionTokens
 * @returns {Promise<{ creditsUsed: number, category: string, inputRate: number, outputRate: number }>}
 */
export async function calculateChatCredits(publicId, promptTokens = 0, completionTokens = 0) {
  const rate = await getModelRate(publicId);

  const inputUnits = Math.ceil(promptTokens / 100);
  const outputUnits = Math.ceil(completionTokens / 100);
  const creditsUsed = inputUnits * rate.inputRate + outputUnits * rate.outputRate;

  return {
    creditsUsed: Math.max(1, creditsUsed), // minimum 1 credit per request
    category: rate.category,
    inputRate: rate.inputRate,
    outputRate: rate.outputRate,
  };
}

/**
 * Get the model category ('free' | 'paid') from the catalog.
 * Used to decide which wallet to deduct from.
 *
 * @param {string} publicId
 * @returns {Promise<'free' | 'paid'>}
 */
export async function getModelCategory(publicId) {
  const rate = await getModelRate(publicId);
  return rate.category;
}
