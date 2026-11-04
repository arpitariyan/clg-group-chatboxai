/**
 * API Key Manager - Intelligent Key Rotation with Error Tracking
 *
 * FIXES:
 * FIX A — Backoff no longer compounds across retries for same key.
 *         Old: delay * retries  → 70s, 140s, 210s… keys locked way longer than sleep
 *         New: flat delayMs passed in, just track retries for logging
 * FIX B — resetForGeneration() lets functions.js reset state at start of each
 *         generation so stale rate-limit state from a previous run never blocks a new one.
 * FIX C — hasAvailableKey() now also clears expired rate limits while scanning,
 *         so keys that cooled down are immediately visible.
 */

class APIKeyManager {
    constructor(keyConfigName, keys) {
        this.keyConfigName = keyConfigName;
        this.keys = keys.filter(k => k && typeof k === 'string' && k.trim());
        this.failedKeys = new Set();
        this.rateLimitedKeys = new Map(); // key → { until: timestamp, retries: number }
        this.currentIndex = 0;
        this.stats = {
            totalAttempts: 0,
            successCount: 0,
            failureCount: 0,
            rateLimitCount: 0,
            lastUsedKey: null
        };
    }

    getNextKey(taskId = null) {
        if (this.keys.length === 0) return null;

        // FIX C: clear expired rate limits before scanning
        const now = Date.now();
        for (const [key, data] of this.rateLimitedKeys.entries()) {
            if (now >= data.until) {
                this.rateLimitedKeys.delete(key);
            }
        }

        const availableIndices = [];
        for (let i = 0; i < this.keys.length; i++) {
            const key = this.keys[i];
            if (this.failedKeys.has(key)) continue;
            if (this.rateLimitedKeys.has(key)) continue;
            availableIndices.push(i);
        }

        if (availableIndices.length === 0) {
            console.warn(`[${this.keyConfigName}] All keys exhausted or rate-limited`);
            return null;
        }

        let nextIndex;
        if (taskId !== null && typeof taskId === 'number') {
            const targetIndex = (taskId - 1) % this.keys.length;
            if (availableIndices.includes(targetIndex)) {
                nextIndex = targetIndex;
            }
        }

        if (nextIndex === undefined) {
            nextIndex = availableIndices.find(i => i >= this.currentIndex) ?? availableIndices[0];
        }

        this.currentIndex = (nextIndex + 1) % this.keys.length;
        const key = this.keys[nextIndex];
        this.stats.lastUsedKey = `Key #${nextIndex + 1}/${this.keys.length}`;
        return key;
    }

    hasAvailableKey() {
        if (this.keys.length === 0) return false;

        // FIX C: clear expired rate limits first
        const now = Date.now();
        for (const [key, data] of this.rateLimitedKeys.entries()) {
            if (now >= data.until) {
                this.rateLimitedKeys.delete(key);
            }
        }

        for (const key of this.keys) {
            if (this.failedKeys.has(key)) continue;
            if (this.rateLimitedKeys.has(key)) continue;
            return true;
        }
        return false;
    }

    recordSuccess(key) {
        this.stats.successCount++;
        this.stats.totalAttempts++;
    }

    // FIX A: flat delay — no exponential multiplication
    recordRateLimit(key, delayMs = 60_000) {
        const existing = this.rateLimitedKeys.get(key);
        const retries = (existing?.retries ?? 0) + 1;

        // Flat: just use the delayMs passed in (caller controls backoff)
        // Cap at 3 minutes max so keys don't stay locked forever
        const cooldown = Math.min(delayMs, 3 * 60 * 1000);
        const until = Date.now() + cooldown;

        this.rateLimitedKeys.set(key, { until, retries });
        this.stats.rateLimitCount++;
        this.stats.totalAttempts++;

        const keyNum = this.keys.indexOf(key) + 1;
        console.warn(
            `[${this.keyConfigName}] 429 Rate Limit on Key #${keyNum}. ` +
            `Cooldown ${Math.round(cooldown / 1000)}s (retry ${retries})`
        );
    }

    recordFailure(key, error = '') {
        const keyNum = this.keys.indexOf(key) + 1;
        const errLower = error.toLowerCase();

        // 429, 404, 400 are soft — key itself is fine
        const isTemporary =
            errLower.includes('429') ||
            errLower.includes('rate_limit') ||
            errLower.includes('404') ||
            errLower.includes('400');

        if (!isTemporary) {
            this.failedKeys.add(key);
            console.error(`[${this.keyConfigName}] ❌ Key #${keyNum} failed permanently: ${error.slice(0, 80)}`);
        } else {
            console.warn(`[${this.keyConfigName}] ⚠️ Key #${keyNum} soft fail (not permanently disabled): ${error.slice(0, 80)}`);
        }

        this.stats.failureCount++;
        this.stats.totalAttempts++;
    }

