import test from "node:test";
import assert from "node:assert/strict";

import { sessionFromRequest, liaraGet } from "../src/lib/liara-bff.js";
import { set as setSession, remove as removeSession } from "../src/lib/session-store.js";

process.env.LIARA_API_BASE = "https://liara.test.local";

const SID = "sid-test-0123456789abcdef"; // matches [A-Za-z0-9_-]{16,}

function req(cookie) {
  const headers = cookie ? { cookie } : {};
  return new Request("https://app.test.local/api/liara/apps", { headers });
}

test("sessionFromRequest: no cookie / no sid → null", async () => {
  assert.equal(await sessionFromRequest(req(null)), null);
  assert.equal(await sessionFromRequest(req("foo=bar; theme=dark")), null);
});

test("sessionFromRequest: unknown or malformed sid → null", async () => {
  assert.equal(await sessionFromRequest(req("sid=unknown-sid-123456")), null);
  assert.equal(await sessionFromRequest(req("sid=short")), null);
  // must not match other cookie names ending in 'sid'
  assert.equal(await sessionFromRequest(req(`othersid=${SID}`)), null);
});

test("sessionFromRequest: stored sid (anywhere in the cookie jar) → {token}", async () => {
  setSession(SID, { token: "tok-secret-value", mode: "connected" });
  try {
    assert.deepEqual(await sessionFromRequest(req(`sid=${SID}`)), { token: "tok-secret-value" });
    assert.deepEqual(await sessionFromRequest(req(`foo=bar; sid=${SID}; theme=dark`)), { token: "tok-secret-value" });
  } finally {
    removeSession(SID);
  }
});

/** @param {(url: string, init: object) => Promise<Response>} fn */
function mockFetch(fn) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return fn(url, init);
  };
  return calls;
}

test("liaraGet: Bearer header + parsed JSON body", async () => {
  const original = globalThis.fetch;
  try {
    const calls = mockFetch(() => new Response(JSON.stringify({ projects: [{}] }), { status: 200 }));
    const body = await liaraGet("tok-123", "/v1/projects");
    assert.deepEqual(body, { projects: [{}] });
    assert.equal(calls[0].url, "https://liara.test.local/v1/projects");
    assert.equal(calls[0].init.headers.authorization, "Bearer tok-123");
  } finally {
    globalThis.fetch = original;
  }
});

test("liaraGet: 204 → null, and wires an un-aborted AbortSignal (15s timeout)", async () => {
  const original = globalThis.fetch;
  try {
    let signal;
    mockFetch((_url, init) => {
      signal = init.signal;
      return new Response(null, { status: 204 });
    });
    assert.equal(await liaraGet("tok-204", "/v1/projects"), null);
    assert.ok(signal instanceof AbortSignal);
    assert.equal(signal.aborted, false);
  } finally {
    globalThis.fetch = original;
  }
});

test("liaraGet: upstream 401 → status 401, token never in the error", async () => {
  const original = globalThis.fetch;
  try {
    mockFetch(() => new Response("", { status: 401 }));
    await assert.rejects(
      () => liaraGet("tok-revoked", "/v1/projects"),
      (e) => e.status === 401 && !String(e.message).includes("tok-revoked")
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("liaraGet: upstream 500 → 502 with Persian message, token never in the error", async () => {
  const original = globalThis.fetch;
  try {
    mockFetch(() => new Response("boom", { status: 500 }));
    await assert.rejects(
      () => liaraGet("tok-500", "/v1/projects"),
      (e) => e.status === 502 && !String(e.message).includes("tok-500")
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("liaraGet: transport failure and timeout → 502 with Persian message", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    await assert.rejects(
      () => liaraGet("tok-net", "/v1/projects"),
      (e) => e.status === 502 && /لیارا/.test(e.message)
    );

    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    globalThis.fetch = async () => {
      throw timeout;
    };
    await assert.rejects(
      () => liaraGet("tok-timeout", "/v1/projects"),
      (e) => e.status === 502 && /لیارا/.test(e.message)
    );
  } finally {
    globalThis.fetch = original;
  }
});
