import { defineOpenAPIConnection } from "eve/connections";

import storageSpec from "../specs/storage.json";
import { liaraConnectionConfig } from "../lib/liara-auth";

/**
 * Liara Object Storage service connection. Vendored spec
 * (liara-cloud/openapi@main, pinned by scripts/vendor-liara-specs.mjs).
 * Base from the spec's servers (https://storage-service.iran.liara.ir,
 * verified live 2026-08-22).
 *
 * Full surface: buckets (list/create/inspect/destroy, access policy,
 * upgrade, availability check, migrations), keys (create/list/update/
 * delete/revoke-secret), objects (list/upload/download/delete/stat —
 * upload/download return presigned URLs), folders, and metrics.
 */
export default defineOpenAPIConnection({
  spec: storageSpec,
  ...liaraConnectionConfig({
    description:
      "Liara Object Storage (باکت‌ها و فایل‌ها): S3-compatible buckets — list/create/destroy, access policy (public/private), plan upgrade, availability check, bucket-to-bucket migration; access/secret keys (create/update/delete/revoke); objects — list/stat/delete plus presigned upload/download URLs; folders; usage metrics. Persian users call buckets «باکت». Mutations require user approval.",
  }),
});
