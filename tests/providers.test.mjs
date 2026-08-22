import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function inspectProvider(env) {
  const script = `
    const { default: agent } = await import('./agent/agent.ts?test=' + Math.random());
    const model = agent.model;
    console.log(JSON.stringify({
      model: typeof model === 'string' ? model : model.modelId,
      provider: typeof model === 'string' ? undefined : model.provider,
      url: typeof model === 'string' ? undefined : model.config.url({ path: '/chat/completions' }),
      modelOptions: agent.modelOptions,
    }));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    // Drop ambient provider config from .env so chain resolution depends
    // only on what the individual test sets (a stray AVALAI_API_KEY would
    // turn the single-model openai chain into a FallbackModel without
    // .config; CHAT_MODEL_CHAIN would override the chain under test).
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([k]) => !/^(AVALAI|LIARA_AI|OPENROUTER|OPENAI|AI_GATEWAY)_API_KEY$|^CHAT_MODEL_CHAIN$/.test(k),
        ),
      ),
      ...env,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("blackbox pins the Eve GLM-5.2 Gateway offer", () => {
  const config = inspectProvider({ CHAT_PROVIDER: "blackbox", CHAT_MODEL: "" });

  assert.equal(config.model, "zai/glm-5.2");
  assert.deepEqual(config.modelOptions.providerOptions.gateway.only, ["blackbox"]);
});

test("openai accepts any OpenAI-compatible endpoint and model", () => {
  const config = inspectProvider({
    CHAT_PROVIDER: "openai",
    CHAT_MODEL: "vendor/model",
    OPENAI_API_KEY: "test-key",
    OPENAI_BASE_URL: "https://example.test/v1",
  });

  assert.equal(config.model, "vendor/model");
  assert.equal(config.provider, "openai-compatible.chat");
  assert.equal(config.url, "https://example.test/v1/chat/completions");
});
