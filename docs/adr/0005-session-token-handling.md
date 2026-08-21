# ADR-0005: Per-session, memory-only Liara API tokens

## Status
Accepted 2026-08-21

## Context
Judges connect their own credited Liara accounts by pasting API tokens; we also ship a
demo-mode token. Tokens are full-account credentials.

## Decision
Connected-mode tokens live only in server process memory keyed by session id — never
written to disk, never logged (redaction middleware strips Authorization values), never
returned to the client after submission. Demo-mode token comes from env. Session store is
lost on restart — users simply re-paste; acceptable for a demo product.

## Consequences
+ No secret persistence surface; log-leak risk eliminated; simple.
+ Rate limiting and usage metering key off the same session id.
− Restart requires re-connect (documented in UI).
