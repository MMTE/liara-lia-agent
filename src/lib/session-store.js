/**
 * In-memory session store for connected Liara accounts (ADR-0005).
 *
 * Maps the httpOnly `sid` cookie (== eve principalId, see ADR-0007 §1) to
 * the user-pasted Liara API token. Server memory only: never logged,
 * never persisted, gone on restart. The `/api/connect` route writes;
 * the Liara connection auth reads via `getForPrincipal`.
 */

/** @typedef {{token: string, mode: string}} SessionRecord */

// globalThis-pinned singleton: the eve agent bundle (rolldown) and the Next
// server bundle each get their own module instance — without this pin they
// would hold two separate Maps and the connect route could not reach the
// connection auth resolver.
const sessions = (globalThis.__liaraAgentSessions ??= new Map());

/** @param {string} sid @param {SessionRecord} record */
export function set(sid, record) {
  sessions.set(sid, record);
}

/** @param {string} @returns {SessionRecord | null} */
export function get(sid) {
  return sessions.get(sid) ?? null;
}

/** @param {string} @returns {boolean} */
export function remove(sid) {
  return sessions.delete(sid);
}

// `delete` is a reserved word and cannot be a function name; export it as an
// alias so callers use `import { delete as deleteSession }`.
export { remove as delete };

/**
 * Resolve a session from an eve connection principal. Eve projects the
 * authenticated caller as `{type: "user", id: principalId}`; app principals
 * (`{type: "app"}`, demo/local-dev turns) have no personal session.
 *
 * @param {{type: string, id?: string} | null | undefined} principal
 * @returns {SessionRecord | null}
 */
export function getForPrincipal(principal) {
  if (principal?.type === "user" && typeof principal.id === "string") {
    return get(principal.id);
  }
  return null;
}
