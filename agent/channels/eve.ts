import { eveChannel } from "eve/channels/eve";
import { localDev, none, type AuthFn } from "eve/channels/auth";
import { get as getSession } from "../../src/lib/session-store.js";

/**
 * Connected-account auth (ADR-0007 §1): the httpOnly `sid` cookie set by
 * POST /api/connect maps to a session-store record. A valid sid stamps a
 * `user` principal (principalId = sid) so connection auth resolves the
 * user's own Liara token. Everything else falls through: localDev() for the
 * eve TUI / localhost, none() so public judges can chat — those turns run
 * as anonymous/app principal and resolve DEMO_LIARA_TOKEN in the connections.
 */
const sidAuth: AuthFn<Request> = async (request) => {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)sid=([A-Za-z0-9_-]{16,})/);
  if (!match) return null;
  const session = getSession(match[1]);
  if (!session) return null;
  return {
    authenticator: "app",
    issuer: "liara-agent",
    principalId: match[1],
    principalType: "user",
    subject: match[1],
    attributes: { mode: session.mode },
  };
};

export default eveChannel({
  auth: [sidAuth, localDev(), none()],
});
