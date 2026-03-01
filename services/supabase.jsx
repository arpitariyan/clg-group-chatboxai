import { createClient } from '@supabase/supabase-js'

// Custom fetch with a 10-second timeout.
// All errors (timeout OR network failure) are converted into synthetic PostgREST-style
// error responses so the Supabase client always returns { data: null, error: {...} }
// and callers never receive a raw rejected promise / unserializable TypeError.
function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    // 10s timeout — paused Supabase projects need extra time to wake up on first request
    const timer = setTimeout(() => controller.abort(), 10000);

    return fetch(url, { ...options, signal: controller.signal })
        .catch((err) => {
            // Convert AbortError (timeout) to a 408 synthetic response
            if (err.name === 'AbortError') {
                return new Response(
                    JSON.stringify({
                        code: 'TIMEOUT',
                        message: 'Supabase request timed out after 10s',
                        details: 'The database is unreachable. Check your Supabase project status.',
                        hint: ''
                    }),
                    { status: 408, headers: { 'Content-Type': 'application/json' } }
                );
            }
            // Convert any other network error (e.g. "Failed to fetch", CORS, DNS failure)
            // into a 503 synthetic response so supabase-js returns a proper { data, error }
            // object instead of a thrown TypeError that loses its properties on serialisation.
            return new Response(
                JSON.stringify({
                    code: 'NETWORK_ERROR',
                    message: err.message || 'Failed to fetch',
                    details: 'A network error occurred while connecting to Supabase. Check your internet connection and Supabase project status.',
                    hint: ''
                }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        })
        .finally(() => clearTimeout(timer));
}

// Key priority:
//   1. NEXT_PUBLIC_SUPABASE_ANON_KEY — standard JWT anon key (required by supabase-js v2)
//   2. NEXT_PUBLIC_SUPABASE_KEY       — legacy alias for the same JWT key
//   3. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY — new Supabase publishable key format
//      (kept as fallback for future migration to supabase-js v3 / @supabase/ssr)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error(
        '[Supabase] Missing environment variables!\n' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n' +
        `URL defined: ${!!supabaseUrl}, KEY defined: ${!!supabaseKey}`
    );
}

export const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    { global: { fetch: fetchWithTimeout } }
)