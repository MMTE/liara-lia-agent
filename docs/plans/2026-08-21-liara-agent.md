# Liara Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Liara Agent — an Eve-powered cloud-operator web app (hybrid docs RAG + Liara API tools with approval-gated writes) deployed on Liara, plus an MV3 helpdesk-bubble extension, by 2026-08-22 15:00.

**Architecture:** Single Next.js App Router app; the Eve agent mounts same-origin via `withEve()`. Docs knowledge = dual corpus (liara-cloud/docs Persian guides + developers.liara.ir API reference) precomputed into an embedded hybrid index (BM25 + cosine, RRF). Liara tools call `api.iran.liara.ir` with a per-session, memory-only Bearer token; writes go through a server-enforced two-step approval gate. Spec: `docs/specs/2026-08-21-liara-agent-design.md`; ADRs 0001–0006.

**Tech Stack:** Next.js 15 (App Router, standalone output), eve (pinned), TypeScript, Tailwind CSS v4, react-markdown + rehype-highlight, node:test for unit tests, MV3 Chrome extension.

## Global Constraints

- Deadline: 2026-08-22 15:00 local. Deploy to Liara **before** final polish (Task 10 target: tonight).
- Model config: `zai/glm-5.2` primary (Vercel AI Gateway, free for eve agents through 2026-08-27); fallback `ai.liara.ir` OpenAI-compatible. Provider order via `CHAT_PROVIDER=vercel|liara`.
- Embeddings: Liara AI `intfloat/multilingual-e5-large` with `query:` / `passage:` prefixes. Endpoint: `POST https://ai.liara.ir/api/{LIARA_AI_WORKSPACE_ID}/v1/embeddings`, `Authorization: Bearer ${LIARA_AI_API_KEY}`.
- Liara platform API base: `https://api.iran.liara.ir` (PaaS + DBaaS; apps are `/v1/projects`).
- Judge/user Liara tokens: server memory only, never logged, never persisted (ADR-0005).
- Write tools: two-step approval only; delete-class operations never exposed (ADR-0004).
- UI: RTL, Persian-first copy, dark theme.
- Every task: update `CHANGELOG.md`, commit; record discoveries in `docs/adr/`.
- No new runtime deps beyond: `react-markdown`, `remark-gfm`, `rehype-highlight`, `highlight.js` (styles). No vector DB, no Redis (ADR-0003).
- Pin `eve` to the exact version installed by `npx eve@latest init`.

---

## Execution status (2026-08-21 ~08:50)

