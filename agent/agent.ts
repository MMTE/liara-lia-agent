import { defineAgent } from "eve";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// Provider selection: CHAT_PROVIDER=vercel|blackbox|liara|openrouter|openai,
// optional CHAT_MODEL override. Gateway ids are strings; OpenAI-compatible
// providers get provider objects. Resolved once at module load.
const provider = process.env.CHAT_PROVIDER || "vercel";
const chatModel = process.env.CHAT_MODEL || undefined;

function resolveModel(): string | LanguageModel {
  switch (provider) {
    case "blackbox":
      return chatModel ?? "zai/glm-5.2";
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
    case "openai": {
      const openai = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
        apiKey: process.env.OPENAI_API_KEY,
      });
      return openai.chatModel(chatModel ?? "gpt-4o-mini");
    }
    case "vercel":
    default:
      // glm-5.2 promo requires UA `eve/<version>` — gateway-loader.mjs rewrites it.
      return chatModel ?? "zai/glm-5.2";
  }
}

export default defineAgent({
  model: resolveModel(),
  ...(provider === "blackbox"
    ? { modelOptions: { providerOptions: { gateway: { only: ["blackbox"] } } } }
    : {}),
  // Provider-object models lack Gateway catalog
  // metadata; declare a conservative context window so compaction can plan.
  ...(!["vercel", "blackbox"].includes(provider)
    ? { modelContextWindowTokens: 128_000 }
    : {}),
  limits: {
    // Cost guardrails (rubric): native approve/stop continuation prompts.
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 200_000,
  },
});
