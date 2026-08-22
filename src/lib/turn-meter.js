/**
 * Shared client-side turn metering for the chat surfaces.
 *
 * `meterTurn` parses an eve turn's stream events and posts per-turn usage
 * (input/output/cache-read tokens, tool names, error flag) to `/api/stats`;
 * best-effort only — failures are swallowed. `STORAGE_KEY` is the
 * localStorage slot where Chat persists `{events, session}` across reloads.
 * Used by Chat and the Lia embed widget so both meter identically.
 */

/** localStorage slot for the persisted chat snapshot. */
export const STORAGE_KEY = "liara-agent-chat";

/** @param {unknown} v @returns {v is Record<string, unknown>} */
function isObj(v) {
  return typeof v === "object" && v !== null;
}

/**
 * Post per-turn usage (parsed from stream events) to the stats endpoint.
 *
 * @param {unknown[]} events
 * @param {string} status
 * @returns {void}
 */
export function meterTurn(events, status) {
  try {
    let tokensIn = 0;
    let tokensOut = 0;
    let cacheRead = 0;
    const tools = [];
    for (const raw of events) {
      if (!isObj(raw) || typeof raw.type !== "string" || !isObj(raw.data)) continue;
      if (raw.type === "step.completed" && isObj(raw.data.usage)) {
        const u = raw.data.usage;
        tokensIn += typeof u.inputTokens === "number" ? u.inputTokens : 0;
        tokensOut += typeof u.outputTokens === "number" ? u.outputTokens : 0;
        cacheRead += typeof u.cacheReadTokens === "number" ? u.cacheReadTokens : 0;
      }
      if (raw.type === "actions.requested" && Array.isArray(raw.data.actions)) {
        for (const a of raw.data.actions) {
          if (isObj(a) && typeof a.toolName === "string") tools.push(a.toolName);
        }
      }
    }
    void fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokensIn,
        tokensOut,
        cacheReadTokens: cacheRead,
        tools,
        error: status === "error",
      }),
    });
  } catch {
    /* metering best-effort */
  }
}
