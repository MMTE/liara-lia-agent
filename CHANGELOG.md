# Changelog

All notable changes to Liara Agent. Format: Keep a Changelog; dates are local.

## [Unreleased]

### Added
- 2026-08-22 — Answers reference the exact docs section: the corpus now
  carries per-chunk `anchor`s (from `<Section id>` tags in the MDX, via a
  clean-mdx → `## title {#id}` → chunker pipeline), `search_docs`/`read_doc`
  return `deepUrl` (`url#section-id`), citations deep-link
  `…/route/#section-id` into the docs fork, and the system prompt requires
  inline deep links + «منابع» on every docs answer. Corpus rebuilt
  (5,009 chunks; 1,851 anchored).
- 2026-08-22 — Docs fork: highlight-to-ask. Selecting text on any docs
  page shows a floating bar «✦ پرسیدن از لیا درباره این متن» (+ copy) that
  opens the widget with the quoted selection prefilled; the per-page ask
  pill «پرسیدن از لیا درباره این صفحه» moved into the ✦ bubble launcher
  (bottom-left) replacing the standalone bottom-right `AskLia.jsx`.
- 2026-08-22 — Agent conversational style rules (instructions.md): react to
  prior turns, never parrot the question, one clarifying question max and
  only when it changes the action, short replies in back-and-forth chat.

### Changed
- 2026-08-22 — Markdown rendering switched to `streamdown`
  (vercel/streamdown): memoized block rendering (no full-document flash),
  built-in caret while streaming, Shiki code blocks with copy/download.
  `react-markdown`/`remark-gfm`/`rehype-highlight`/`highlight.js` removed.
- 2026-08-22 — Widget chat UX: stick-to-bottom autoscroll (never yanks the
  user back down while reading), Eve tool traces redesigned as compact
  one-line «thinking» elements (24px, expandable), گفت‌وگو/فعالیت tabs and
  the ActivityView removed (chat page owns the timeline), اتصال حساب لیارا
  is now a small plug icon in the top bar beside history/new-chat (modal
  manages connect/disconnect), and the panel ⇄ sidebar expand works in
  every mount (floating, /chat, docs embed via `lia-size`, extension) with
  the preference persisted (`lia-variant`).

### Fixed
- 2026-08-22 — گفت‌وگوهای قبلی listed nothing for pre-history sessions:
  titles now derive from the reducer projection (raw stream events have no
  role), and the legacy `liara-agent-chat` snapshot is migrated into the
  history list on mount.
- 2026-08-22 — Extension `content.js` crashed with `ReferenceError: iframe
  is not defined` on bubble click — the iframe was never created; it now
  builds the panel + iframe (`/chat?embed=1`) and honors `lia-size`.

- 2026-08-22 — The agent is Lia (لیا) — ADR-0010: renamed from the prototype
  name Liri/لیری across UI copy, embed API (`window.Lia`, `lia-prefill`),
  the docs-fork ask pill (`AskLia.jsx`) and the extension guard; character
  mascot with five 512px posture badges in `public/lia/` (idle / thinking /
  alert / success / worried) mapped to the widget moods, including the new
  `error` mood; agent UI adopts Liara's real palette (accent `#00d4ff`,
  surfaces `#121212`/`#1e1e1e`, dark text on cyan buttons).
- 2026-08-22 — Liri experience port shipped. Presentation layer moved to a
  vendored fork of liara-cloud/docs (`docs-site/`, ADR-0008): the real
  docs site loads `public/embed.js` from the agent origin — ✦ bubble +
  panel iframe (`/chat?embed=1`) — plus a per-page ask button
  «پرسیدن از لیری درباره این صفحه» (`AskLiri.jsx` → `window.Liri.open`).
  In-app docs reader + ⌘K palette deleted; `/` redirects to `/chat`
  preserving the query; citations deep-link into the fork origin
  (`NEXT_PUBLIC_DOCS_SITE_ORIGIN`).
- 2026-08-22 — `/chat` is now the full-page Liri widget (streaming answers,
  tool traces, clarify/plan/verify HITL cards, scenario chips) with an
  embed-aware scope label: «دستیار مستندات لیارا» under `?embed=1`,
  «ایجنت لیارا» otherwise.
- 2026-08-22 — `/console` connected surface: demo hero, real apps list +
  detail via read-only BFF (`/api/liara/*`, httpOnly sid, 401
  `{connected:false}` gate), and a proactive Liri nudge on unhealthy
  deployments.
- 2026-08-22 — Usage meter debug-gated behind `NEXT_PUBLIC_USAGE_METER`
  (ADR-0009): hidden + zero `/api/stats` polling in production.
- 2026-08-22 — Docs-fork sync tooling: `scripts/sync-docs-site.mjs` +
  `docs-site/PATCHES.md` (sha256 drift guards, pre+post-rsync patch
  verification; patches are intentionally stripped on sync — restore via git
  and reapply). Smoke script now covers the new topology: `/` → 307
  `/chat`, `/chat` + `/console` 200, `/api/liara/apps` 401 unauthenticated.
- 2026-08-21 — OpenRouter egress moved to a local reverse-proxy endpoint:
  a small Caddy config (127.0.0.1:8787 → openrouter.ai via xray 10808,
  HTTP CONNECT); `OPENROUTER_BASE` points there. This replaces the custom
  Node SOCKS/TLS implementation. Gateway probe loop removed.
