import type { ApprovalContext, ApprovalStatus } from "eve/tools";
import ops from "../specs/ops.json" with { type: "json" };

/**
 * Method-based approval gate (ADR-0004 v2: full API surface).
 *
 * Every Liara connection shares this policy. Classification comes from the
 * vendored operations manifest (scripts/vendor-liara-specs.mjs → ops.json),
 * keyed by service (parsed from the qualified tool name) + operationId:
 *
 *   GET              → not-applicable (runs without a prompt)
 *   everything else  → user-approval (native HITL pause; the model must
 *                      have stated the intended change first)
 *
 * Delete/irreversible-class operations get the same native gate — severity
 * is enforced by instructions (agent must name the resource + warn it is
 * irreversible before calling), not by a second mechanism.
 */
export function liaraApproval(ctx: ApprovalContext): ApprovalStatus {
  const sep = ctx.toolName.indexOf("__");
  if (sep === -1) return "not-applicable";
  const service = ctx.toolName.slice(0, sep).replace(/^liara-/, "");
  const operation = ctx.toolName.slice(sep + 2);
  const entry = (ops as Record<string, Record<string, { method: string }>>)[service]?.[operation];
  if (!entry) return "not-applicable"; // unknown op → nothing to gate
  return entry.method === "GET" ? "not-applicable" : "user-approval";
}

/** Operations that destroy or irreversibly change state — surfaced to the
 * instructions layer so the agent words its pre-approval summary as a
 * destruction warning. Derived from ops.json at module load (static,
 * string-keyed → Record, not Set). */
export const DESTRUCTIVE: Readonly<Record<string, true>> = Object.fromEntries(
  Object.entries(ops as Record<string, Record<string, { method: string; path: string }>>).flatMap(
    ([service, operations]) =>
      Object.entries(operations)
        .filter(([, op]) => op.method === "DELETE" || /\b(unfreeze|resetVMPassword)\b/.test(op.path))
        .map(([operation]) => [`liara-${service}__${operation}`, true as const]),
  ),
);
