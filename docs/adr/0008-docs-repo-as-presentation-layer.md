# ADR-0008: Docs presentation layer = fork of liara-cloud/docs; agent as separate service

## Status
Accepted 2026-08-21 — product-owner decision. Supersedes the custom docs-reader surface
planned for the app root in `docs/superpowers/plans/2026-08-21-liri-experience-port.md` (Phase A).

## Context
We evaluated building an in-app docs reader over our retrieval corpus. It duplicates work
liara already ships: `github.com/liara-cloud/docs` is the actual docs.liara.ir site —
Next.js 14 + MDX, Persian RTL, Tailwind, Meilisearch search, `output: "export"` static
build — and is the listed documentation source for the challenge. A replica is strictly
worse than the real product for judges.

Decision (product owner): the docs repo is the **main source of truth for the document
side**. We integrate Liri into that. The agent remains our own project, and the widget on
the docs site requests our agent server.

## Decision
1. **Presentation layer** for documentation = a fork of `liara-cloud/docs`, vendored at
   `docs-site/` in this repo (upstream remote recorded; `scripts/sync-docs-site.mjs`
   pulls). It builds with its own toolchain (yarn 1, `output: "export"`) and deploys as
   its **own Liara app**. Patches against upstream are kept minimal and listed in
   `docs-site/PATCHES.md`.
2. **Agent service** = this repo's Next.js 16 + Eve app (deployed separately, e.g.
   `liara-agent`). It stays the only backend: `/eve/*` streaming, `/api/*`, embeddings,
   Liara connections. The docs site never implements agent logic.
3. **Liri embedding**: the docs site loads a loader script `embed.js` served from the
   agent origin (injected via a patched `src/pages/_app.jsx`). v1 renders the floating
   bubble + an iframe panel pointed at the agent origin (the proven Chrome-extension
   pattern, ADR-0006) — same-origin cookies stay inside the iframe, so no CORS or
   cookie-policy changes are needed. A native island (cross-origin fetch + explicit CORS
   headers) is a later upgrade, not a launch requirement.
4. Chrome extension remains as-is — a second consumer of the same embed pattern.
5. The in-app custom reader (plan Tasks 1–3 output) is demoted to a fallback surface;
   agent answer citations deep-link to the docs-site origin (`urlToRoute` maps corpus
   URLs to its paths). Deletion of the fallback is decided after the docs-site
   deployment is verified.

## Consequences
+ Judges get the real docs.liara.ir experience with Liri woven in — not a replica.
+ One intelligence server; widget/extension/docs all consume the same agent.
+ No duplicate reader/search to build or maintain (drops the ⌘K-palette task).
− Two Liara deployments to keep aligned; the docs origin is env-config on both sides.
− Their build adds deploy complexity (yarn 1, `fetch:models` network step, Meilisearch
  client) — verified and stubbed where needed during bring-up.
− Upstream drift needs sync discipline (`sync-docs-site.mjs`).
