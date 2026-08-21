# ADR-0006: Chrome extension = helpdesk bubble only

## Status
Accepted 2026-08-21

## Context
The ideal extension (context-aware injection into Liara's dashboard, auto-diagnostics on
failure states) was scoped at 4–6h and can't be exercised by judges via the public link.
<24h budget.

## Decision
Ship a minimal MV3 extension: content script on `*.liara.ir` injects a ✦ floating bubble;
clicking opens an iframe panel pointed at the deployed web app (URL from extension
options). No DOM parsing of the dashboard, no page-context extraction.

## Consequences
+ ~1h effort; visible "agent lives inside Liara" moment for the demo video.
+ All intelligence stays server-side in one place.
− No auto-triggered diagnostics (roadmap item).
