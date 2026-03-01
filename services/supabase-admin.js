/**
 * Server-only Supabase admin client.
 * Uses the SERVICE_ROLE key — bypasses Row Level Security (RLS).
 * NEVER import this file in client components or pages; only use in API routes / server actions.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
        'Missing Supabase admin credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env'
    );
}

// 15-second timeout wrapper — same pattern as the anon client.
// Converts ALL fetch errors (timeout + network) into synthetic JSON responses
// so supabase-js always returns { data, error } instead of throwing.
function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    return fetch(url, { ...options, signal: controller.signal })
        .catch((err) => {
            if (err.name === 'AbortError') {
                return new Response(
                    JSON.stringify({
                        code: 'TIMEOUT',
                        message: 'Supabase admin request timed out after 15s',
                        details: 'The database is unreachable. Check your Supabase project status.',
                        hint: ''
                    }),
                    { status: 408, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({
                    code: 'NETWORK_ERROR',
                    message: err.message || 'Failed to fetch',
                    details: 'A network error occurred while connecting to Supabase.',
                    hint: ''
                }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        })
        .finally(() => clearTimeout(timer));
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        // Service role key should never persist sessions
        persistSession: false,
        autoRefreshToken: false,
    },
    global: { fetch: fetchWithTimeout },
});
