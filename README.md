# ✦ ایجنت لیارا — Liara Agent

**اپراتور هوشمند ابر لیارا**: یک ایجنت LLM که مستندات لیارا را می‌خواند، به حساب شما وصل می‌شود،
اپ‌ها/لاگ‌ها/دیپلوی‌ها را بررسی می‌کند، مشکل را تشخیص می‌دهد و — فقط با تأیید شما — اصلاح می‌کند.

Not a docs chatbot — an **AI cloud operator** grounded in Liara's documentation
(Persian guides + English API reference) and wired to Liara's official platform
APIs with human-in-the-loop approvals for every mutation.

The presentation layer is the **real docs site**: a vendored fork of
[liara-cloud/docs](https://github.com/liara-cloud/docs) with Liri woven in
(ADR-0008). This repo's Next.js app is the agent service behind it.

## Where to try it (judge guide)

1. **Primary — the docs fork deployment**: browse the deployed docs site
   (real docs.liara.ir experience). Every page carries the ✦ Liri bubble and a
   per-page ask button «✦ پرسیدن از لیری درباره این صفحه» that opens the
   assistant with a question about that exact page prefilled (never auto-sent).
2. **Agent app — `/chat`**: the full-page Liri widget (same brain, standalone).
   Ask any Liara question in Persian or English.
3. **Connect your account**: on `/console` (or via the widget's connect panel)
   paste an API token from your Liara panel (Settings → API tokens). The token
   is validated against `GET /v1/projects`, stored in server memory only, and
   never logged. `/console` then shows your real apps; if a deployment looks
   unhealthy, Liri proactively nudges with a diagnosis offer.
4. Run the **one-click scenario chips** above the composer — six prompts
   covering simple docs, multi-hop, incident, ambiguous→clarify, follow-up
   context, and config generation (the full library adds next-steps and
   adversarial refusal, exercised by `scripts/smoke.mjs`).
5. **Chrome extension**: load `extension/` unpacked on `chrome://extensions` —
   the same ✦ bubble on `*.liara.ir`, pointing at the deployed agent.

## What it does

| Capability | How |
|---|---|
| **Docs Q&A with citations** | Hybrid search (BM25 + vector RRF) over the full corpus — 4,260 chunks from 1,142 Persian guide pages (docs.liara.ir) + 201 API-reference pages (developers.liara.ir). Every answer cites its sources; citations deep-link into the docs fork when its origin is configured. |
| **Per-page ask button** | On every docs-fork page: «✦ پرسیدن از لیری درباره این صفحه» prefills the composer with a question about that page's title. |
| **Incident diagnosis** | Connect your account → the agent inspects releases, logs, events and metrics via Liara's official API, correlates with docs, and reports root cause + evidence + fix. On `/console` an unhealthy deployment triggers a proactive nudge. |
| **Connected console** | `/console` = your real Liara apps (BFF passthrough, read-only) + the Liri widget with surface context. |
| **Guided fixes with approval** | Mutations (restart / env change / redeploy) pause for your explicit approval — Eve's durable HITL. Destructive operations are not exposed at all. |
| **Clarifying questions** | Ambiguous requests trigger native `ask_question` prompts with option buttons. |
| **Context memory** | Durable sessions survive restarts; follow-ups like «لاگ‌هاش رو نشون بده» resolve against the pinned app. |
| **Security** | Per-IP+session rate limiting (verified 429), tokens memory-only + never logged, session token budgets, tool-output caps. |
| **Cost control** | Session token budgets with approve/stop prompts, output truncation, query-embedding cache, zero external infra (embedded index — no vector DB), usage meter debug-gated off in production (ADR-0009). |

## Architecture

Two Liara deployments (ADR-0008):

```
docs-site (static, fork of liara-cloud/docs)     agent (this repo — Node app)
┌──────────────────────────────────────┐         ┌───────────────────────────────┐
│ real docs.liara.ir pages + PATCHES   │ embed.js│ Next.js 16 + Eve agent        │
│ _app.js loads  <agent>/embed.js      │◄────────┤ /eve/v1/session (SSE stream)  │
│ ✦ bubble → iframe /chat?embed=1      │ iframe  │ /api/health · /stats · connect│
│ AskLiri pill → window.Liri.open(...) │────────►│ /api/liara/apps (BFF, 401 gate)│
└──────────────────────────────────────┘         │ /chat (widget) · /console     │
                                                 │ / → 307 /chat (query kept)    │
                                                 └───────────────────────────────┘
     Chrome extension: same embed pattern — ✦ bubble on *.liara.ir → iframe
```

- **Agent internals**: Eve agent (`agent/`) with durable sessions, HITL
  approvals, skills; `tools/search_docs` + `read_doc` over the embedded hybrid
  index; `connections/liara-paas` + `liara-dbaas` from vendored official
  OpenAPI specs (operation allow-list, approval policy on the three write ops);
  skills for troubleshooting, deployment, docs-research.
- **Embed contract**: `public/embed.js` (agent origin) renders the bubble +
  panel iframe and exposes `window.Liri = { open(prefill), close() }`. The
  panel accepts `postMessage {type:"liri-prefill"}` from the app's own origin
  and the configured docs origin (in local dev without the env, additionally
  the embedding referrer's origin — non-production only). `?embed=1` switches
  the widget's scope label to «دستیار مستندات لیارا».
- **Model**: `zai/glm-5.2` via Vercel AI Gateway, optionally pinned to
  Blackbox with `CHAT_PROVIDER=blackbox`. Liara AI, OpenRouter, and any
  OpenAI-compatible endpoint are switchable through env only.
- **Embeddings** (optional semantic channel): Liara AI `multilingual-e5-large`;
  BM25+RRF works standalone when unset.

## The docs fork (`docs-site/`)

Vendored fork of `liara-cloud/docs` — the presentation layer. Local diffs vs
upstream are listed in `docs-site/PATCHES.md` (each with a drift-check
sha256). Sync with upstream:

```bash
node scripts/sync-docs-site.mjs
```

The sync rsyncs upstream over `docs-site/` **by design reverting/stripping the
patches** (it preserves `node_modules/`, `.next/`, `out/`, `PATCHES.md`). When
the post-sync guard reports wiped patches, restore and reapply them:

```bash
git checkout HEAD -- docs-site/<patch-target>
# re-apply the intentional diff per PATCHES.md, update its upstream-sha256
```

The guard fails loudly (exit 1, `docs-site/` untouched) if upstream drifted
under a patch. Build: `cd docs-site && yarn && yarn build` → `out/` static
export (~1,154 pages).

Docs: `docs/specs/` (design) · `docs/adr/` (decisions — 0008 docs fork, 0009
usage-meter gate) · `CHANGELOG.md` · `docs/plans/` (execution log) ·
`prototype/` (design reference for the widget).

## Run locally

```bash
cp .env.example .env   # set CHAT_PROVIDER + provider key
npm i
npm run dev            # http://localhost:3000 — /chat, /console
node scripts/smoke.mjs http://localhost:3000
node --test            # 60 unit tests
```

Docs corpus rebuild: `node scripts/build-docs-corpus.mjs` (idempotent, cached).
Docs-site dev server: `cd docs-site && yarn dev` (set
`NEXT_PUBLIC_AGENT_ORIGIN=http://localhost:3000` to point the embed at the
local agent).

## Deploy on Liara — two apps

1. **Agent app** (this repo, Node platform, Next standalone): set env vars
   (`CHAT_PROVIDER`, provider keys, `DEMO_LIARA_TOKEN`,
   `NEXT_PUBLIC_DOCS_SITE_ORIGIN=https://<docs-app>.liara.ir` so citations
   deep-link into the fork and prefills are trusted). Durable sessions live in
   `.eve/.workflow-data` — mount it on persistent storage. Leave
   `NEXT_PUBLIC_USAGE_METER` unset in production (ADR-0009).
2. **Docs-site app** (static): `cd docs-site && yarn && yarn build`, deploy
   `out/` as a static Liara app with
   `NEXT_PUBLIC_AGENT_ORIGIN=https://<agent-app>.liara.ir` set at build time —
   it wires `embed.js` and the AskLiri pill to the agent.

The two origins must point at each other
(`NEXT_PUBLIC_AGENT_ORIGIN` ↔ `NEXT_PUBLIC_DOCS_SITE_ORIGIN`).

## Chrome extension (bonus)

`extension/` — MV3 helpdesk bubble on `*.liara.ir`: floating ✦ opens
`/?embed=1` → `/chat?embed=1` in a panel. Load unpacked from
`chrome://extensions`. Same embed pattern the docs fork uses.

## Roadmap

Semantic reranking · create-app / DB provisioning flows · streaming log tail
tool · native island embed (no iframe) · eval suite on the 8 scenarios.
