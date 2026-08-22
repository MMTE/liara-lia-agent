import { defineOpenAPIConnection } from "eve/connections";

import dbaasSpec from "../specs/dbaas.json";
import { liaraConnectionConfig } from "../lib/liara-auth";

/**
 * Liara DBaaS (managed databases) connection. Vendored spec
 * (liara-cloud/openapi@main, pinned by scripts/vendor-liara-specs.mjs).
 *
 * Full surface (ADR-0004 v2): list/inspect databases, power on/off,
 * resize, settings, control-panel & public-network toggles, backups
 * (create/list/download), events and all report types.
 */
export default defineOpenAPIConnection({
  spec: dbaasSpec,
  ...liaraConnectionConfig({
    baseUrl: process.env.LIARA_API_BASE,
    description:
      "Liara DBaaS (دیتابیس‌ها): managed MySQL/MariaDB/PostgreSQL/Redis — list/inspect, power on/off, resize (plan change), engine settings, control-panel & public network toggles, backups (create/list/download), events, CPU/memory/network/summary reports. Persian users call databases «دیتابیس». Mutations require user approval.",
  }),
});
