import type {
  ConnectionAuthDefinition,
  ConnectionPrincipal,
  ProvidedArgumentContext,
  TokenResult,
} from "eve/connections";
import { getForPrincipal } from "../../src/lib/session-store.js";
import { liaraApproval } from "./liara-approval";

/**
 * Shared auth for every Liara account connection (ADR-0007 §1).
 *
 * Token chain, resolved per tool invocation — the model never sees tokens:
 *   1. connected session: `principal` (eve projects the caller as
 *      `{type: "user", id: sid}`) → session-store → user-pasted token;
 *   2. demo: `DEMO_LIARA_TOKEN` env;
 *   3. otherwise throw `"not_connected"` → tool result is an error.
 */
async function getToken({ principal }: {
  readonly principal: ConnectionPrincipal;
}): Promise<TokenResult> {
  const session = getForPrincipal(principal);
  if (session?.token) return { token: session.token };

  const demoToken = process.env.DEMO_LIARA_TOKEN;
  if (demoToken) return { token: demoToken };

  throw new Error("not_connected");
}

/**
 * Per-turn auth provider for `defineOpenAPIConnection`.
 *
 * `principalType` must follow the caller: eve fails fast with
 * `principal_required` on user-scoped connections whenever the session has
 * no authenticated user — which would make the demo-token fallback
 * unreachable for anonymous/demo and `localDev` turns. So user callers get
 * a user-scoped provider (token cache keyed `user:<sid>`, never shared
 * across callers), everyone else gets an app-scoped provider that resolves
 * the demo token.
 */
export function liaraConnectionAuth(): ConnectionAuthDefinition {
  return (ctx) =>
    ctx.session.auth.current?.principalType === "user"
      ? { principalType: "user", getToken }
      : { principalType: "app", getToken };
}

/**
 * Team scope for demo/app-principal calls (see scripts/vendor-liara-specs.mjs):
 * the platform API needs ?teamID= for tokens that are not team-bound
 * server-side — the built-in demo token is personal-scope, so without the
 * param it sees an empty account. Connected-user sessions carry their own
 * scope server-side and get no param (`undefined` omits the query).
 */
export function liaraTeamScopeArgs() {
  return {
    // null (not undefined) satisfies JsonValue; the runtime skips the query
    // parameter for nullish provided values either way.
    teamID: (ctx: ProvidedArgumentContext): string | null =>
      ctx.session.auth.current?.principalType === "user" || !process.env.LIARA_TEAM_ID
        ? null
        : process.env.LIARA_TEAM_ID,
  };
}

/**
 * App-scoped auth for the Liara AI inference connection: one workspace API
 * key from env (the account connections above stay per-user/demo). Fails
 * with `not_connected` when the key is missing so the model can tell the
 * user which env to set.
 */
export function liaraAiKeyAuth(): ConnectionAuthDefinition {
  return {
    principalType: "app",
    getToken: async (): Promise<TokenResult> => {
      const key = process.env.LIARA_AI_API_KEY;
      if (key) return { token: key };
      throw new Error("not_connected");
    },
  };
}

/** Workspace ID for the AI inference path parameter — deployment config,
 * never a model decision. Null when unset (call fails auth first). */
export function liaraAiWorkspaceArg() {
  return {
    workspaceID: (): string | null => process.env.LIARA_AI_WORKSPACE_ID ?? null,
  };
}

/**
 * Config factory shared by every Liara OpenAPI connection (ADR-0004 v2):
 * one place for auth, approval, and team-scope wiring. Per-service files
 * carry only spec + description (+ optional env baseUrl override).
 */
export function liaraConnectionConfig(options: {
  readonly description: string;
  readonly baseUrl?: string;
  readonly auth?: ConnectionAuthDefinition;
  readonly providedArguments?: ReturnType<typeof liaraTeamScopeArgs>;
}) {
  return {
    description: options.description,
    baseUrl: options.baseUrl,
    auth: options.auth ?? liaraConnectionAuth(),
    toolCall: { providedArguments: options.providedArguments ?? liaraTeamScopeArgs() },
    approval: liaraApproval,
  };
}
