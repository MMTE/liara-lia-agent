#!/usr/bin/env node
// FallbackModel unit tests (agent/lib/model-chain.ts) — behavioral:
// doGenerate falls through failing models, benches them, and doStream only
// falls back before the first emitted part.
import test from "node:test";
import assert from "node:assert/strict";
import { FallbackModel } from "../agent/lib/model-chain.ts";

const fake = (id, behavior) => {
  const calls = { generate: 0, stream: 0 };
  return {
    calls,
    model: {
      specificationVersion: "v3",
      provider: "test",
      modelId: id,
      supportedUrls: {},
      async doGenerate() {
        calls.generate++;
        if (behavior.generate === "throw") throw new Error(`${id} down`);
        return { content: [], finishReason: "stop", usage: {}, warnings: [], tag: id };
      },
      async doStream() {
        calls.stream++;
        if (behavior.stream === "throw") throw new Error(`${id} down`);
        const parts = behavior.streamParts ?? [{ type: "text-start" }, { type: "text-end" }];
        if (behavior.streamAfterFirst === "throw") {
          return {
            stream: new ReadableStream({
              start(c) {
                c.enqueue(parts[0]);
                setTimeout(() => c.error(new Error(`${id} died mid-stream`)), 10);
              },
            }),
          };
        }
        if (behavior.stream === "preFirstThrow") {
          return {
            stream: new ReadableStream({
              start(c) {
                c.error(new Error(`${id} died before first part`));
              },
            }),
          };
        }
        return {
          stream: new ReadableStream({
            start(c) {
              for (const p of parts) c.enqueue(p);
              c.close();
            },
          }),
        };
      },
    },
  };
};

test("doGenerate: first healthy model serves, failing ones bench", async () => {
  const a = fake("a", { generate: "throw" });
  const b = fake("b", {});
  const fm = new FallbackModel([a.model, b.model], { ids: ["p:a", "p:b"], cooldownMs: 60_000 });
  const res = await fm.doGenerate({});
  assert.equal(res.tag, "b");
  assert.equal(a.calls.generate, 1);
  // second call: benched primary is skipped entirely
  await fm.doGenerate({});
  assert.equal(a.calls.generate, 1);
  assert.equal(b.calls.generate, 2);
});

test("doGenerate: all models failing rethrows the last error", async () => {
  const a = fake("a", { generate: "throw" });
  const b = fake("b", { generate: "throw" });
  const fm = new FallbackModel([a.model, b.model], { ids: ["p:a", "p:b"] });
  await assert.rejects(() => fm.doGenerate({}), /b down/);
});

test("doStream: pre-first-part failure falls through to next model", async () => {
  const a = fake("a", { stream: "preFirstThrow" });
  const b = fake("b", {});
  const fm = new FallbackModel([a.model, b.model], { ids: ["p:a", "p:b"] });
  const res = await fm.doStream({});
  const parts = [];
  for await (const p of res.stream) parts.push(p);
  assert.equal(parts.length, 2);
  assert.equal(b.calls.stream, 1);
});

test("doStream: mid-stream failure propagates (no duplicate retry)", async () => {
  const a = fake("a", { streamAfterFirst: "throw" });
  const b = fake("b", {});
  const fm = new FallbackModel([a.model, b.model], { ids: ["p:a", "p:b"] });
  const res = await fm.doStream({});
  await assert.rejects(async () => {
    for await (const _p of res.stream) {
      /* consume */
    }
  }, /died mid-stream/);
  assert.equal(b.calls.stream, 0, "fallback must not replay after partial output");
});

test("doStream: sync throw in doStream falls through", async () => {
  const a = fake("a", { stream: "throw" });
  const b = fake("b", {});
  const fm = new FallbackModel([a.model, b.model], { ids: ["p:a", "p:b"] });
  const res = await fm.doStream({});
  const parts = [];
  for await (const p of res.stream) parts.push(p);
  assert.equal(parts.length, 2);
});
