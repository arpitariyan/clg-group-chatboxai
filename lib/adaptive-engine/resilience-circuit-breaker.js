/**
 * ChatBox AI — Adaptive Response Intelligence Engine
 * Module: Production Resilience, Circuit Breakers & Fallback (Phase 34)
 * ═════════════════════════════════════════════════════════════════════════
 * Provides stateful circuit breaker protection across LLM providers.
 * Detects repeated timeouts or rate limits, trips open to prevent hanging requests,
 * and seamlessly reroutes to healthy fallback providers.
 */

export const CIRCUIT_STATES = {
  CLOSED:    'CLOSED',    // Normal operation
  OPEN:      'OPEN',      // Tripped due to failures; reroutes immediately
  HALF_OPEN: 'HALF_OPEN', // Trial probe after cooldown
};

const CIRCUIT_REGISTRY = new Map();
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30000; // 30s cooldown before probing

/**
 * Get or initialize a circuit breaker for a provider.
 */
function getCircuit(providerName) {
  const key = String(providerName || 'default').toLowerCase();
  if (!CIRCUIT_REGISTRY.has(key)) {
    CIRCUIT_REGISTRY.set(key, {
      provider: key,
      state: CIRCUIT_STATES.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
    });
  }
  return CIRCUIT_REGISTRY.get(key);
}

/**
 * Check whether a provider call can proceed or should be bypassed.
 */
export function canExecuteProvider(providerName) {
  const circuit = getCircuit(providerName);
  const now = Date.now();

  if (circuit.state === CIRCUIT_STATES.OPEN) {
    if (now - circuit.lastFailureTime > COOLDOWN_MS) {
      circuit.state = CIRCUIT_STATES.HALF_OPEN;
      return true; // allow probe request
    }
    return false; // circuit still open
  }

  return true;
}

/**
 * Record a successful provider execution.
 */
export function recordProviderSuccess(providerName) {
  const circuit = getCircuit(providerName);
  circuit.failureCount = 0;
  circuit.state = CIRCUIT_STATES.CLOSED;
  circuit.successCount++;
}

/**
 * Record a provider execution failure.
 */
export function recordProviderFailure(providerName, error) {
  const circuit = getCircuit(providerName);
  circuit.failureCount++;
  circuit.lastFailureTime = Date.now();

  if (circuit.failureCount >= FAILURE_THRESHOLD) {
    circuit.state = CIRCUIT_STATES.OPEN;
    console.warn(`🚨 [CircuitBreaker] Provider '${providerName}' tripped OPEN after ${circuit.failureCount} consecutive failures. Will cooldown for ${COOLDOWN_MS / 1000}s.`);
  }
}

/**
 * Safely execute an operation with circuit breaker and fallback.
 *
 * @param {string} primaryProvider
 * @param {Function} primaryFn
 * @param {Function} fallbackFn
 * @returns {Promise<any>}
 */
export async function executeWithCircuitBreaker(primaryProvider, primaryFn, fallbackFn) {
  if (canExecuteProvider(primaryProvider)) {
    try {
      const result = await primaryFn();
      recordProviderSuccess(primaryProvider);
      return result;
    } catch (err) {
      recordProviderFailure(primaryProvider, err);
      console.warn(`[CircuitBreaker] Primary provider '${primaryProvider}' failed (${err.message}). Engaging fallback...`);
    }
  } else {
    console.warn(`[CircuitBreaker] Primary provider '${primaryProvider}' is OPEN. Directing immediately to fallback.`);
  }

  if (typeof fallbackFn === 'function') {
    return await fallbackFn();
  }

  throw new Error(`Execution failed and no fallback available for ${primaryProvider}`);
}
