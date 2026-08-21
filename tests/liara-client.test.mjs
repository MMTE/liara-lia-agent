import test from "node:test";
import assert from "node:assert/strict";

import { validateToken, LiaraError } from "../src/lib/liara-client.js";

// Hermetic: point the client at a fake base and mock global fetch.
process.env.LIARA_API_BASE = "https://liara.test.local";

/** @param {number} status @param {string} body */
function mockFetch(status, body) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(body, { status, headers: { "content-type": "application/json" } });
  };
  return calls;
}

test("validateToken: 200 → ok with Bearer header and project count", async () => {
  const original = globalThis.fetch;
  try {
    const calls = mockFetch(200, JSON.stringify({ projects: [{}, {}, {}] }));
    const result = await validateToken("tok-123");
    assert.deepEqual(result, { ok: true, apps: 3 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://liara.test.local/v1/projects");
    assert.equal(calls[0].init.headers.authorization, "Bearer tok-123");
  } finally {
    globalThis.fetch = original;
  }
});

test("validateToken: 401 → not ok with status", async () => {
  const original = globalThis.fetch;
  try {
    mockFetch(401, "");
    const result = await validateToken("bad-token");
    assert.deepEqual(result, { ok: false, status: 401 });
  } finally {
    globalThis.fetch = original;
  }
});

test("validateToken: network failure → LiaraError", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    await assert.rejects(() => validateToken("tok"), LiaraError);
  } finally {
    globalThis.fetch = original;
  }
});
