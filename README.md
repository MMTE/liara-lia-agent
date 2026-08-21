# ✦ ایجنت لیارا — Liara Agent

**اپراتور هوشمند ابر لیارا**: یک ایجنت LLM که مستندات لیارا را می‌خواند، به حساب شما وصل می‌شود،
اپ‌ها/لاگ‌ها/دیپلوی‌ها را بررسی می‌کند، مشکل را تشخیص می‌دهد و — فقط با تأیید شما — اصلاح می‌کند.

Not a docs chatbot — an **AI cloud operator** grounded in Liara's documentation
(Persian guides + English API reference) and wired to Liara's official platform
APIs with human-in-the-loop approvals for every mutation.

---

## What it does

| Capability | How |
|---|---|
| **Docs Q&A with citations** | Hybrid search (BM25 + vector RRF) over the full corpus — 4,260 chunks from 1,142 Persian guide pages (docs.liara.ir) + 201 API-reference pages (developers.liara.ir). Every answer cites its sources. |
| **Incident diagnosis** | Connect your account → the agent inspects releases, logs, events and metrics via Liara's official API, correlates with docs, and reports root cause + evidence + fix. |
| **Guided fixes with approval** | Mutations (restart / env change / redeploy) pause for your explicit approval — Eve's durable HITL. Destructive operations are not exposed at all. |
| **Clarifying questions** | Ambiguous requests trigger native `ask_question` prompts with option buttons. |
| **Context memory** | Durable sessions survive restarts; follow-ups like «لاگ‌هاش رو نشون بده» resolve against the pinned app. |
| **Security** | Per-IP+session rate limiting (verified 429), tokens memory-only + never logged, session token budgets, tool-output caps, live usage meter. |
| **Cost control** | Session token budgets with approve/stop prompts, output truncation, query-embedding cache, zero external infra (embedded index — no vector DB). |

## Try it (judge guide)

1. **Docs mode** works out of the box — ask any Liara question in Persian or English.
2. **Connect your account**: click «اتصال حساب لیارا» and paste an API token from your
   Liara panel (Settings → API tokens). The token is validated against
   `GET /v1/projects`, stored in server memory only, and never logged.
3. Run the **8 one-click scenarios** (chips above the composer) — they map to the
   rubric: simple docs, multi-hop, incident, ambiguous→clarify, follow-up context,
   config generation, next-steps, and adversarial (refuses to fabricate).

## Architecture

```
Next.js 16 (single Liara deployment)
├── Eve agent (agent/) — durable sessions, HITL approvals, skills
│   ├── tools/search_docs, read_doc          ← embedded hybrid index
│   ├── connections/liara-paas, liara-dbaas  ← vendored official OpenAPI specs,
│   │   operation allow-list (13 ops), approval policy on writes
│   └── skills/troubleshooting, deployment, docs-research
├── Chat UI (RTL, Persian-first) — streaming, citations, activity timeline,
│   approval cards, usage meter, connect panel
└── /api/connect · /api/health · /api/stats + edge rate limiting
```

- **Model**: `zai/glm-5.2` via Vercel AI Gateway (free promo for eve agents through
  Aug 27) with OpenAI-compatible fallbacks: Liara AI (`ai.liara.ir`), OpenRouter,
  OrcaRouter — switchable via `CHAT_PROVIDER` env, no code change.
- **Embeddings** (optional semantic channel): Liara AI `multilingual-e5-large`;
  BM25+RRF works standalone when unset.

Docs: `docs/specs/` (design) · `docs/adr/` (decisions) · `CHANGELOG.md` · 
`docs/plans/` (execution log).

## Run locally

```bash
cp .env.example .env   # set CHAT_PROVIDER + provider key
npm i
npm run dev            # http://localhost:3000
node scripts/smoke.mjs http://localhost:3000
node --test            # 28 unit tests
```

Docs corpus rebuild: `node scripts/build-docs-corpus.mjs` (idempotent, cached).

## Deploy on Liara

Node platform app (Next standalone). Set env vars (`CHAT_PROVIDER`, provider
keys, `DEMO_LIARA_TOKEN`), deploy via `@liara/cli` or git, health-check
`/api/health`. Durable sessions live in `.eve/.workflow-data` — mount it on
persistent storage.

## Chrome extension (bonus)

`extension/` — MV3 helpdesk bubble on `*.liara.ir`: floating ✦ opens the
deployed agent in a panel. Load unpacked from `chrome://extensions`. Roadmap:
context-aware injection (auto-diagnostics on failed deployments).

## Roadmap

Semantic reranking · create-app / DB provisioning flows · context-aware
dashboard extension · streaming log tail tool · eval suite on the 8 scenarios.
