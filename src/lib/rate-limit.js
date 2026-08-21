// In-memory sliding-window rate limiter. Per-process (single Node service) —
// documented limitation for multi-instance deployments.
const buckets = new Map(); // key -> number[] timestamps

let nowFn = () => Date.now();

/** Test seam. */
export function __setNow(fn) {
  nowFn = fn;
}

/**
 * @param {string} key caller identity (ip+session)
 * @param {{limit: number, windowMs: number}} opts
 * @returns {boolean} true if admitted
 */
export function rateLimit(key, { limit, windowMs }) {
  const now = nowFn();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    buckets.set(key, list);
    return false;
  }
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 10_000) {
    // opportunistic GC of fully expired buckets
    for (const [k, ts] of buckets) {
      if (ts.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

export function resetRateLimits() {
  buckets.clear();
}
