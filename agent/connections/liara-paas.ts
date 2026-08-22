import { defineOpenAPIConnection } from "eve/connections";

import paasSpec from "../specs/paas.json";
import { liaraApproval } from "../lib/liara-approval";
import { liaraConnectionAuth, liaraTeamScopeArgs } from "../lib/liara-auth";

/**
 * Liara PaaS (application hosting) connection. Vendored spec
 * (liara-cloud/openapi@main, pinned by scripts/vendor-liara-specs.mjs).
 *
 * Curated surface (ADR-0004): app inspection reads + logs/events/releases/
 * metrics, and exactly three write operations — restartApp, updateEnvs,
 * releasesDeploy — which `liaraApproval` gates behind native user approval.
 * Delete-class operations are never exposed.
 */
export default defineOpenAPIConnection({
  spec: paasSpec,
  baseUrl: process.env.LIARA_API_BASE,
  description:
    "Liara PaaS: list and inspect apps, read logs, events, releases, and CPU/memory/summary metrics, update environment variables, redeploy from a release, and restart an app. Mutating calls (restart, env update, deploy) require user approval. Persian users call apps «برنامه».",
  auth: liaraConnectionAuth(),
  toolCall: { providedArguments: liaraTeamScopeArgs() },
  operations: {
    allow: [
      "getApps",
      "getAppByName",
      "getAppLogs",
      "getAppEvents",
      "getAppReleases",
      "getAppCpuReports",
      "getAppMemoryReports",
      "getAppSummaryReports",
      "restartApp",
      "updateEnvs",
      "releasesDeploy",
    ],
  },
});
