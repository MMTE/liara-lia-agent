/**
 * Minimal Liara platform API client (connect-validation only, ADR-0007 §3).
 *
 * Everything the agent does at runtime goes through the eve OpenAPI
 * connections; this client exists to validate a pasted token during
 * `/api/connect` (GET /v1/projects) before a session is created.
 */

export class LiaraError extends Error {
  /**
   * @param {string} message
   * @param {{status?: number, cause?: unknown}} [options]
   */
  constructor(message, options = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "LiaraError";
    this.status = options.status;
  }
}

const DEFAULT_BASE = "https://api.iran.liara.ir";

/**
 * Validate a Liara API token by listing projects with it.
 *
 * @param {string} token
 * @returns {Promise<{ok: true, apps: number} | {ok: false, status: number}>}
 *   200 → `{ok: true, apps}` (apps = number of projects); other HTTP
 *   statuses → `{ok: false, status}`; transport failures throw LiaraError.
 */
export async function validateToken(token) {
  const base = process.env.LIARA_API_BASE || DEFAULT_BASE;
  let response;
  try {
    response = await fetch(`${base}/v1/projects`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch (cause) {
    throw new LiaraError(`Liara API unreachable at ${base}`, { cause });
  }

  if (response.status === 200) {
    let apps = 0;
    try {
      const body = await response.json();
      apps = Array.isArray(body?.projects) ? body.projects.length : 0;
    } catch {
      // Non-JSON body: token is valid (200); count unknown.
    }
    return { ok: true, apps };
  }
  return { ok: false, status: response.status };
}
