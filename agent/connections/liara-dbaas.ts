import { defineOpenAPIConnection } from "eve/connections";

import dbaasSpec from "../specs/dbaas.json";
import { liaraApproval } from "../lib/liara-approval";
import { liaraConnectionAuth, liaraTeamScopeArgs } from "../lib/liara-auth";

/**
 * Liara DBaaS (managed databases) connection. Vendored spec
 * (liara-cloud/openapi@main, pinned by scripts/vendor-liara-specs.mjs).
 *
 * Read-only surface (ADR-0004): list databases and inspect one.
 * Create/delete/scale operations are deliberately not exposed.
 */
export default defineOpenAPIConnection({
  spec: dbaasSpec,
  baseUrl: process.env.LIARA_API_BASE,
  description:
    "Liara DBaaS managed databases: list the account's databases and inspect a single database's details. Read-only; provisioning and deletion are not exposed. Persian users call databases «دیتابیس».",
  auth: liaraConnectionAuth(),
  toolCall: { providedArguments: liaraTeamScopeArgs() },
  approval: liaraApproval,
  operations: {
    allow: ["getListDatabases", "getDatabase"],
  },
});
