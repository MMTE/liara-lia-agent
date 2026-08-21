// tests/liri-events.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapConversation, TOOL_META, summarizeOutput } from "../src/lib/liri-events.js";

const userMsg = (text) => ({ id: "u1", role: "user", parts: [{ type: "text", text }] });
const agentMsg = (parts) => ({ id: "a1", role: "assistant", parts });

test("user message maps to user kind", () => {
  const out = mapConversation([userMsg("سلام")]);
  assert.equal(out[0].kind, "user");
  assert.equal(out[0].text, "سلام");
});

test("tool parts become a trace with labels and results", () => {
  const out = mapConversation([
    userMsg("q"),
    agentMsg([
      { type: "dynamic-tool", toolName: "search_docs", state: "output-available",
        output: { resultCount: 2, results: [{ title: "استقرار Node.js", url: "https://docs.liara.ir/paas/nodejs" }] } },
      { type: "dynamic-tool", toolName: "read_doc", state: "running", input: { slug: "guides/paas/nodejs" } },
      { type: "text", text: "پاسخ" },
    ]),
  ]);
  const trace = out.find((m) => m.kind === "trace");
  assert.equal(trace.steps.length, 2);
  assert.equal(trace.steps[0].label, TOOL_META["search_docs"].label);
  assert.equal(trace.steps[0].state, "done");
  assert.equal(trace.steps[1].state, "active");
  assert.ok(trace.steps[0].result.includes("۲"));
  const answer = out.find((m) => m.kind === "answer");
  assert.equal(answer.text, "پاسخ");
  assert.equal(answer.citations[0].route, "paas/nodejs");
});

test("approval-requested becomes a pending plan with write-tool change", () => {
  const out = mapConversation([
    agentMsg([
      { type: "dynamic-tool", toolName: "updateEnvs", state: "approval-requested",
        input: { name: "my-api", env: { NODE_OPTIONS: "--max-old-space-size=512" } },
        toolMetadata: { eve: { inputRequest: { requestId: "r1", kind: "tool-approval",
          prompt: "افزودن متغیر محیطی NODE_OPTIONS به my-api", options: [{ id: "yes", label: "تأیید" }, { id: "no", label: "انصراف" }] } } } },
    ]),
  ]);
  const plan = out.find((m) => m.kind === "plan");
  assert.equal(plan.status, "pending");
  assert.equal(plan.changes[0].risk, "caution");
  assert.ok(plan.changes[0].detail.includes("NODE_OPTIONS"));
});

test("approved plan flips status and later traces become verify variant", () => {
  const out = mapConversation([
    agentMsg([{ type: "dynamic-tool", toolName: "updateEnvs", state: "output-available", input: { name: "x", env: {} },
      toolMetadata: { eve: { inputRequest: { requestId: "r1", kind: "tool-approval", prompt: "p", options: [] } } } }]),
    agentMsg([{ type: "dynamic-tool", toolName: "getAppReleases", state: "output-available" }]),
  ]);
  assert.equal(out.find((m) => m.kind === "plan").status, "approved");
  const traces = out.filter((m) => m.kind === "trace");
  assert.equal(traces.at(-1).variant, "verify");
});

test("ask-question hitl becomes clarify", () => {
  const out = mapConversation([
    agentMsg([{ type: "dynamic-tool", toolName: "ask_question", state: "approval-requested",
      toolMetadata: { eve: { inputRequest: { requestId: "r2", kind: "ask-question",
        prompt: "کدام برنامه؟", options: [{ id: "a", label: "my-api" }] } } } }]),
  ]);
  const c = out.find((m) => m.kind === "clarify");
  assert.equal(c.question, "کدام برنامه؟");
  assert.equal(c.options[0].label, "my-api");
});

test("summarizeOutput handles known and unknown shapes", () => {
  assert.ok(summarizeOutput("getApps", { projects: [{}, {}] }).includes("۲"));
  assert.equal(summarizeOutput("unknown_tool", { foo: 1 }), "");
});
