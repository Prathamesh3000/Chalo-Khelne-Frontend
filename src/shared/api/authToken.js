/**
 * The one way to read the auth token.
 *
 * §4.2: the axios interceptor already attaches the token to every request AND
 * checks its expiry first (60s buffer, triggering refresh/logout). But 83 call
 * sites still did their own `localStorage.getItem("token")` and hand-built an
 * Authorization header — mostly for `fetch()` calls, which axios interceptors
 * cannot see. Those are precisely the requests that send a token the
 * interceptor already knows is dead, and take an avoidable 401.
 *
 * Reading through here gives those call sites the same expiry awareness. It
 * does NOT replace the interceptor — for axios, keep letting the interceptor do
 * it and pass no header at all.
 */

function decodeJWT(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch (_) {
    return null;
  }
}

/**
 * True when the token is missing, unparseable, or within 60s of expiry —
 * the same buffer the interceptor uses, so the two cannot disagree.
 */
export function isTokenExpired(token) {
  if (!token) return true;
  const payload = decodeJWT(token);
  if (!payload?.exp) return false; // no exp claim — let the server decide
  return payload.exp < Math.floor(Date.now() / 1000) + 60;
}

/**
 * The current access token, or null when there isn't a usable one.
 *
 * Returns null rather than a known-dead token so a caller sends an
 * unauthenticated request (a clean 401 it can handle) instead of one carrying
 * a stale credential.
 */
export function getAuthToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  if (isTokenExpired(token)) {
    // Deliberately not forcing a logout here: this is a read, and a background
    // widget reading a token should not be able to sign the user out. The
    // interceptor owns that decision on the next real axios request.
    return null;
  }
  return token;
}

/** Ready-to-spread headers for a raw fetch(). Empty when there is no token. */
export function authHeaders(extra = {}) {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export default getAuthToken;
