import { defineOpenAPIConnection } from "eve/connections";
import {
  liaraAiKeyAuth,
  liaraAiWorkspaceArg,
} from "../lib/liara-auth";
import { liaraApproval } from "../lib/liara-approval";

/**
 * Liara AI inference connection — OpenAI-compatible chat completions,
 * embeddings, text-to-speech, and image generation/edit, merged from four
 * upstream specs (see scripts/vendor-liara-specs.mjs).
 *
 * App-scoped: one workspace API key (LIARA_AI_API_KEY) and one workspace
 * path (LIARA_AI_WORKSPACE_ID), both env-provided and hidden from the
 * model. Without them calls fail as `not_connected` and the agent should
 * point to the playground tools (account JWT) instead.
 */
export default defineOpenAPIConnection({
  spec: aiInferenceSpec,
  description:
    "Liara AI inference (درخواست‌های هوش مصنوعی): OpenAI-compatible endpoints — chat completions (streaming/tool-calling/multi-modal), embeddings, text-to-speech, image generation and image edit, plus the per-workspace model list. Configured per deployment via LIARA_AI_API_KEY + LIARA_AI_WORKSPACE_ID; if unavailable say so and use the liara-ai-account playground tools instead. Generation calls require user approval (they consume workspace credit).",
  auth: liaraAiKeyAuth(),
  toolCall: { providedArguments: liaraAiWorkspaceArg() },
  approval: liaraApproval,
});
