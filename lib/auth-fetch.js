import { auth } from '@/lib/firebase';

/**
 * Authenticated fetch for client components.
 *
 * The app has an axios request interceptor (app/Provider.jsx `AxiosAuthBridge`) that
 * attaches the Firebase ID token to every `/api/*` axios call. Bare `fetch()` calls
 * bypass that interceptor and were therefore sending no credentials — which is why the
 * routes that read identity from the request body/query were exploitable.
 *
 * `authFetch` is the fetch-side equivalent of that interceptor: it reads the current
 * user's Firebase ID token and sets `Authorization: Bearer <token>` unless the caller
 * already provided one. It returns a normal `Response`, so existing call sites keep
 * using `.ok` / `.json()` unchanged — the only edit needed is `fetch(` → `authFetch(`.
 *
 * Mirrors the interceptor's semantics exactly:
 *   - only relevant for internal `/api/*` calls (callers decide; no URL filtering here)
 *   - respects an Authorization header the caller already set
 *   - silently proceeds without a token if the user is signed out, so public endpoints
 *     and the signed-out UI keep working (the server decides what requires auth)
 */
export async function authFetch(input, init = {}) {
  let token = null;
  try {
    token = (await auth?.currentUser?.getIdToken?.()) || null;
  } catch {
    token = null;
  }

  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
