import { defineOpenAPIConnection } from "eve/connections";

import mailSpec from "../specs/mail.json";
import { liaraConnectionConfig } from "../lib/liara-auth";

/**
 * Liara Mail service connection. Vendored spec (liara-cloud/openapi@main,
 * pinned by scripts/vendor-liara-specs.mjs). Base from the spec's servers
 * (https://mail-service.iran.liara.ir, verified live 2026-08-22).
 *
 * Full surface: mail servers (create/edit/delete/unfreeze, plan changes
 * and history, DNS status, domain availability, usage), SMTP credentials
 * (generate/revoke/delete/get), accounts, inbound rules, messages
 * (list/read HTML/trash/delete permanently, send, forward addresses,
 * attachments, events), and tags.
 */
export default defineOpenAPIConnection({
  spec: mailSpec,
  ...liaraConnectionConfig({
    description:
      "Liara Mail (میلسرورها): mail servers (create/edit/delete/unfreeze, plan change/history, DNS status check, per-day sent counts, recent usage), SMTP credentials, mail accounts, inbound rules, messages (list/read/send/trash/permanently delete, HTML body + temporary-access link), forwarding addresses, attachments, delivery events, and tags. Persian users call mail servers «میلسرور». Mutations require user approval.",
  }),
});
