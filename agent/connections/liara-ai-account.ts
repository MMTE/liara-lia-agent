import { defineOpenAPIConnection } from "eve/connections";

import aiAccountSpec from "../specs/ai-account.json";
import { liaraConnectionConfig } from "../lib/liara-auth";

/**
 * Liara AI account connection — workspaces, API keys, logs, and the
 * playground, merged from four upstream specs (see
 * scripts/vendor-liara-specs.mjs). Same account JWT + team scope as the
 * platform services (verified live 2026-08-22).
 *
 * Playground ops (playgroundChatCompletion, playgroundImage*) let the
 * agent run inference under the account JWT when no AI API key is
 * configured; they take the workspaceID path parameter the model resolves
 * by listing workspaces first.
 */
export default defineOpenAPIConnection({
  spec: aiAccountSpec,
  ...liaraConnectionConfig({
    description:
      "Liara AI account (ورک‌اسپیس‌های هوش مصنوعی): workspaces (list/create/inspect/delete/soft-delete, resize=plan change, unfreeze, provider preferences, name availability), workspace activity & free-token usage, model limits per workspace, request logs (list + details), AI API keys (create/list/update/delete), and the playground (chat completions, image generation/edit, model list) — playground runs inference under the account token. Resolve workspace path parameters by listing workspaces first. Mutations require user approval.",
  }),
});
