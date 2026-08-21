# ADR-0001: Chat/embedding provider chain

## Status
Accepted 2026-08-21

## Context
Deadline 2026-08-22. Need a chat model reachable from both dev (outside Iran) and the
deployed app (Liara, likely Iran DC). Liara runs its own OpenAI-compatible AI service
(ai.liara.ir) with gpt-4.1/gpt-4o-mini/gemini/deepseek/qwen and multilingual embeddings.
Vercel offers zai/glm-5.2 free for Eve agents through 2026-08-27 via AI Gateway. Judges
may test after Aug 27 (then glm-5.2 is paid, not gone).

## Decision
Primary chat: `zai/glm-5.2` via Vercel AI Gateway (free window). Secondary/fallback:
ai.liara.ir (OpenAI-compatible; provider order env-configurable `CHAT_PROVIDER`).
Embeddings: always Liara AI `intfloat/multilingual-e5-large` (best Persian fit; index is
model-bound — switching chat providers never invalidates it).

## Consequences
- If Iran DC cannot reach the Gateway outbound, deployed instance flips primary to
  ai.liara.ir by env only — no code change. Tested at deploy time.
- Cost: glm-5.2 ≈ free through judging window; Liara AI priced in Rial, trivial for
  fallback volume. Strong "runs on Liara" + cost-optimization narrative.
- Risk: Liara AI reliability/quality unverified for long agentic loops — mitigated by it
  being fallback-only for chat.
