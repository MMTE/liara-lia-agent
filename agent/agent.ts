import { defineAgent } from "eve";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { FallbackModel } from "./lib/model-chain";

// Provider routing (budget + resilience): an ordered fallback chain serves
// every call; a provider that errors (auth, quota, network, 5xx) is benched
// for 5 minutes and the next one takes over. Configure explicitly with
// CHAT_MODEL_CHAIN="provider:model,provider:model,…" — otherwise a default
// chain is derived from CHAT_PROVIDER/CHAT_MODEL and the keys present.
//
// Providers:
//   avalai   — api.avalai.ir (Iranian aggregator; default home)
//   liara    — ai.liara.ir/api/<LIARA_AI_WORKSPACE_ID>/v1 (Liara's own AI;
//              needs LIARA_AI_API_KEY + LIARA_AI_WORKSPACE_ID)
//   openrouter / openai — OpenAI-compatible endpoints via env base URLs
//   vercel / blackbox   — AI Gateway model ids (strings, no chain support)
const provider = process.env.CHAT_PROVIDER || "avalai";
const chatModel = process.env.CHAT_MODEL || undefined;

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** Model factories per provider; an entry without its env keys yields
 *  undefined and is skipped. `modelId` overrides the per-provider default
 *  (used by CHAT_MODEL_CHAIN entries like `avalai:deepseek-v4-pro`). */
const registry: Record<string, (modelId?: string) => LanguageModelV4 | undefined> = {
  avalai: (modelId) => {
    const key = env("AVALAI_API_KEY");
    if (!key) return undefined;
    const c = createOpenAICompatible({
      name: "avalai",
      baseURL: env("AVALAI_BASE_URL") ?? "https://api.avalai.ir/v1",
      apiKey: key,
    });
    return c.chatModel(modelId ?? chatModel ?? "deepseek-v4-flash");
  },
  liara: (modelId) => {
    const key = env("LIARA_AI_API_KEY");
    const ws = env("LIARA_AI_WORKSPACE_ID");
    if (!key || !ws) return undefined;
    const c = createOpenAICompatible({
      name: "liara-ai",
      baseURL: env("LIARA_AI_BASE_URL") ?? `https://ai.liara.ir/api/${ws}/v1`,
      apiKey: key,
    });
    return c.chatModel(modelId ?? chatModel ?? "openai/gpt-4.1-mini");
  },
  openrouter: (modelId) => {
    const key = env("OPENROUTER_API_KEY");
    if (!key) return undefined;
    const c = createOpenAICompatible({
      name: "openrouter",
      baseURL: env("OPENROUTER_BASE") ?? "https://openrouter.ai/api/v1",
      apiKey: key,
    });
    return c.chatModel(modelId ?? chatModel ?? "deepseek/deepseek-chat-v3.1");
  },
  openai: (modelId) => {
    const key = env("OPENAI_API_KEY");
    if (!key) return undefined;
    const c = createOpenAICompatible({
      name: "openai-compatible",
      baseURL: env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
      apiKey: key,
    });
    return c.chatModel(modelId ?? chatModel ?? "gpt-4o-mini");
  },
};

/** default chains per CHAT_PROVIDER — cheap first, stronger fallbacks */
function defaultChain(): string[] {
  switch (provider) {
    case "liara":
      return ["liara", "avalai"];
    case "openrouter":
      return ["openrouter", "avalai"];
    case "openai":
      return ["openai", "avalai"];
    case "avalai":
    default:
      // Budget-first: flash serves the load, pro/sol back it up, and Liara
      // AI is the independent last resort (separate provider + credits).
      return chatModel && chatModel !== "deepseek-v4-flash"
        ? ["avalai", "liara"]
        : ["avalai:deepseek-v4-flash", "avalai:deepseek-v4-pro", "avalai:gpt-5.6-sol", "liara"];
  }
}

function resolveChain(): string[] {
  const raw = env("CHAT_MODEL_CHAIN");
  if (raw) return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return defaultChain();
}

function resolveModel(): string | LanguageModelV4 {
  // Gateway providers stay plain ids (they carry catalog metadata that
  // provider objects lack). glm-5.2 promo needs UA `eve/<version>` — the
  // gateway-loader rewrites it.
  if (provider === "vercel" || provider === "blackbox") {
    return chatModel ?? "zai/glm-5.2";
  }

  const models: LanguageModelV4[] = [];
  const ids: string[] = [];
  for (const entry of resolveChain()) {
    const sep = entry.indexOf(":");
    const name = sep === -1 ? entry : entry.slice(0, sep);
    const modelOverride = sep === -1 ? undefined : entry.slice(sep + 1);
    const build = registry[name];
    if (!build) {
      console.warn(`[model-chain] unknown provider "${name}" in chain — skipped`);
      continue;
    }
    const model = build(modelOverride);
    if (model) {
      models.push(model);
      ids.push(entry);
    } else {
      console.warn(`[model-chain] ${name} unavailable (missing keys) — skipped`);
    }
  }
  if (models.length === 0) {
    throw new Error(
      `No usable model in chain (CHAT_PROVIDER=${provider}). Set CHAT_MODEL_CHAIN or provider keys.`
    );
  }
  console.log(`[model-chain] ${ids.join(" → ")}`);
  return models.length === 1
    ? models[0]!
    : new FallbackModel(models, { ids, log: (m) => console.log(m) });
}

export default defineAgent({
  model: resolveModel(),
  ...(provider === "blackbox"
    ? { modelOptions: { providerOptions: { gateway: { only: ["blackbox"] } } } }
    : {}),
  // Provider-object models lack Gateway catalog metadata; declare a
  // conservative context window so compaction can plan.
  ...(!["vercel", "blackbox"].includes(provider)
    ? { modelContextWindowTokens: 128_000 }
    : {}),
  limits: {
    // Cost guardrails (rubric): native approve/stop continuation prompts.
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 200_000,
  },
});
