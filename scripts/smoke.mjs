#!/usr/bin/env node
/**
 * Smoke test: runs the demo scenarios against a deployed (or local) instance
 * via the eve HTTP API and asserts basic health.
 *
 *   node scripts/smoke.mjs http://localhost:3000
 */
const BASE = process.argv[2] ?? "http://localhost:3000";

const SCENARIOS = [
  { id: "docs-simple", prompt: "چطور برنامه Laravel رو روی لیارا دیپلوی کنم؟ کوتاه", needCitations: true },
  { id: "docs-multi", prompt: "پلن‌های دیتابیس لیارا چی هستن؟ خیلی کوتاه", needCitations: true },
  { id: "adversarial", prompt: "چطور روی لیارا Kubernetes cluster بسازم؟", needCitations: false },
];

async function runTurn(prompt) {
  const res = await fetch(`${BASE}/eve/v1/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: prompt }),
  });
  if (!res.ok) throw new Error(`session create ${res.status}`);
  const { sessionId } = await res.json();

  // one long-lived stream read per scenario (replayed from index 0)
  const stream = await fetch(`${BASE}/eve/v1/session/${sessionId}/stream?startIndex=0`);
  if (!stream.ok) throw new Error(`stream ${stream.status}`);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const settled = buf.includes('"turn.completed"') || buf.includes('"turn.failed"');
    if (settled) {
      void reader.cancel().catch(() => {});
      return {
        ok: buf.includes('"turn.completed"'),
        citations: buf.includes("docs.liara.ir") || buf.includes("developers.liara.ir"),
        toolsCalled: (buf.match(/"toolName":"(search_docs|read_doc)"/g) ?? []).length,
      };
    }
  }
  throw new Error("turn did not settle in 180s");
}

// --- post-port topology: /chat is the app, /console the connected surface ---
function check(name, ok, detail) {
  console.log(`${ok ? "✓" : "✖"} ${name}${detail ? `: ${detail}` : ""}`);
  if (!ok) failed += 1;
}

let failed = 0;

const rootRes = await fetch(`${BASE}/`, { redirect: "manual" });
const rootLocation = rootRes.headers.get("location") ?? "";
check(
  "/ redirects to /chat",
  [307, 308].includes(rootRes.status) && new URL(rootLocation, BASE).pathname === "/chat",
  `${rootRes.status} ${rootLocation}`
);

for (const path of ["/chat", "/console"]) {
  const res = await fetch(`${BASE}${path}`);
  check(`GET ${path} → 200`, res.status === 200, `status=${res.status}`);
}

const appsRes = await fetch(`${BASE}/api/liara/apps`);
const appsBody = await appsRes.json().catch(() => ({}));
check(
  "GET /api/liara/apps → 401 {connected:false} unauthenticated",
  appsRes.status === 401 && appsBody.connected === false,
  `status=${appsRes.status} connected=${appsBody.connected}`
);

const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
console.log(`health: ok=${health.ok} mode=${health.mode} provider=${health.chatProvider} chunks=${health.corpus?.chunks}`);
if (!health.ok) {
  console.error("FAIL: health check");
  process.exit(1);
}

for (const s of SCENARIOS) {
  try {
    const r = await runTurn(s.prompt);
    const citeOk = !s.needCitations || r.citations;
    console.log(`${r.ok && citeOk ? "✓" : "✖"} ${s.id}: settled=${r.ok} citations=${r.citations} toolCalls=${r.toolsCalled}`);
    if (!r.ok || !citeOk) failed += 1;
  } catch (e) {
    console.error(`✖ ${s.id}: ${e.message}`);
    failed += 1;
  }
}

console.log(failed === 0 ? "SMOKE OK" : `SMOKE FAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