| Task | Status | Notes / commits |
|---|---|---|
| 0 Scaffold | ✅ done | `c05a97f` — Next 16.3.1 + eve 0.42.0 + withEve + gateway-loader.mjs (UA fix + optional proxy) |
| 1 Eve spike | ✅ done | ADR-0007 written+verified; tasks 6–7 revised to OpenAPI connections + native HITL (`aaed462`) |
| 2 Persian/BM25/RRF | ✅ done | `fea2ae1` — 12 tests; fixed plan's digit-normalization precedence bug |
| 3 MDX cleaner/chunker | ✅ done | `1e25420` — 6 tests; JSX headings → markdown. Payload-attr bug (Tabs/Step self-closing attrs dropped → 458/1143 pages empty) found by CorpusBuilder; being fixed with regression tests |
| 4 Corpus + embeddings | 🔄 running | CorpusBuilder: corpus half (embeddings deferred until Liara AI key) |
| 5 Retrieval tools | ⏳ next | after 4 |
| 6 OpenAPI connections | ✅ done | `01aeb5c` — vendored specs (41+18 ops, 13 allowed), approval policy, per-principal auth resolver (app-principal fallback keeps demo token reachable), 21/21 tests |
| 7 HITL verification | ⏳ after 6 | needs DEMO_LIARA_TOKEN (user to provide) |
| 8 Persona/scenarios | ◐ partial | instructions.md + scenarios.ts committed (`249d6bd`, `d9c4745`); skills/*.md pending |
| 9 Web UI | ◐ partial | Chat/Message/Citations/ActivityTimeline/composer/empty-state committed (`d9c4745`); browser-verified render + send; polish pending |
| 10 Panels/security | ⏳ pending | — |
| 11 Deploy | ⏳ pending | target tonight; self-host facts in spec §4.9 |
| 12 Extension/smoke | ⏳ pending | — |

**Verified baseline:** full agent turn e2e via OrcaRouter (`CHAT_PROVIDER=orca`)
through `next dev` + withEve + `/eve/v1/session` SSE + useEveAgent client.
glm-5.2 promo pool 503 (upstream outage — probe watching); OpenRouter needs
`HTTPS_PROXY`; Liara AI key pending. Deviations: Next 16 (not 15), node --test
without directory arg, `type: module`, evals beside agent/, `.eve/` gitignored.


### Task 0: Scaffold Next.js + Eve + deps

**Files:**
- Create: Next.js app at repo root (`src/app/*`, `package.json`, `next.config.ts`, `tsconfig.json`, `agent/` from eve init)
- Create: `.env.example`, update `.gitignore`

**Interfaces:**
- Produces: running dev server at :3000 with Eve routes mounted; env contract below.

- [ ] **Step 1: Scaffold**

```bash
npx create-next-app@latest . --ts --app --tailwind --eslint --src-dir --no-import-alias --use-npm
npx eve@latest init .          # choose model zai/glm-5.2 when prompted
npm i react-markdown remark-gfm rehype-highlight highlight.js
```

If `eve init` refuses non-empty dir, scaffold in `tmp/` and move files in, then run init at root.

- [ ] **Step 2: Wire `next.config.ts`**

```ts
import type { NextConfig } from "next";
import { withEve } from "eve/next";
const nextConfig: NextConfig = { output: "standalone" };
export default withEve(nextConfig);
```

- [ ] **Step 3: `.env.example`**

```bash
# Chat providers
CHAT_PROVIDER=vercel            # vercel | liara
AI_GATEWAY_KEY=                 # Vercel AI Gateway key (eve uses this)
LIARA_AI_API_KEY=               # from ai.liara.ir panel
LIARA_AI_WORKSPACE_ID=          # workspace id shown in ai.liara.ir
LIARA_AI_CHAT_MODEL=openai/gpt-4o-mini
# Platform API
LIARA_API_BASE=https://api.iran.liara.ir
DEMO_LIARA_TOKEN=               # demo-account API token (demo mode)
PUBLIC_APP_URL=                 # set after first deploy
```

- [ ] **Step 4: Smoke**

Run: `npm run dev` → open the eve dev UI / `/`; send "hi"; expect a model reply (proves gateway key + glm-5.2).

- [ ] **Step 5: Commit** `feat: scaffold next+eve app`

### Task 1: Eve integration spike (session context, approvals, fallback)

**Files:**
- Create: `docs/adr/0007-eve-integration-notes.md`
- Modify: `agent/agent.ts` if fallback config is natively supported

**Interfaces:**
- Produces: recorded answers to: (a) how a tool learns the current session id / per-session token; (b) whether HITL approvals render on the web channel (`useEveAgent`); (c) provider fallback / custom OpenAI-compatible provider config; (d) how the client observes tool-call events for the activity timeline.

- [ ] **Step 1:** Read `node_modules/eve/docs` (shipped with the package) end-to-end for: tools API, sessions, HITL, channels/http, React hook, model/provider config.
- [ ] **Step 2:** Write `docs/adr/0007-eve-integration-notes.md` with findings + chosen mechanisms. If per-session context is not natively available, the fallback is: `/api/connect` stores `{sessionId → token}` in `lib/session-store.ts`; the client sends `x-session-id` on every agent request; tool bodies call `sessionStore.getToken(ctx)` where `ctx` comes from whatever Eve exposes (else global AsyncLocalStorage keyed by active request).
- [ ] **Step 3:** Verify in dev: custom `agent/tools/ping.ts` returning `{ok:true, sessionId:<whatever you can see>}`; call it from chat.
- [ ] **Step 4:** Commit `docs: eve integration spike (ADR-0007)`

### Task 2: Persian normalization + BM25 + RRF (pure logic)

**Files:**
- Create: `src/lib/persian.ts`, `src/lib/bm25.ts`, `src/lib/rrf.ts`
- Test: `tests/retrieval.test.mjs` (node:test, run via `node --test tests/`, with `--experimental-strip-types` if needed or plain `.mjs` importing built `dist` — simplest: write these three as `.ts` but ALSO a tiny `scripts/typecheck.mjs`; **decision: implement in plain JS ESM under `src/lib/` as `.js` files with JSDoc types** so node:test can import them directly and Next handles them fine).

**Interfaces:**
- Produces: `normalizeFa(s: string): string`; `tokenize(s: string): string[]`; `class BM25Index { constructor(docs: {id: string, text: string}[]); search(q: string, k?: number): {id: string, score: number}[] }`; `rrfFuse(rankedLists: {id: string}[][], k=60): {id: string, score: number}[]`

- [ ] **Step 1: Write failing tests** — normalization (ZWNJ `‌` removed, `ي→ی`, `ك→ک`, Arabic-Indic digits → ASCII, collapse whitespace), BM25 ranking (doc containing term ranks first; Persian query matches normalized text), RRF (union of two lists, reciprocal ranks).
- [ ] **Step 2: Run** `node --test tests/retrieval.test.mjs` → FAIL
- [ ] **Step 3: Implement**

`src/lib/persian.js`:
```js
export function normalizeFa(s) {
  return (s ?? "").toString()
    .replace(/[\u200b-\u200f\u2060]/g, "")       // ZWNJ, marks
    .replace(/[\u064A\u0649]/g, "\u06CC")        // ي ى → ی
    .replace(/\u0643/g, "\u06A9")                // ك → ک
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, d =>
      String.fromCharCode(d.charCodeAt(0) & 0x0F + 48))
    .replace(/\s+/g, " ").trim().toLowerCase();
}
export function tokenize(s) {
  return normalizeFa(s).split(/[^\p{L}\p{N}._-]+/u).filter(t => t.length > 1);
}
```

`src/lib/bm25.js`: standard Okapi BM25 (k1=1.5, b=0.75) over tokenized docs; store postings `{term → {docId → tf}}`, doc lengths, avgdl.

`src/lib/rrf.js`:
```js
export function rrfFuse(lists, k = 60) {
  const scores = new Map();
  for (const list of lists) list.forEach(({ id }, rank) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
  });
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Tests pass; commit** `feat: persian normalization, bm25, rrf`

### Task 3: MDX cleaner + chunker (pure logic)

**Files:**
- Create: `src/lib/clean-mdx.js`, `src/lib/chunker.js`
- Test: `tests/chunk.test.mjs`

**Interfaces:**
- Produces: `cleanMdx(raw: string): string` (strips `import ...` lines, `<Head>…</Head>`, JSX attributes; keeps JSX inner text; keeps fenced code verbatim); `extractTitle(raw: string): string | null` (from `<title>` else first `# `); `chunkPage({slug, url, title, product, source, text}): Chunk[]` where `Chunk = {id, slug, url, title, product, source, sectionPath: string, text: string}`; heading-split at H2/H3, hard-split at ~1,200 chars, code fences never split.

- [ ] **Step 1: Failing tests** — real fixture snippet (from `.research/docs/src/pages/paas/flask/quick-start.mdx`): imports stripped, `<title>` captured, JSX tags dropped but inner text kept, code fence preserved intact; chunk boundaries at headings; oversized section hard-split without breaking fences.
- [ ] **Step 2: FAIL → implement → PASS**
- [ ] **Step 3: Commit** `feat: mdx cleaner and chunker`

### Task 4: Dual-corpus index builder + embeddings

**Files:**
- Create: `scripts/build-docs-index.mjs`, `src/data/` (gitignored `.cache/`)
- Produces: `src/data/docs-index.json` = `{meta, chunks: Chunk[], vectors: string[] /* base64 float32 */}`

**Interfaces:**
- Consumes: Task 2 + 3 pure functions.
- Produces: index JSON consumed by Task 5 loader. URL mapping for guides: `src/pages/<rest>.mdx` → `https://docs.liara.ir/<rest>` (verify against sitemap dir in docs repo; record exceptions in ADR-0007 notes).

