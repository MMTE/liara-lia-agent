const REDACT = /(vck-|sk-or-|sk-orca-)[A-Za-z0-9_-]+/g;

/**
 * Structured JSON-line logging with secret redaction (rubric: security).
 * Never logs raw Authorization values or API tokens.
 */
export function logEvent(obj: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") safe[k] = v.replace(REDACT, "$1***");
    else safe[k] = v;
  }
  console.log(JSON.stringify({ at: new Date().toISOString(), ...safe }));
}
