import test from "node:test";
import assert from "node:assert/strict";
import { rateLimit, resetRateLimits, __setNow } from "../src/lib/rate-limit.js";

test("burst within limit passes", () => {
  resetRateLimits();
  for (let i = 0; i < 15; i++) {
    assert.equal(rateLimit("ip1", { limit: 15, windowMs: 60_000 }), true, `req ${i + 1}`);
  }
});

test("16th request in window is rejected", () => {
  resetRateLimits();
  for (let i = 0; i < 15; i++) rateLimit("ip1", { limit: 15, windowMs: 60_000 });
  assert.equal(rateLimit("ip1", { limit: 15, windowMs: 60_000 }), false);
});

test("different keys have independent buckets", () => {
  resetRateLimits();
  for (let i = 0; i < 15; i++) rateLimit("ip1", { limit: 15, windowMs: 60_000 });
  assert.equal(rateLimit("ip2", { limit: 15, windowMs: 60_000 }), true);
});

test("window slides — old timestamps expire", () => {
  resetRateLimits();
  const realNow = Date.now();
  __setNow(() => realNow - 120_000);
  for (let i = 0; i < 15; i++) {
    assert.equal(rateLimit("ip3", { limit: 15, windowMs: 60_000 }), true);
  }
  assert.equal(rateLimit("ip3", { limit: 15, windowMs: 60_000 }), false);
  __setNow(() => realNow);
  assert.equal(rateLimit("ip3", { limit: 15, windowMs: 60_000 }), true, "new window admits");
  __setNow(() => Date.now());
});