- [ ] **Step 1:** Builder script: clone/pull liara-cloud/docs into `.cache/docs`; walk `src/pages/**/*.{md,mdx}` skipping `_*.mdx`; clean + chunk (Corpus A). Fetch `https://developers.liara.ir/llms.txt`, parse `https://…​.md` URLs (skip `/spec/` and `/pages/*.md` overview duplicates → keep them, tagged `api-ref`), fetch each (concurrency 8, cache in `.cache/apiref/<hash>.md`), chunk by `##` headings (Corpus B).
- [ ] **Step 2:** Embedding client: `POST ${LIARA_AI_BASE}/api/${LIARA_AI_WORKSPACE_ID}/v1/embeddings` with `{model:"intfloat/multilingual-e5-large", input: passages.map(p => "passage: " + p)}`, batch 64, retry ×3 backoff, disk cache `.cache/embeddings.jsonl` keyed by sha256(text+model).
- [ ] **Step 3:** Run: `node scripts/build-docs-index.mjs`. Expect ~6–9k chunks. Sanity checks printed: total chunks, per-product counts, 5 sample queries → top titles (manual eyeball for relevance).
- [ ] **Step 4:** Commit `feat: dual-corpus docs index builder` + generated JSON (yes, commit the artifact — deploy must not depend on builder secrets; ~30–50 MB acceptable; if >80 MB, gzip it and load with zlib).

