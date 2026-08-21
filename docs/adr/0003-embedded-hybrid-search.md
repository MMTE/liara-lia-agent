# ADR-0003: Embedded hybrid search — no external vector DB

## Status
Accepted 2026-08-21

## Context
1,143 docs pages → ~6k chunks. Options: managed vector DB, Meilisearch service (what
Liara itself uses, keyword-only), Liara DBaaS + pgvector, or embedded in-process index.
Rubric weighs cost optimization and deployment simplicity; docs corpus is small and
read-mostly.

## Decision
Precompute chunks + embeddings at build time (Liara AI e5-large), bundle as JSON, and
serve hybrid BM25 + cosine search fully in-memory inside the single Next.js process
(Persian-normalized BM25, RRF fusion).

## Consequences
+ Zero extra services, zero marginal cost, no cold-start DB, single deployment — strong
  cost and deployment stories.
+ Semantic layer exceeds docs.liara.ir's own keyword-only Meilisearch.
− Corpus updates require re-running the build script (acceptable; repo is the source of
  truth, script is cached/idempotent).
− Memory: ~6k × 1024 floats ≈ 25 MB resident — fine on smallest plan.
