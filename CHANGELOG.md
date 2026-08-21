# Changelog

All notable changes to Liara Agent. Format: Keep a Changelog; dates are local.

## [Unreleased]

### Added
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
