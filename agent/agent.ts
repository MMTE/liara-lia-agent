import { defineAgent } from "eve";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// Provider selection (ADR-0001): CHAT_PROVIDER=vercel|liara|openrouter|orca,
// optional CHAT_MODEL override. Gateway ids are strings; OpenAI-compatible
// providers get provider objects. Resolved once at module load.
function resolveModel(): string | LanguageModel {
  const provider = process.env.CHAT_PROVIDER ?? "vercel";
  const chatModel = process.env.CHAT_MODEL;

  switch (provider) {
    case "liara": {
      const liara = createOpenAICompatible({
        name: "liara-ai",
        baseURL: `https://ai.liara.ir/api/${process.env.LIARA_AI_WORKSPACE_ID}/v1`,
        apiKey: process.env.LIARA_AI_API_KEY,
      });
      return liara.chatModel(chatModel ?? process.env.LIARA_AI_CHAT_MODEL ?? "openai/gpt-4o-mini");
    }
    case "openrouter": {
      const or = createOpenAICompatible({
        name: "openrouter",
        baseURL: process.env.OPENROUTER_BASE ?? "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      return or.chatModel(chatModel ?? "deepseek/deepseek-chat-v3.1");
    }
    case "orca": {
      const orca = createOpenAICompatible({
        name: "orcarouter",
        baseURL: process.env.ORCAROUTER_BASE ?? "https://api.orcarouter.ai/v1",
        apiKey: process.env.ORCAROUTER_API_KEY,
      });
      return orca.chatModel(chatModel ?? "orcarouter/auto");
    }
    case "vercel":
    default:
      // glm-5.2 promo requires UA `eve/<version>` — gateway-loader.mjs rewrites it.
      return chatModel ?? "zai/glm-5.2";
  }
}

export default defineAgent({
  model: resolveModel(),
  // Provider-object models (liara/openrouter/orca) lack Gateway catalog
  // metadata; declare a conservative context window so compaction can plan.
  ...(process.env.CHAT_PROVIDER && process.env.CHAT_PROVIDER !== "vercel"
    ? { modelContextWindowTokens: 128_000 }
    : {}),
  limits: {
    // Cost guardrails (rubric): native approve/stop continuation prompts.
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 200_000,
  },
});
