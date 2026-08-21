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

## Addendum (2026-08-21, later): full provider matrix

Verified live from this network:

| Provider | Endpoint | Role | Status |
|---|---|---|---|
| Vercel Gateway | ai-gateway.vercel.sh | product primary (glm-5.2 promo free thru 08-27, `eve/<ver>` UA required via gateway-loader.mjs); ~$5 credit for powerful budget models | promo pool 503 (upstream outage, community load); credit path untested |
| Liara AI | ai.liara.ir/api/{ws}/v1 | product fallback + embeddings (e5-large) | key pending from user |
| OpenRouter | openrouter.ai/api/v1 | tests: `:free` models; budget scenarios: `deepseek/deepseek-chat-v3.1` ($0.25/M) | ✅ works via HTTPS_PROXY=127.0.0.1:10808 (geo-blocked direct); free pool 429-limited upstream |
| OrcaRouter | api.orcarouter.ai/v1 | dev/scenario tests: `orcarouter/auto`, deepseek v4 (~$0.50 credit), key expires 09-20 | ✅ works direct, 196 models |

`agent/agent.ts` selects via `CHAT_PROVIDER` (+optional `CHAT_MODEL`) at module
load; gateway ids for vercel, OpenAI-compatible provider objects for the rest.

## Consequences
- If Iran DC cannot reach the Gateway outbound, deployed instance flips primary to
  ai.liara.ir by env only — no code change. Tested at deploy time.
- Cost: glm-5.2 ≈ free through judging window; Liara AI priced in Rial, trivial for
  fallback volume. Strong "runs on Liara" + cost-optimization narrative.
- Risk: Liara AI reliability/quality unverified for long agentic loops — mitigated by it
  being fallback-only for chat.
