# Provider Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit Blackbox promotion routing and a generic OpenAI-compatible provider switch.

**Architecture:** Extend the existing `CHAT_PROVIDER` switch in `agent/agent.ts`. Blackbox remains an Eve Gateway model with provider options; arbitrary OpenAI-compatible services use the already-installed adapter.

**Tech Stack:** TypeScript, Eve 0.42, AI SDK OpenAI-compatible provider, Node test runner.

## Global Constraints

- Preserve `vercel`, `liara`, and `openrouter` behavior.
- Add no dependencies.
- Verify Blackbox with a real Eve session.

---

### Task 1: Provider switches

**Files:**
- Modify: `agent/agent.ts`
- Modify: `.env.example`
- Create: `tests/providers.test.mjs`

**Interfaces:**
- Consumes: `CHAT_PROVIDER`, `CHAT_MODEL`, `AI_GATEWAY_API_KEY`.
- Produces: `CHAT_PROVIDER=blackbox`; `CHAT_PROVIDER=openai` with `OPENAI_BASE_URL` and `OPENAI_API_KEY`.

- [ ] **Step 1: Write failing provider configuration tests**

Import `agent/agent.ts` in isolated Node processes and assert Blackbox emits
`modelOptions.providerOptions.gateway.only = ["blackbox"]`; assert the generic
OpenAI provider uses the configured endpoint and model.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/providers.test.mjs`

Expected: FAIL because neither provider switch exists.

- [ ] **Step 3: Implement the switches**

Add the two cases directly to the existing provider switch and add their env
variables to `.env.example`.

- [ ] **Step 4: Verify locally and through Eve**

Run `node --test tests/providers.test.mjs`, `npx tsc --noEmit`, and a real Eve
session with `CHAT_PROVIDER=blackbox`.
