# ADR-0007: Eve integration mechanics (spike findings)

## Status
Accepted 2026-08-21 (eve 0.42.0, docs from node_modules/eve/docs)

## Findings and decisions

### 1. Per-session Liara token → connection auth
- `agent/channels/eve.ts` (scaffolded by `eve init`) fails closed by default.
- Our channel auth: custom `AuthFn` that maps our httpOnly `sid` cookie →
  `{principalId: sid, principalType: "user", attributes: {mode}}`;
  anonymous requests fall through to `none()` (public demo) and connections
  resolve the `DEMO_LIARA_TOKEN` instead.
- Liara connections resolve tokens via `auth: { getToken: async ({ principal }) => ... }`
  reading `sessionStore.get(principal.id)` — the model never sees tokens.
- `POST /api/connect` validates a pasted token (`GET /v1/projects`), sets the `sid`
  cookie, stores `{sid → token}` in server memory (ADR-0005 unchanged).

### 2. Approvals — native; custom two-step gate dropped
- Write ops gated by connection `approval` policy keyed on qualified `toolName`:
  reads → `"not-applicable"`, writes (`restartApp`, `updateEnvs`, `releasesDeploy`)
  → `"user-approval"` (durable pause at `session.waiting`).
- Client renders `input.requested` from `dynamic-tool` parts
  (`part.toolMetadata?.eve?.inputRequest`) and answers via `agent.respond()`
  (`approve`/`cancel` options auto-resolve from follow-up text too).
- `ask_question` built-in tool gives clarifying questions with rendered options.
- ADR-0004 fallback protocol: NOT needed. Superseded by native HITL.

### 3. Liara tools — OpenAPI connections, not a hand-written client
- Two connections vendoring pinned specs from liara-cloud/openapi:
  `agent/connections/liara-paas.ts` (spec: inline paas.yaml,
  `baseUrl: https://api.iran.liara.ir`) and `liara-dbaas.ts`.
- `operations.allow` = curated reads + the three writes; tool names
  `liara-paas__getAppLogs` etc.
- Task 6's hand-written client shrinks to: connect-validation call + smoke tests.

### 4. Model provider — startup-selected
- `model` accepts gateway id or provider `LanguageModel`. We select at module load
  from `CHAT_PROVIDER`: `zai/glm-5.2` (gateway; UA rewritten by `gateway-loader.mjs`
  — promo requires UA exactly `eve/<version>`) or `createOpenAICompatible(
  ai.liara.ir).languageModel(...)`.
- No native per-request failover; acceptable: startup choice + `/api/health` probe.
- Session token budgets: `limits.maxInputTokensPerSession` /
  `maxOutputTokensPerSession` configured — native approve/stop continuation prompts
  (cost rubric).

### 5. Client (UI)
- `useEveAgent()` (eve/react): `data.messages` (parts incl. `dynamic-tool`),
  `status`, `send/respond/cancel`, `onEvent` (activity timeline + usage metering),
  resumable sessions via localStorage cursor.
- `clientContext` (per-turn, not persisted in history) carries mode + pinned app.

### 6. glm-5.2 promo operational notes (verified 2026-08-21)
- Key valid; promo requires the eve UA; verified via both raw curl and the real
  eve SDK path (`eve invoke` in the reference project).
- Free pool suffered a provider-side outage (503 "Service temporarily unavailable",
  baseten→alibaba routing) — community mass-use of the promo is the likely cause.
- Mitigation: `CHAT_PROVIDER` flip to Liara AI; probe script watches recovery.

## Consequences
- Plan Tasks 6–7 simplify substantially; UI uses native HITL rendering.
- Vendored OpenAPI specs must be JSON for inline import (convert YAML→JSON at
  vendor time, `scripts/vendor-liara-specs.mjs`).
- Connection approval policy lives in `agent/lib/liara-approval.ts`, shared by
  both connections.
