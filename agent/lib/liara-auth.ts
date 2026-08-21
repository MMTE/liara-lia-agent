import type {
  ConnectionAuthDefinition,
  ConnectionPrincipal,
  TokenResult,
} from "eve/connections";
import { getForPrincipal } from "../../src/lib/session-store.js";

/**
 * Shared auth for both Liara connections (ADR-0007 §1).
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
