import assert from "node:assert/strict";
import { test } from "node:test";
import { liaraApproval } from "../agent/lib/liara-approval.ts";
import { LIA_COMMANDS, matchCommands, resolveCommandPrompt } from "../src/lib/lia-commands.ts";
import ops from "../agent/specs/ops.json" with { type: "json" };

test("command registry covers the nine services", () => {
  const names = LIA_COMMANDS.map((c) => c.command);
  for (const required of ["apps", "app", "logs", "dbs", "zones", "buckets", "vms", "mailservers", "ai", "usage", "help"]) {
    assert.ok(names.includes(required), `missing /${required}`);
  }
});

test("resolveCommandPrompt expands known commands and passes text through", () => {
  const p = resolveCommandPrompt("/logs my-app");
  assert.ok(p && p.includes("my-app") && p.includes("لاگ"), `expanded: ${p}`);
  // no leading slash → verbatim
  assert.equal(resolveCommandPrompt("سلام"), null);
  // unknown command → verbatim path (agent answers naturally)
  assert.equal(resolveCommandPrompt("/definitely-not-a-command"), null);
  // args interpolate
  assert.ok(resolveCommandPrompt("/app blog")?.includes("blog"));
});

test("matchCommands filters by prefix only before the first space", () => {
  assert.deepEqual(matchCommands("سلام"), []);
  assert.ok(matchCommands("/").length > 5);
  assert.deepEqual(matchCommands("/a").map((c) => c.command).sort(), ["ai", "app", "apps"]);
  // once args start, the palette closes
  assert.deepEqual(matchCommands("/logs x"), []);
});

// ── approval gate (mirrors agent/lib/liara-approval.ts logic over ops.json) ──

const manifest = ops;

test("ops manifest covers nine services with method classification", () => {
  assert.deepEqual(Object.keys(manifest).sort(),
    ["ai-account", "ai-inference", "ai-models", "dbaas", "dns", "iaas", "mail", "paas", "storage"]);
  for (const [service, operations] of Object.entries(manifest)) {
    assert.ok(Object.keys(operations).length > 0, `${service} empty`);
    for (const [op, entry] of Object.entries(operations)) {
      assert.match(entry.method, /^(GET|POST|PUT|PATCH|DELETE)$/, `${service}__${op} bad method`);
      assert.ok(entry.path.startsWith("/"), `${service}__${op} bad path`);
    }
  }
});

test("approval policy: GET free, mutations gated, unknown ops free", () => {
  const policy = (toolName) => liaraApproval({ toolName });
  assert.equal(policy("liara-paas__getApps"), "not-applicable");
  assert.equal(policy("liara-paas__restartApp"), "user-approval");
  assert.equal(policy("liara-paas__deleteAppByName"), "user-approval");
  assert.equal(policy("liara-dns__createDnsRecord"), "user-approval");
  assert.equal(policy("liara-storage__destroyBucket"), "user-approval");
  assert.equal(policy("liara-iaas__deleteVM"), "user-approval");
  assert.equal(policy("liara-ai-account__playgroundChatCompletion"), "user-approval");
  assert.equal(policy("liara-ai-models__listModels"), "not-applicable");
  assert.equal(policy("liara-paas__nope"), "not-applicable");
  assert.equal(policy("search_docs"), "not-applicable");
});

test("connection names align with manifest service keys", () => {
  // eve derives the connection name from the file name; every spec file
  // must map 1:1 to a manifest service or the gate silently no-ops.
  const expected = {
    "liara-paas": "paas",
    "liara-dbaas": "dbaas",
    "liara-dns": "dns",
    "liara-storage": "storage",
    "liara-mail": "mail",
    "liara-iaas": "iaas",
    "liara-ai-account": "ai-account",
    "liara-ai-inference": "ai-inference",
    "liara-ai-models": "ai-models",
  };
  for (const [conn, service] of Object.entries(expected)) {
    assert.ok(manifest[service], `${conn} → missing manifest service ${service}`);
  }
});
