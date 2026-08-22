import { defineOpenAPIConnection } from "eve/connections";

import paasSpec from "../specs/paas.json";
import { liaraConnectionConfig } from "../lib/liara-auth";

/**
 * Liara PaaS (application hosting) connection. Vendored spec
 * (liara-cloud/openapi@main, pinned by scripts/vendor-liara-specs.mjs).
 *
 * Full surface (ADR-0004 v2): every operation is exposed — apps, deploys,
 * domains+SSL, disks, FTPs, backups, reports, settings. All reads run
 * freely; every non-GET pauses for native user approval
 * (agent/lib/liara-approval.ts).
 */
export default defineOpenAPIConnection({
  spec: paasSpec,
  ...liaraConnectionConfig({
    baseUrl: process.env.LIARA_API_BASE,
    description:
      "Liara PaaS (اپ‌ها): full app lifecycle — list/inspect apps, logs, events, releases, metrics; create/delete/turn/restart apps; deploy from sources or releases; manage domains (create, set, redirect, SSL on/off), disks (create/resize/backups/FTPs), and per-app settings (envs, plan, subdomain, static IP, read-only, zero-downtime). Persian users call apps «برنامه». Mutations require user approval.",
  }),
});
