import { defineOpenAPIConnection } from "eve/connections";

import iaasSpec from "../specs/iaas.json";
import { liaraConnectionConfig } from "../lib/liara-auth";

/**
 * Liara IaaS (virtual machines) connection. Vendored spec
 * (liara-cloud/openapi@main — spec/Iaas.yaml, pinned by
 * scripts/vendor-liara-specs.mjs). Base from the spec's servers
 * (https://iaas-api.liara.ir, verified live 2026-08-22).
 *
 * Full surface: VMs (list/create/inspect/delete/unfreeze, power,
 * resize, traffic graph/volume, operations), per-VM disks
 * (create/extend/delete/inspect), plans and OS catalog, password reset,
 * network reset.
 */
export default defineOpenAPIConnection({
  spec: iaasSpec,
  ...liaraConnectionConfig({
    description:
      "Liara IaaS (سرورهای ابری): virtual machines — list/create/inspect/delete/unfreeze, power on/off, resize, traffic graphs/volumes, operation history; per-VM disks (create/extend/delete); plan & operating-system catalogs; password/network reset. Persian users call VMs «سرور». Mutations require user approval; delete/reset are destructive.",
  }),
});