### Task 5: Runtime retrieval + docs tools

**Files:**
- Create: `src/lib/docs-index.ts` (loader + hybrid search), `agent/tools/search_docs.ts`, `agent/tools/read_doc.ts`
- Modify: `agent/instructions.md` (initial identity; final copy in Task 8)

**Interfaces:**
- Produces: `searchDocs(query: string, k?: number): Promise<{title, url, source, snippet}[]>` (BM25 over normalized text ∪ cosine over query embedding, RRF, k=6); tools call it; `read_doc` takes `slug` → full cleaned page (capped 12k chars).

- [ ] **Step 1:** Loader: read JSON once at module init (server), Float32Array from base64, expose singleton. Query embedding via same Liara endpoint (`"query: "` prefix), 1 call per search, cached in-memory LRU (512) — **this is the semantic query cache** (cost rubric).
- [ ] **Step 2:** Tools:

```ts
// agent/tools/search_docs.ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchDocs } from "@/lib/docs-index";
export default defineTool({
  description: "Search Liara documentation (Persian guides + API reference). Returns snippets with source URLs. Use for every Liara how-to/concept/limit/API question.",
  inputSchema: z.object({ query: z.string().describe("Search query; Persian for product guides, English for API details") }),
  async execute({ query }) { return { results: await searchDocs(query) }; },
});
```
`read_doc.ts` analogous (`slug` → page).

- [ ] **Step 3:** Verify in dev chat: «چطور برنامه لاراول رو دیپلوی کنم؟» → citations to docs.liara.ir URLs in results; English "how do update-envs work" → api-ref page.
- [ ] **Step 4:** Commit `feat: hybrid retrieval tools`

### Task 6: Liara OpenAPI connections (read + write ops)

**Files:**
- Create: `scripts/vendor-liara-specs.mjs`, `agent/specs/paas.json` + `dbaas.json` (vendored, git-committed), `src/lib/session-store.js`, `src/lib/liara-client.js` (connect-validation only), `agent/lib/liara-approval.ts`, `agent/connections/liara-paas.ts`, `agent/connections/liara-dbaas.ts`

**Interfaces (ADR-0007):**
- Produces: connections with tools `liara-paas__{getApps, getAppByName, getAppLogs, getAppEvents, getAppReleases, getAppCpuReports, getAppMemoryReports, getAppSummaryReports, restartApp, updateEnvs, releasesDeploy}` and `liara-dbaas__{getListDatabases, getDatabase}`; `sessionStore.get(sid) → {token, mode} | null`; `liaraApproval(ctx)` → reads `not-applicable`, writes `user-approval`; `validateToken(token) → {ok, apps}`.