- 2026-08-21 — Design spec approved (approach C: Liara Operator + helpdesk extension):
  `docs/specs/2026-08-21-liara-agent-design.md`.
- 2026-08-21 — Knowledge layer expanded to dual corpus: liara-cloud/docs guides
  (Persian) + developers.liara.ir API reference (~170 clean-markdown pages via llms.txt).
- 2026-08-21 — ADRs 0001–0006: provider chain, Eve framework, embedded hybrid search,
  write approval gate, session token handling, extension scope.
- 2026-08-21 — ADR-0007: eve spike complete. Liara tools via OpenAPI
  connections (vendored specs, operation allow-list), native HITL approvals
  replace the custom two-step gate, per-session tokens via channel auth +
  connection getToken. glm-5.2 promo outage observed (provider-side);
  mitigation CHAT_PROVIDER=liara.
- 2026-08-21 — Retrieval primitives (Task 2): Persian normalization +
  tokenizer, Okapi BM25 index, RRF fusion in `src/lib/` with node:test
  coverage (`tests/retrieval.test.mjs`).
- 2026-08-21 — Docs corpus preprocessing (Task 3): MDX cleaner (imports,
  `<Head>`, JSX → plain markdown; code fences verbatim) + H2/H3-aware
  chunker with ~1200-char hard split, fence-safe (`src/lib/`,
  `tests/chunk.test.mjs`).
- 2026-08-21 — Provider matrix expanded (ADR-0001 addendum): OpenRouter (tests,
  deepseek-chat-v3.1 verified $0.25/M) + OrcaRouter (orcarouter/auto verified,
  deepseek-v4 credit). User authorized paid budget use on Gateway (~$5) and
  OpenRouter. Gateway glm-5.2 promo still 503; persistent probe running.
- 2026-08-21 — Docs corpus builder (Task 4, corpus half):
  `scripts/build-docs-corpus.mjs` → `src/data/docs-chunks.json` — dual corpus,
  4,260 chunks from 1,142 Persian guide pages (liara-cloud/docs clone, URL
  map per sitemap) + 201 api-ref pages (developers.liara.ir llms.txt, /spec/
  excluded, concurrency-8 fetches disk-cached in `.cache/apiref/`).
- 2026-08-21 — cleanMdx fix surfaced by the corpus build: array/fragment
  payload attrs (`Tabs content`, `Step steps`, `Table headers/data`,
  `QuestionBox answer`) are hoisted before tag-stripping, and multi-line
  icon imports are stripped — 458/1143 pages previously lost most of their
  body text to self-closing-tag deletion (`tests/clean-mdx-payload.test.mjs`).
- 2026-08-21 — **Eve runtime verified e2e**: full agent turn via OrcaRouter
  (CHAT_PROVIDER=orca) through next dev + withEve + /eve/v1/session stream +
  useEveAgent client. glm-5.2 promo 503 is upstream (probe watching);
  OpenRouter verified via proxy; Liara AI pending key.
- 2026-08-21 — Tasks 0–3 complete (scaffold c05a97f, eve spike ADR-0007,
  retrieval logic fea2ae1, mdx cleaner 1e25420 — 18/18 tests). Plan carries a
  live execution-status table now.
- 2026-08-21 — Chat UI checkpoint (d9c4745): RTL Persian, Vazirmatn (local),
  scenarios, activity timeline, citation chips, HITL approval cards, streaming.
- 2026-08-21 — Liara OpenAPI connections (Task 6): vendored paas/dbaas specs
  (`scripts/vendor-liara-specs.mjs` → `agent/specs/*.json`), eve connections
  with curated read + three write ops behind native user-approval policy
  (`agent/lib/liara-approval.ts`), per-session token chain
  principal→session-store→DEMO_LIARA_TOKEN (`agent/lib/liara-auth.ts`,
  `src/lib/session-store.js`), connect-validation client
  (`src/lib/liara-client.js`, 3 tests). tsc + `eve info` green; both
  connections discovered in the compiled manifest.
- 2026-08-21 — Task 6 verified & done (01aeb5c): Liara OpenAPI connections
  compiled into the agent (eve info clean), 21/21 tests, approval policy gates
  restartApp/updateEnvs/releasesDeploy. Design note for Task 10: channel AuthFn
  must stamp {principalId: sid, principalType: 'user'} for connected sessions;
  unauthenticated turns resolve the demo token via app-principal auth.
- 2026-08-21 — Tasks 5+8 done: search_docs/read_doc tools over the dual corpus
  (BM25+RRF now, cosine bolts on with embeddings), skills (troubleshooting,
  deployment, docs-research). Live-verified: agent runs Persian→English query
  reformulation then read_doc on laravel/quick-start and answers with citations.
- 2026-08-21 — Task 10 done: edge rate limiting verified (30/min eve, 120/min
  api — 429 at request 31), POST /api/connect validates token via Liara API and
  stamps sid→user-principal (channel AuthFn), health/stats endpoints, live
  usage meter fed from stream events, connect + about panels, hydration guard.
- 2026-08-21 — Task 12 done: MV3 extension (✦ bubble → iframe ?embed=1),
  scripts/smoke.mjs green (3 scenarios: settled + citations + 4/4/2 tool calls),
  README with judge guide, prod build green (standalone + data tracing).
  Remaining: deploy (needs Liara login), HITL live verify + embeddings (user keys).
