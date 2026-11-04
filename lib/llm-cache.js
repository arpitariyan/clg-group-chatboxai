/**
 * ChatBox AI — Performance & Cost Cache Engine (Phase 9)
 * ═════════════════════════════════════════════════════════
 * In-memory TTL cache and request deduplication for expensive LLM/Tool queries.
 * Prevents duplicate API calls and reduces credit consumption.
 */

export class LLMCacheEngine {
  constructor(defaultTTLMs = 300000) { // Default 5 minutes TTL
    this.cache = new Map();
    this.defaultTTLMs = defaultTTLMs;
  }

  /**
   * Generate cache key from input prompt, model, and parameters.
   */
  makeKey(prompt, modelId, params = {}) {
    const normPrompt = String(prompt || '').trim().toLowerCase();
    const normModel = String(modelId || 'default').toLowerCase();
    const paramsKey = JSON.stringify(params);
    return `${normModel}:${normPrompt}:${paramsKey}`;
  }

  /**
   * Get cached result if valid and not expired.
   */
  get(prompt, modelId, params = {}) {
    const key = this.makeKey(prompt, modelId, params);
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Store result in cache.
   */
  set(prompt, modelId, params = {}, data, ttlMs = null) {
    const key = this.makeKey(prompt, modelId, params);
    const expiresAt = Date.now() + (ttlMs || this.defaultTTLMs);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Clear expired entries.
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const globalLLMCache = new LLMCacheEngine();