    getHealthyKeys() {
        return this.keys.filter(k => !this.failedKeys.has(k));
    }

    getStats() {
        return {
            ...this.stats,
            totalKeys: this.keys.length,
            healthyKeys: this.getHealthyKeys().length,
            failedKeys: this.failedKeys.size,
            rateLimitedKeys: this.rateLimitedKeys.size,
            successRate: this.stats.totalAttempts
                ? `${(this.stats.successCount / this.stats.totalAttempts * 100).toFixed(1)}%`
                : 'N/A'
        };
    }

    resetRateLimit(key) {
        this.rateLimitedKeys.delete(key);
        console.log(`[${this.keyConfigName}] ♻️ Rate limit reset for Key #${this.keys.indexOf(key) + 1}`);
    }

    // FIX B: called at start of each generation to clear stale state
    resetForGeneration() {
        this.rateLimitedKeys.clear();
        // Do NOT clear failedKeys — permanent failures stay permanent
        this.currentIndex = 0;
        console.log(`[${this.keyConfigName}] 🔄 Rate-limit state cleared for new generation`);
    }

    reset() {
        this.failedKeys.clear();
        this.rateLimitedKeys.clear();
        this.currentIndex = 0;
        console.log(`[${this.keyConfigName}] 🔄 Manager fully reset`);
    }

    getStatusReport() {
        const stats = this.getStats();
        return `
[${this.keyConfigName} Status]
  Total Keys: ${stats.totalKeys}
  Healthy: ${stats.healthyKeys}
  Failed: ${stats.failedKeys}
  Rate-Limited: ${stats.rateLimitedKeys}
  Attempts: ${stats.totalAttempts}
  Success Rate: ${stats.successRate}
  Last Used: ${stats.lastUsedKey}
        `.trim();
    }
}

const keyManagers = {
    groq: null,
    openrouter: null,
};

export function initializeKeyManagers(groqKeys, openrouterKeys) {
    keyManagers.groq = new APIKeyManager('GROQ', groqKeys || []);
    keyManagers.openrouter = new APIKeyManager('OPENROUTER', openrouterKeys || []);
    console.log(
        `[API Key Manager] Initialized with ${groqKeys?.length || 0} Groq keys ` +
        `and ${openrouterKeys?.length || 0} OpenRouter keys`
    );
}

export function getKeyManager(provider) {
    const manager = keyManagers[provider.toLowerCase()];
    if (!manager) throw new Error(`Unknown provider: ${provider}`);
    return manager;
}

export function getNextKey(provider, taskId = null) {
    return getKeyManager(provider).getNextKey(taskId);
}

export function hasAvailableKey(provider) {
    return getKeyManager(provider).hasAvailableKey();
}

export function recordSuccess(provider, key) {
    getKeyManager(provider).recordSuccess(key);
}

export function recordRateLimit(provider, key, delayMs) {
    getKeyManager(provider).recordRateLimit(key, delayMs);
}

export function recordFailure(provider, key, error) {
    getKeyManager(provider).recordFailure(key, error);
}

// FIX B: export for functions.js to call at start of each generation
export function resetForGeneration() {
    keyManagers.groq?.resetForGeneration();
    keyManagers.openrouter?.resetForGeneration();
    console.log('[API Key Manager] All providers reset for new generation');
}

export function getHealthReport() {
    return [
        keyManagers.groq?.getStatusReport() || 'Groq: Not initialized',
        keyManagers.openrouter?.getStatusReport() || 'OpenRouter: Not initialized',
    ].join('\n\n');
}

export function resetAllManagers() {
    keyManagers.groq?.reset();
    keyManagers.openrouter?.reset();
    console.log('[API Key Manager] All managers reset');
}

// 404 model-level blacklist — model exist hi nehi karta, key problem nehi hai
const deadModels = new Set();

export function markModelDead(model) {
    deadModels.add(model);
    console.error(`[Model Blacklist] ❌ ${model} permanently dead (404) — skipping in future`);
}

export function isModelDead(model) {
    return deadModels.has(model);
}

export { APIKeyManager };
