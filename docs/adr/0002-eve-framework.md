# ADR-0002: Build on Eve (vercel/eve)

## Status
Accepted 2026-08-21

## Context
We need an agent loop with typed tools, skills, session memory, streaming to a web UI,
human-in-the-loop approvals, and deployability as a plain Node app on Liara — in <24h.
Options: raw Vercel AI SDK loop, Eve, LangGraph, Mastra.

## Decision
Use Eve. Filesystem-first (tools = TS files with zod schemas, skills = markdown loaded on
demand), native Next.js integration (`withEve()`, `useEveAgent()` same-origin — no CORS,
one deploy), built-in HITL prompts, evals, and bundled docs in node_modules/eve/docs.
Self-hostable: no managed-runtime dependency.

## Consequences
+ Fastest path to a durable agent with approvals; judges can read the agent as plain files.
+ Free glm-5.2 offer applies specifically to Eve agents (ADR-0001).
− Eve is beta; APIs may shift. Mitigation: pin exact version; read local docs before using
  advanced features (approvals, channel context); two-step approval fallback is designed
  in (ADR-0004) so a missing HITL web primitive does not block us.
