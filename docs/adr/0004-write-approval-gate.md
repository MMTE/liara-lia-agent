# ADR-0004: Approval gate for write tools

## Status
Accepted 2026-08-21 · Revised 2026-08-22 (v2: full API surface, method-based gate)

## Context
Agent can mutate user infrastructure. Silent mutations are unacceptable.
v1 exposed a curated surface (PaaS reads + 3 writes, DBaaS reads) and hid
delete-class operations entirely. The product now requires Lia to operate
the **entire** Liara API (9 services, 184 operations — see
`agent/specs/ops.json`), so curation-by-omission no longer scales.

## Decision (v2)
1. **Full surface, method-classified.** Every operation of every vendored
   spec is exposed. `agent/lib/liara-approval.ts` classifies from the
   vendored manifest (`ops.json`: service → operationId → method):
   `GET` → runs freely; anything else → native eve `user-approval` pause.
   No per-operation hand lists to drift.
2. **Destructive-class severity lives in instructions.** DELETE/destroy/
   reset/unfreeze/downgrade operations get the same native gate; the agent
   is required (agent/instructions.md §Parameter discipline) to name the
   resource and state irreversibility *before* the call, and to suggest a
   backup when one exists. `DESTRUCTIVE` is exported for tests/instructions.
3. **Hiding is replaced by disclosure + approval.** v1's "delete ops are
   not exposed" is superseded: the user explicitly asked for all
   capabilities. Risk control = approval gate + pre-call summary +
   read-back verification rule.
4. AI generation endpoints (chat/images/tts) also count as writes — they
   consume workspace credit.

## Consequences
+ One gate covers 98 non-GET operations across 9 services with zero
  per-service configuration.
+ Approval prompt is the last line of defense; instructions enforce the
  summary-before-call contract.
− The model can now attempt destructive operations (by user request);
  the gate + discipline rules are what keep them deliberate.
− ops.json must be regenerated whenever specs are re-vendored
  (`node scripts/vendor-liara-specs.mjs` does both atomically).

## History
- v1 (2026-08-21): native eve HITL verified; three write ops
  (`restartApp`, `updateEnvs`, `releasesDeploy`) behind approval;
  delete-class not exposed. Superseded by v2.
