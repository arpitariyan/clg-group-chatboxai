import { AuthError, authErrorResponse, normalizeEmail, resolveRequestUser } from '@/lib/server-auth';

/**
 * Phase 1 foundation — the single place server routes resolve *who is acting*.
 *
 * Two problems this closes at once:
 *
 *   1. SECURITY. Before this, ~29 routes read the acting user's identity from
 *      client-supplied input (`email` / `userEmail` / `user_email`, body or query)
 *      with no token verification. Any caller who knew a victim's email could act
 *      as them. `withUser()` verifies the Firebase ID token via the existing
 *      lib/server-auth.js, then hands the route an authenticated identity it can
 *      trust — and `ctx.assertEmail()` rejects any client-supplied email that does
 *      not match, replicating the pattern already proven in app/api/llm-model/route.js.
 *
 *   2. REQUEST CONTEXT (master-prompt §6). Every request now carries a small,
 *      uniform context object — a correlation id plus the resolved identity — that
 *      later phases (structured logging, provenance, task graphs) build on. This is
 *      created here so it exists for free on every authenticated route.
 *
 * No new dependency. This is a thin wrapper over lib/server-auth.js (Firebase token
 * verification) and Next.js route handlers.
 */

function makeRequestId() {
  // globalThis.crypto is available in both the Node and Edge runtimes on Next 16.
  try {
    return globalThis.crypto?.randomUUID?.() || null;
  } catch {
    return null;
  }
}

function getClientIp(request) {
  const fwd = request.headers.get('x-forwarded-for') || '';
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || null;
}

/**
 * Build the per-request context handed to wrapped route handlers.
 *
 * @param {Request} request
 * @param {{ email: string, uid: string|null, emailVerified: boolean }} user
 * @param {object} routeContext  the Next.js route context ({ params }) — passed through untouched
 */
import { extractUserIntent } from './user-intent.js';

function buildRequestContext(request, user, routeContext) {
  const canonicalEmail = normalizeEmail(user.email);

  return {
    ...(routeContext || {}),

    requestId: makeRequestId(),
    ip: getClientIp(request),

    user: {
      email: canonicalEmail,
      uid: user.uid || null,
      emailVerified: Boolean(user.emailVerified),
      isAdmin: Boolean(user.isAdmin),
    },
    userEmail: canonicalEmail,
    userId: user.uid || null,
    isAdmin: Boolean(user.isAdmin),

    /**
     * Infer and parse UserIntent for a given prompt in the route handler.
     */
    getIntent(prompt, opts = {}) {
      return extractUserIntent(prompt, opts);
    },

    assertEmail(candidate) {
      const c = normalizeEmail(candidate);
      if (c && c !== canonicalEmail) {
        throw new AuthError('Requested user email does not match authenticated session.', 403);
      }
      return canonicalEmail;
    },
  };
}

/**
 * Wrap a Next.js App Router route handler so it only runs for an authenticated user.
 *
 * Usage:
 *   export const POST = withUser(async (request, ctx) => {
 *     const email = ctx.assertEmail(body.userEmail); // authoritative identity
 *     ...
 *   });
 *
 * For dynamic routes, `ctx.params` is the same Promise Next.js would have passed:
 *   export const DELETE = withUser(async (request, ctx) => {
 *     const { projectId } = await ctx.params;
 *   });
 *
 * @param {(request: Request, ctx: object) => Promise<Response>} handler
 * @param {{ requireVerified?: boolean }} [options]
 *   requireVerified defaults to true (matches lib/server-auth.js). Set false only for
 *   endpoints that must serve users mid-verification (rare).
 */
export function withUser(handler, options = {}) {
  const { requireVerified = true } = options;

  return async function wrappedRouteHandler(request, routeContext) {
    let user;
    try {
      user = await resolveRequestUser(request, requireVerified);
    } catch (err) {
      return authErrorResponse(err, 'Authentication required');
    }

    const ctx = buildRequestContext(request, user, routeContext);

    try {
      return await handler(request, ctx);
    } catch (err) {
      // assertEmail (or any downstream auth check) throwing AuthError becomes the
      // correct HTTP status here. Everything else is a real error — re-throw so it
      // surfaces as a 500 and is not silently masked as an auth failure.
      if (err instanceof AuthError) {
        return authErrorResponse(err, 'Forbidden');
      }
      throw err;
    }
  };
}

export { AuthError };
