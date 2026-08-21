# Liara Agent — Design Spec

Date: 2026-08-21 · Deadline: 2026-08-22 15:00 · Status: Approved (approach C: Operator + helpdesk extension)

## 1. Problem & Product

Liara's challenge asks for an LLM app that helps users find, understand, and act on Liara
documentation. We build:

> **Liara Agent** — an AI cloud operator grounded in Liara's documentation that can also
> inspect and operate the user's Liara resources through natural language.

Not a docs chatbot. Docs are the agent's *knowledge layer*; Liara's public APIs are its
*hands*. The agent answers, diagnoses incidents, proposes fixes, and — after explicit
approval — executes them.

### Surfaces
| Surface | Purpose | Status |
|---|---|---|
| Web app (public link on Liara) | Scored surface: chat, tools, demos | P0 |
| Chrome extension (MV3) | Helpdesk bubble on `*.liara.ir` iframing the deployed app | P1 (~1h) |
| CLI / other channels | — | Out of scope |

### Modes (per session)
- **Docs mode** — default. Search/read docs only. Works with zero configuration.
- **Connected mode** — user pastes their Liara API token; agent gains read tools +
  approval-gated write tools against their account.
- **Demo mode** — env-provided token for a dedicated demo account; used when judges
  click seeded scenarios. Same tool surface as connected mode.

## 2. Rubric mapping (300 pts)

| Criterion | Pts | How we earn it |
|---|---|---|
| Response quality & correctness | 80 | Hybrid retrieval (BM25+vector) over full docs corpus; citations on every docs claim; refusal rule when confidence low; Persian+English answers |
| UI & UX | 55 | RTL Persian-first chat, streaming, code highlighting, citation chips, tool-activity timeline, one-click demo scenarios, connect panel, usage meter |
| Agentic & personalization | 50 | Intent routing; observe→diagnose→plan→approve→act→verify loops; pinned app context for follow-ups; clarifying questions; next-step suggestions |
| Security & reliability | 50 | Rate limiting, memory-only session tokens, log redaction, output truncation, tool-loop caps, provider fallback, /stats monitoring, structured logs |
| Deployment on Liara | 40 | Single Next.js+Eve Node app deployed via Liara platform; health endpoint; env-config |
| Cost optimization | 25 | Free glm-5.2 primary; Liara AI fallback; precomputed embeddings; zero extra infra; output/history truncation; in-memory search |

## 3. Architecture

Single Next.js (App Router) application; the Eve agent mounts same-origin via `withEve()`.

```
┌────────────────────────────────────────────────────────┐
│ Next.js app (one Liara deployment)                     │
│                                                        │
│  UI (src/)            Eve agent (agent/)               │
│  chat + panels        instructions.md + skills/        │
│        │              tools/                           │
│        │               ├─ search_docs / read_doc       │
│        ▼               ├─ liara read tools             │
│  useEveAgent() ◄───────┤    (list/get/logs/releases/    │
│  (same-origin)         │     events/metrics/dbs)       │
│                        └─ liara write tools ⚠ approval │
│                             (restart / update_envs /   │
│                              redeploy)                 │
│  lib/: docs-index (BM25+cosine), liara-client,         │
│        session-token store, rate-limit, usage meter    │
└──────┬──────────────────────┬──────────────────────────┘
       │                      │
       ▼                      ▼
 ai.liara.ir (embeddings,   api.iran.liara.ir (PaaS/DBaaS,
 fallback chat)             per-session Bearer token)
 + Vercel AI Gateway (zai/glm-5.2 primary chat)
```

No vector DB, no Redis, no queue. The docs index (chunks + embeddings) is precomputed by
`scripts/build-docs-index.mjs` and bundled; search is in-memory.

## 4. Components

### 4.1 Docs pipeline (`scripts/build-docs-index.mjs`)
1. `git clone --depth 1` liara-cloud/docs (cached).
2. Walk `src/pages/**/*.{md,mdx}` (1,143 files).
3. Clean MDX: strip imports, `<Head>`, JSX tags (keep inner text), keep code fences
   verbatim; extract title from `<title>` or first `# H1`.
4. Chunk by heading sections (H2/H3), ~1,200 chars max; metadata: `slug` (path →
   docs.liara.ir URL), `title`, `product` (paas/dbaas/ai/…), `sectionPath`.
5. Embed via Liara AI `intfloat/multilingual-e5-large` (`query:`/`passage:` prefixes),
   batched, disk-cached (re-runs free).
6. Emit `src/data/docs-index.json` (chunks + base64 float32 vectors).

### 4.2 Retrieval (`src/lib/docs-index.ts`)
- BM25 (mini index, Persian normalization: strip ZWNJ, map ي→ی ك→ک, Arabic→Persian digits)
  + cosine top-k, RRF fusion, k≈6 chunks.
- `search_docs` tool: query → fused chunks with `{title, url, snippet}`.
- `read_doc` tool: slug → full cleaned page (truncated).

