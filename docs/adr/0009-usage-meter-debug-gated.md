# ADR-0009: Usage meter is a debugging aid — hidden in production/demo

## Status
Accepted 2026-08-21 — product-owner decision.

## Context
The chat footer renders a live stats strip (`src/components/UsageMeter.tsx`):
🏁 turns · ↑ input tokens · ↓ output tokens · ⚡ cache · ⏱ p95 · ✖ errors, polled from
`/api/stats` every 15s. These are operational debugging signals — meaningless and noisy
for judges and end users on the production/demo deployment.

## Decision
1. The usage-meter strip is a **debug-only** surface. It renders (and polls) only when
   `NEXT_PUBLIC_USAGE_METER=1` is set; otherwise the component returns `null` and fires
   **zero** `/api/stats` requests (also saves pointless polling traffic — cost rubric).
2. `NEXT_PUBLIC_USAGE_METER` is documented in `.env.example` (default unset = hidden).
   Local debugging and the operator's own sessions set it explicitly.
3. `/api/stats` itself stays mounted (server-side observability + smoke checks); only the
   client strip is gated. Widget/panel consumers inherit the same gate via the shared
   component.
4. Applies equally to the Liri widget panel (Task 7/8b) — the footer meter there uses the
   same component and env.

## Consequences
+ Clean judge-facing UI in production/demo; no dead polling from hidden UI.
+ Ops keep the metrics endpoint for logs/monitoring and debug sessions.
− One more env to remember when debugging (documented in .env.example).
