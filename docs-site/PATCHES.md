# docs-site patches

This directory is a vendored fork of [liara-cloud/docs](https://github.com/liara-cloud/docs) —
the presentation layer for Liri (ADR-0008). The agent app remains the backend service.

- Upstream: https://github.com/liara-cloud/docs
- Synced commit: `dbb7430b1abc5bf92ccca3538f45c54bdc632fa8` (2026-08-21)
- Sync tool: `node scripts/sync-docs-site.mjs` (repo root) — shallow-clones upstream,
  rsyncs over this directory (preserving `node_modules/`, `.next/`, `out/`, this file),
  and fails loudly if any patch below no longer applies.

## Patches

Intentional diffs vs upstream. Every entry MUST list its target file(s) in backticks and
record the sha256 of that file in pristine upstream at patch time as
`` `upstream-sha256:<hex>` `` — the sync script uses it to detect upstream drift.

_None yet._

## Integration facts (Task 4 investigation, 2026-08-21)

Facts the embedding work (Task 8) depends on. No code was changed to gather these.

### (a) Header search — Meilisearch

`src/components/Header/index.jsx` constructs the client with a **hardcoded public
host + API key** (`https://search.liara.ir`, key `53c93d…bb11`) — not env-gated, no
credentials needed. Verified live: `POST /indexes/docs/search` with that key returns
real hits. **No build-time or setup dependency for us.**

Degradation: `handleMeiliSearch` calls `.then(...)` with **no `.catch()`** — if
`search.liara.ir` is unreachable (offline / blocked), the promise rejects unhandled,
results stay empty and the `notFound` flag is never set: **search fails silently**;
the rest of the page is unaffected.

### (b) Fonts / images — self-contained except analytics + og:image

- Fonts: **self-hosted** — YekanBakh woff/woff2 served from `out/static/fonts/`
  (referenced as `url(/static/fonts/...)` in the exported CSS; files confirmed in `out/`).
- Images/icons: **self-hosted** — bundled under `out/_next/static/media/` or
  `out/static/images/`, `/static/logo.svg`. `@liara/platformicons` ship in the bundle.
- External fetches found in exported HTML (runtime, non-fatal):
  - `https://www.googletagmanager.com/gtm.js?id=GTM-5C8DVF39` + noscript iframe —
    hardcoded in `src/pages/_document.js` (Google Analytics; fails silently offline).
  - `https://media.liara.ir/liara-features/liara-opengraph.jpg` — `og:image` meta only.
  - `https://search.liara.ir` — search API (see (a)).

### (c) Export size

- `yarn build` → 1154 exported pages (`find out -name index.html | wc -l`), `out/` ≈ 67 MB.
- Build wall clock: yarn install 1m50s; full build (sitemap + fetch:models + next build
  + postbuild) 9m06s on this machine. `fetch:models` hits `https://ai.liara.ir/v1/models`
  (succeeded; on failure it `exit(1)` by design — fatal, no env skip).
