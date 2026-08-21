# ADR-0004: Approval gate for write tools

## Status
Accepted 2026-08-21

## Context
Agent can mutate user infrastructure (restart, env changes, redeploy). Silent mutations
are unacceptable; Eve HITL web-channel support is unverified pre-build.

## Decision
Two-tier mechanism, decided at build time after reading `node_modules/eve/docs`:
1. Prefer Eve's native HITL/approval if exposed to the web channel.
2. Fallback (designed in): server-side two-step protocol — write tools accept
   `propose` returning an `actionId` + diff; execution requires the same `actionId` AND
   an explicit user consent message observed in the session transcript. The gate is
   enforced in server code, not by model promises.

Destructive operations (delete app, delete database) are not exposed as tools at all.

## Consequences
+ Mutations are always user-visible and user-approved; approval UX renders in chat.
+ Works regardless of Eve's HITL maturity.
− Slightly more tool-call overhead per mutation (acceptable).
