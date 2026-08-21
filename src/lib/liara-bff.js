/**
 * BFF for the console surface: same sid→token session as the eve channel
 * (agent/channels/eve.ts sidAuth). Read-only helpers only — every write path
 * stays behind the eve agent's HITL flow.
 */
import { get as getSession } from "./session-store.js";

const DEFAULT_BASE = "https://api.iran.liara.ir";
const TIMEOUT_MS = 15_000;

/**
 * Resolve the caller's Liara session from the httpOnly `sid` cookie
 * (same cookie contract as agent/channels/eve.ts:13-27).
 *
 * @param {Request} request
 * @returns {Promise<{token: string} | null>} null when unauthenticated.
 */
export async function sessionFromRequest(request) {
  const cookie = request.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)sid=([A-Za-z0-9_-]{16,})/);
  if (!m) return null;
  const s = getSession(m[1]);
  return s ? { token: s.token } : null;
}

/**
 * GET a Liara API path with the session token (Bearer, 15s timeout).
 *
 * Error mapping (the token is never part of any thrown error):
 * - upstream 401 → Error with status 401 (session token revoked)
 * - any other non-2xx, transport failure or timeout → Error with status 502
 *   and a Persian, user-safe message.
 *
 * @param {string} token
 * @param {string} path path with query string, e.g. "/v1/projects"
 * @returns {Promise<unknown>} parsed JSON body, or null for 204.
 */
export async function liaraGet(token, path) {
  const base = process.env.LIARA_API_BASE || DEFAULT_BASE;
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    const err = new Error("اتصال به لیارا برقرار نشد. کمی بعد دوباره تلاش کنید.");
    err.status = 502;
    throw err;
  }
  if (res.status === 401) {
    const err = new Error("liara 401");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`liara ${res.status}`);
    err.status = 502;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}