### 4.3 Liara client (`src/lib/liara-client.ts`)
Typed, hand-written for the 11 endpoints below (extracted from liara-cloud/openapi specs;
apps are `/v1/projects/*` in Liara's API):

| Tool | Endpoint | Class |
|---|---|---|
| `list_apps` | GET /v1/projects | read |
| `get_app` | GET /v1/projects/{name} | read |
| `get_app_logs` | GET /v1/projects/{name}/logs?since= | read (output capped) |
| `get_app_events` | GET /v1/projects/{name}/events | read |
| `get_app_releases` | GET /v1/projects/{name}/releases | read |
| `get_app_metrics` | GET /v1/projects/{name}/metrics/{cpu\|memory\|summary\|network-*} | read |
| `list_databases` | GET /v1/databases (DBaaS) | read |
| `get_database` | GET /v1/databases/{name} (DBaaS) | read |
| `restart_app` | POST /v1/projects/{name}/actions/restart | **write** |
| `update_envs` | POST /v1/projects/update-envs | **write** |
| `redeploy` | POST /v1/projects/{name}/releases (releasesDeploy) | **write** |

Auth: per-session Bearer token (connected/demo mode). 401 → agent prompts to connect.

### 4.4 Approval gate (writes)
Eve HITL if the web channel exposes it (verify during build); otherwise enforced two-step
tool protocol: write tool called with `propose` returns an `actionId` + human-readable
diff; `execute` requires the same `actionId` and only runs after the user's explicit "yes"
message in the session (consent is checked from the transcript by the server-side gate,
not trusted to the model). UI shows pending actions with Approve/Reject buttons when
possible. Never silent mutations; destructive ops (delete app/db) are not exposed at all.

### 4.5 Agent (agent/)
- `agent.ts`: model `zai/glm-5.2` (AI Gateway) primary; provider order env-configurable
  (`CHAT_PROVIDER=vercel|liara`), automatic fallback on failure.
- `instructions.md`: identity (Liara cloud operator), language mirroring (fa/en),
  citation requirement, refusal-when-unsure, approval policy, pinned-app context rule,
  next-step suggestion rule.
- `skills/`: `troubleshooting.md` (incident runbook: releases→logs→events→docs→diagnose→
  propose), `deployment.md`, `docs-research.md`.

### 4.6 Web UI (src/, RTL Persian-first)
- Streaming chat, markdown + code highlight + copy buttons.
- Citation chips → docs.liara.ir links.
- Tool-activity timeline per assistant message (collapsible).
- 8 one-click demo scenarios (see §6).
- Connect-Liara panel (paste token; stored server-side in session memory only).
- Usage meter (tokens/request/model) + /stats monitoring page.
- About modal: architecture + security notes for judges.

### 4.7 Chrome extension (extension/)
MV3: content script matches `*.liara.ir/*`, injects ✦ bubble; click → iframe panel of the
deployed app URL (from extension options). Packaged zip in repo. No dashboard DOM parsing.

### 4.8 Security & reliability
- Rate limit: per-IP+session token bucket (≈15 req/min) → 429 + Persian message.
- Secrets: env-only. Judge tokens: memory-only, never logged, redaction middleware strips
  Authorization values from logs.
- Token control: tool outputs capped (logs 8 KB), history window capped, max tool
  iterations per turn capped.
- Monitoring: structured per-request logs (session, latency, tokens, tools) + aggregate
  /stats endpoint.
- Errors: provider fallback chain; tool errors retried once, surfaced in Persian.

### 4.9 Deployment (Liara)
- Liara Node.js platform app (Next standalone output). `liara.json` config; deploy via
  Liara CLI or git. Health: `/api/health`. Env: gateway key, Liara AI key, demo token,
  provider order.
- Deploy early (target: first deployment tonight), not last.
- Risk: Iran DC outbound to Vercel Gateway — test at deploy; if blocked, flip primary to
  ai.liara.ir via env (ADR-0001).

## 5. Data flows

**Docs Q&A**: user → agent → search_docs (+read_doc) → answer + citations + next steps.
**Incident**: "my app is down" → agent: get_app → get_app_releases → get_app_logs →
get_app_events → search_docs → diagnosis + proposed fix → (approval) → restart/update/
redeploy → verify (re-check release status/logs) → report.
**Provisioning sketch**: "add Redis" → plan (docs-grounded) → list what will change →
(approval; only whitelisted writes available) → execute → verify.

## 6. Demo scenarios (seeded one-click prompts)

1. Simple docs: «چطور برنامه Laravel رو روی لیارا دیپلوی کنم؟»
2. Multi-hop docs: compare plans / limits across services with citations.
3. Incident: failed deployment → full diagnose loop (demo mode).
4. Ambiguous: agent asks clarifying question (which app? which region?).
5. Follow-up context: "حالا لاگ‌هاش رو نشون بده" after scenario 3.
6. Config generation: liara.json / Dockerfile guidance grounded in docs.
7. "What next?" — proactive suggestions after resolving an incident.
8. Adversarial: asks about a feature Liara doesn't have → refuses, cites closest docs,
   no fabrication.

## 7. Verification

- `scripts/smoke.mjs`: hits deployed URL with the 8 scenarios; asserts citations present,
  no 5xx, tool calls succeeded.
- Eve evals (agent/evals/) if time remains after deploy.
- Manual: RTL layout, connect flow, rate-limit 429, stats page.

## 8. Out of scope (documented as roadmap)

Chrome extension beyond the helpdesk bubble (context-aware injection, auto-diagnostics),
CLI channel, mutations beyond restart/envs/redeploy (create/delete app, DB create),
semantic cache, team workspaces, English UI localization toggle.
