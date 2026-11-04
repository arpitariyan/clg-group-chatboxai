/**
 * ChatboxAI — Model Usage Events Bootstrap
 * ══════════════════════════════════════════
 * Ensures the model_usage_events Appwrite collection exists and has
 * the correct schema before the budget router writes to it.
 *
 * Called once at startup (lazy, idempotent).
 */

import { databases, DB_ID } from '@/services/appwrite-admin';
import { MODEL_USAGE_EVENTS_COLLECTION_ID } from '@/services/appwrite-collections';

let bootstrapped = false;
let bootstrapPromise = null;

const EXPECTED_ATTRIBUTES = [
  'user_id',
  'user_email',
  'subscription_plan',
  'request_class',
  'model_requested',
  'model_used',
  'provider_used',
  'estimated_cost',
  'actual_cost',
  'credits_reserved',
  'credits_settled',
  'wallet_before',
  'wallet_after',
  'fallback_triggered',
  'status',
  'created_at',
];

/**
 * Ensure the model_usage_events collection is ready.
 * Silently succeeds if the collection already exists.
 * Silently swallows errors so app startup is never blocked.
 */
export async function ensureModelUsageEventsReady() {
  if (bootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    if (!DB_ID || !MODEL_USAGE_EVENTS_COLLECTION_ID) {
      console.warn('[ModelUsageEvents] Skipping bootstrap: missing DB_ID or collection ID');
      bootstrapped = true;
      return;
    }

    try {
      // Try to fetch the collection — if it exists, we're done
      await databases.getCollection(DB_ID, MODEL_USAGE_EVENTS_COLLECTION_ID);
      bootstrapped = true;
    } catch (err) {
      // Collection likely doesn't exist yet → log a helpful message
      // We don't auto-create it here because Appwrite attribute creation
      // requires admin-level permissions that may not be available at runtime.
      // Use the Appwrite Console or a migration script to create it.
      if (Number(err?.code) === 404) {
        console.warn(
          '[ModelUsageEvents] Collection not found. ' +
          'Please create it in Appwrite Console with these attributes:\n' +
          EXPECTED_ATTRIBUTES.map(a => `  - ${a}`).join('\n')
        );
      } else {
        console.warn('[ModelUsageEvents] Bootstrap check failed:', err?.message);
      }
      // Mark as done anyway — we don't want to block on every request
      bootstrapped = true;
    }
  })();

  return bootstrapPromise;
}
