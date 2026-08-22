import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

async function waitFor(url, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`timed out waiting for ${url}`);
}

test("production start keeps Next and the Eve sidecar running together", async (t) => {
  const child = spawn(process.execPath, ["scripts/start.mjs"], {
    cwd: ROOT,
    detached: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "4310",
      EVE_NEXT_PRODUCTION_PORT: "4311",
      CHAT_PROVIDER: "avalai",
    },
    stdio: "ignore",
  });
  t.after(() => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  });

  await Promise.all([
    waitFor("http://127.0.0.1:4310/api/health"),
    waitFor("http://127.0.0.1:4311/eve/v1/health"),
  ]);

  assert.equal(child.exitCode, null);
});
