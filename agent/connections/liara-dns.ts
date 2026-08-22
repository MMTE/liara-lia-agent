import { defineOpenAPIConnection } from "eve/connections";

import dnsSpec from "../specs/dns.json";
import { liaraConnectionConfig } from "../lib/liara-auth";

/**
 * Liara DNS service connection. Vendored spec (liara-cloud/openapi@main,
 * pinned by scripts/vendor-liara-specs.mjs). Base from the spec's own
 * servers (https://dns-service.iran.liara.ir, verified live 2026-08-22).
 *
 * Full surface: zones (list/create/get/delete, nameserver check) and
 * records (list/create/get/edit/delete). Record type is immutable on edit.
 */
export default defineOpenAPIConnection({
  spec: dnsSpec,
  ...liaraConnectionConfig({
    description:
      "Liara DNS (دامنه‌ها و رکوردها): zones (list/create/delete, nameserver health check) and DNS records inside a zone (list/create/get/edit/delete — type cannot change on edit; A/AAAA/CNAME/MX/TXT/NS/SRV/CAA…). Persian users call zones «زون/دامنه». Mutations require user approval.",
  }),
});