- [ ] **Step 1:** `scripts/vendor-liara-specs.mjs`: download paas.yaml + dbaas.yaml from liara-cloud/openapi@main, convert YAML→JSON (use `yaml` pkg as devDep), write to `agent/specs/`. Run it, commit output.
- [ ] **Step 2:** `liara-approval.ts**: `WRITES = new Set(["restartApp","updateEnvs","releasesDeploy"])`; policy extracts op from qualified `toolName`, returns approval status.
- [ ] **Step 3:** Connections: inline `spec` import, `baseUrl: process.env.LIARA_API_BASE`, `operations.allow` list, `auth.getToken` via session store → demo-token fallback, `approval: liaraApproval`. No token anywhere in tool results (errors mapped to `{error:"not_connected"}`).
- [ ] **Step 4:** Dev-chat verify with `DEMO_LIARA_TOKEN` in `.env`: "لیست اپ‌ها رو نشون بده" → real apps; "لاگ‌های X رو بیار" → logs.
- [ ] **Step 5:** Commit `feat: liara openapi connections with approval policy`

### Task 7: HITL verification (native approvals)

**Files:** none new — verification task.

- [ ] **Step 1:** Dev-chat: "اپ X رو ری‌استرت کن" → agent proposes → approval pauses at `session.waiting` → approve → real restart executes → agent verifies via `getAppByName`. Cancel path: no mutation.
- [ ] **Step 2:** Verify `ask_question` renders options for an ambiguous request ("کدوم اپ؟").
- [ ] **Step 3:** Record evidence (screenshot/notes) in CHANGELOG; commit.

### Task 8: Agent persona, skills, demo scenarios

**Files:**
- Create: `agent/skills/troubleshooting.md`, `agent/skills/deployment.md`, `agent/skills/docs-research.md`, `src/lib/scenarios.ts`
- Modify: `agent/instructions.md` (full operator persona)

**Interfaces:**
- Produces: `SCENARIOS: {id, titleFa, promptFa}[]` — the 8 demo scenarios from spec §6 (exact copy in this file).

- [ ] **Step 1:** `instructions.md` final: identity (Liara cloud operator), mirror user language (fa/en), always cite docs.liara.ir / developers.liara.ir for doc claims, refuse when retrieval confidence low ("مطمئن نیستم…"), approval policy language, pinned-app rule (state which app context is active after first inspection), always end incident/provisioning answers with «قدم بعدی» suggestions, never expose raw tokens.
- [ ] **Step 2:** Skills: troubleshooting runbook (releases→logs→events→metrics→search_docs→diagnose→propose→approve→act→verify), deployment guide patterns, docs-research (query reformulation fa/en, when to read_doc).
- [ ] **Step 3:** `scenarios.ts` with 8 entries (titles + prompts, Persian).
- [ ] **Step 4:** Dev verify: scenario 3 & 8 behave correctly (diagnosis loop; refusal).
- [ ] **Step 5:** Commit `feat: persona, skills, scenarios`

### Task 9: Web UI — chat, citations, activity, RTL

**Files:**
- Create: `src/app/layout.tsx` (fa, dir=rtl, dark), `src/app/page.tsx`, `src/app/globals.css`, `src/components/Chat.tsx`, `Message.tsx`, `Citations.tsx`, `ActivityTimeline.tsx`, `Composer.tsx`
- Consumes: `useEveAgent()` from `eve/react` (per ADR-0007 findings for tool events).

- [ ] **Step 1:** Layout + theme: `<html lang="fa" dir="rtl">`, dark palette (Liara purple accent `#7C3AED` family), Vazirmatn font via `next/font/local` or Google mirror (bundle the woff2 in repo — Iran-safe, no CDN at runtime).
- [ ] **Step 2:** Chat: streaming assistant text, react-markdown + rehype-highlight, copy button on code blocks, auto-scroll, loading state.
- [ ] **Step 3:** Citations: assistant messages render `Citations` chips (title + favicon-less source badge + external link) derived from tool results in the message event stream.
- [ ] **Step 4:** ActivityTimeline: collapsible per-message list of tool calls `{tool, status, ms}`; live-updates while the agent works.
- [ ] **Step 5:** Composer: textarea (Enter=send, Shift+Enter=newline), scenario chips row from `scenarios.ts`, stop button.
- [ ] **Step 6:** Verify in browser (both desktop and 375 px width — responsive rubric).
- [ ] **Step 7:** Commit `feat: chat ui with citations and activity timeline`

### Task 10: Panels — connect, usage, stats, rate limit, logging

**Files:**
- Create: `src/app/api/connect/route.ts`, `src/app/api/stats/route.ts`, `src/app/api/health/route.ts`, `src/components/ConnectPanel.tsx`, `UsageMeter.tsx`, `AboutModal.tsx`, `src/lib/rate-limit.js`, `src/lib/usage.js`, `src/lib/logger.js`, `middleware.ts`
- Test: `tests/rate-limit.test.mjs`

**Interfaces:**
- Produces: `POST /api/connect {token}` → validates against `GET /v1/projects` → `{ok, apps: n}` + httpOnly `sid` cookie; `GET /api/stats` → `{requests, tokensIn, tokensOut, byTool, errors, p95}`; token bucket `rateLimit(key, {limit: 15, windowMs: 60_000})`; `logEvent(obj)` JSON-lines to stdout with Authorization/token redaction; `usage.record()` called from agent layer per completion (mechanism per ADR-0007).

