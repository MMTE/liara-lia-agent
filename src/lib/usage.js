/**
 * Usage metering (rubric: token-usage control & monitoring).
 * Client posts per-turn usage parsed from the eve stream (`step.completed`
 * carries `usage.inputTokens/outputTokens/cacheReadTokens`); aggregates are
 * served by GET /api/stats. globalThis-pinned: same cross-bundle rationale as
 * session-store.js.
 */

const store = (globalThis.__liaraAgentUsage ??= {
  turns: 0,
  tokensIn: 0,
  tokensOut: 0,
  cacheReadTokens: 0,
  byTool: {},
  errors: 0,
  startedAt: new Date().toISOString(),
  latencies: [],
});

/**
 * @param {{tokensIn?: number, tokensOut?: number, cacheReadTokens?: number,
 *          tool?: string, error?: boolean, ms?: number}} e
 */
export function record(e = {}) {
  store.turns += 1;
  store.tokensIn += e.tokensIn ?? 0;
  store.tokensOut += e.tokensOut ?? 0;
  store.cacheReadTokens += e.cacheReadTokens ?? 0;
  if (e.tool) store.byTool[e.tool] = (store.byTool[e.tool] ?? 0) + 1;
  if (e.error) store.errors += 1;
  if (typeof e.ms === "number") {
    store.latencies.push(e.ms);
    if (store.latencies.length > 500) store.latencies.shift();
  }
}

export function snapshot() {
  const sorted = store.latencies.slice().sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  return {
    turns: store.turns,
    tokensIn: store.tokensIn,
    tokensOut: store.tokensOut,
    cacheReadTokens: store.cacheReadTokens,
    byTool: store.byTool,
    errors: store.errors,
    startedAt: store.startedAt,
    p95Ms: p95,
  };
}
