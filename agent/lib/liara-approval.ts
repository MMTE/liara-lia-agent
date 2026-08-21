import type { ApprovalContext, ApprovalStatus } from "eve/tools";

/**
 * Liara operations that mutate state (ADR-0004: two-step approval gate,
 * now native eve HITL per ADR-0007 §2). Everything else is read-only and
 * runs without a prompt.
 */
export const WRITES = new Set(["restartApp", "updateEnvs", "releasesDeploy"]);
/**
 * Shared approval policy for both Liara connections: strip the connection
 * prefix (`liara-paas__restartApp` → `restartApp`); read operations return
 * "not-applicable" and run freely, the three write operations return
 * "user-approval" and pause the run at `session.waiting` until the user
 * decides (durable native HITL, ADR-0007 §2).
 */
export function liaraApproval(ctx: ApprovalContext): ApprovalStatus {
  const operation = ctx.toolName.replace(/^liara-(?:paas|dbaas)__/, "");
  return WRITES.has(operation) ? "user-approval" : "not-applicable";
}