- [ ] **Step 1: Failing test** for bucket (burst passes, 16th in window → false, window slides).
- [ ] **Step 2:** Implement libs + middleware (rate limit on agent routes + `/api/*`, 429 JSON `{error:"نرخ درخواست زیاد است…"}`).
- [ ] **Step 3:** ConnectPanel: token input → POST connect → mode badge (متصل / دمو / فقط مستندات); disconnect clears session store. UsageMeter: tokens + requests this session. AboutModal: architecture + security summary (from spec §2/§4.8, condensed Persian).
- [ ] **Step 4:** Verify: connect with real token → badge متصل; hammer chat → 429 appears; `/api/health` → `{ok:true}`.
- [ ] **Step 5:** Commit `feat: security, rate limiting, usage metering, panels`

### Task 11: Deploy to Liara (target: tonight)

**Files:**
- Create: `liara.json`, `.liaraignore`, `Dockerfile` (only if Node-platform detection fights standalone output)
- Modify: `README.md`

**Interfaces:**
- Produces: public URL, e.g. `https://liara-agent.iran.liara.ir`; `PUBLIC_APP_URL` set; all env vars set in Liara panel.

- [ ] **Step 1:** `liara.json`: `{"platform":"node","app":"liara-agent","region":"iran","plan":"hobby"}` (adjust to actual plan names; `liara app create` if CLI-driven). Build command `npm run build`, start `npm start`, PORT respected (Next standalone listens on `$PORT`).
- [ ] **Step 2:** `npm run build` locally green (catches server/client boundary issues with the big JSON import — if bundling chokes, switch loader to `fs.readFileSync(process.cwd()+'/src/data/docs-index.json')` server-side and add the file to standalone output via `outputFileTracingIncludes`).
- [ ] **Step 3:** Deploy: `npx @liara/cli@latest deploy` (or git push if app is git-connected). Set envs in panel (CLI: `liara env:set`).
- [ ] **Step 4:** **Provider reachability test from the app**: page `/api/health` includes a `chatProviders` probe; if Gateway unreachable from DC, set `CHAT_PROVIDER=liara` in panel — verify agent still chats.
- [ ] **Step 5:** From public URL: run the 8 scenarios manually; check `/api/stats` increments.
- [ ] **Step 6:** Update CHANGELOG + README (URL, judge instructions). Commit `feat: deployed on liara`

### Task 12: Chrome extension + smoke + README

**Files:**
- Create: `extension/manifest.json`, `content.js`, `bubble.css`, `README.md` section, `scripts/smoke.mjs`

- [ ] **Step 1: Extension (MV3)**

```json
// extension/manifest.json
{ "manifest_version": 3, "name": "Liara Agent", "version": "0.1.0",
  "description": "Liara AI Operator — helpdesk on liara.ir",
  "content_scripts": [{ "matches": ["https://*.liara.ir/*", "https://*.liara.cloud/*"],
    "js": ["content.js"], "css": ["bubble.css"], "run_at": "document_idle" }],
  "host_permissions": ["https://*.liara.ir/*"] }
```

`content.js`: fixed ✦ button bottom-left (RTL pages); click toggles `<iframe src="${PUBLIC_APP_URL}?embed=1">` in a 400×600 shadow-DOM panel (URL hard-coded constant at top; options page if minutes allow). `?embed=1` → app hides scenario header, compacts chrome (CSS `:has()` on searchParams in client component).

- [ ] **Step 2:** Load unpacked in Chrome → verify bubble on liara.ir + iframe chat works (CORS: same tool routes; iframe embedding allowed — set `X-Frame-Options` only for non-embed or omit).
- [ ] **Step 3: `scripts/smoke.mjs`**: `node scripts/smoke.mjs https://<url>` runs the 8 scenarios via the agent HTTP route (per ADR-0007), asserts: 200s, ≥1 citation on docs scenarios, no `not_connected` on demo scenarios, 429 after burst; exit code non-zero on failure.
- [ ] **Step 4:** README: product, screenshots, judge guide (demo mode, connect-your-account, scenario list), architecture diagram, rubric mapping table, cost notes, roadmap (context-aware extension, more write tools). Zip extension into `extension/liara-agent-extension.zip`.
- [ ] **Step 5:** Commit `feat: extension, smoke tests, readme` — tag `v0.1.0`.

---

## Out of plan (explicit non-goals)
Eve evals beyond smoke (add only if >2 h slack after Task 12), semantic answer cache beyond query-embedding LRU, DB create/delete tools, WebSocket console, English UI toggle, CI.
