import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePatches, verifyPatches } from "../scripts/sync-docs-site.mjs";

const REPO = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const sha = (s) => createHash("sha256").update(s).digest("hex");

const UPSTREAM_APP = "export default function App() {}\n";
const PATCHED_APP = "export default function App() { /* liri bridge embed */ }\n";
const NEW_FILE = "export const liriBridge = true;\n";

/** Full-style PATCHES.md: real patches followed by a numbered list in a later section. */
const fullMd = (appSha) => `# docs-site patches

## Patches

1. \`src/pages/_app.jsx\` — embed the Liri bridge widget (Task 8). \`upstream-sha256:${appSha}\`
2. \`src/lib/liri-bridge.js\` — new file, absent upstream. \`upstream-sha256:none\`

## Integration facts (2026-08-21)

1. Verified live: \`search/liara-endpoint\` needs no credentials.
2. Fonts self-hosted under \`static/fonts/yekan\`.
`;

const mdModified = (baseline) => `## Patches\n\n1. \`src/pages/_app.jsx\` — embed the widget. \`upstream-sha256:${baseline}\`\n`;
const mdNewFile = `## Patches\n\n1. \`src/lib/liri-bridge.js\` — new file. \`upstream-sha256:none\`\n`;
const mdNoBaseline = `## Patches\n\n1. \`src/pages/_app.jsx\` — embed the widget (baseline forgotten).\n`;

function makeTree(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "docs-sync-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(dir, rel);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, content);
  }
  return dir;
}

function testTree(name, files, verify) {
  test(name, (t) => {
    const dirs = Object.entries(files).map(([k, fs]) => [k, makeTree(fs)]);
    t.after(() => dirs.forEach(([, d]) => rmSync(d, { recursive: true, force: true })));
    verify(Object.fromEntries(dirs));
  });
}

// --- parsePatches ------------------------------------------------------------

test("parsePatches stops at the next heading — numbered items in later sections are not patches", () => {
  const entries = parsePatches(fullMd(sha(UPSTREAM_APP)));
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((e) => e.targets),
    [["src/pages/_app.jsx"], ["src/lib/liri-bridge.js"]],
  );
  const allTargets = entries.flatMap((e) => e.targets).join(" ");
  assert.ok(!allTargets.includes("search/liara-endpoint"));
  assert.ok(!allTargets.includes("static/fonts/yekan"));
});

test("parsePatches: hex baseline parses to the 64-char sha", () => {
  const [modified] = parsePatches(fullMd(sha(UPSTREAM_APP)));
  assert.equal(modified.baseline, sha(UPSTREAM_APP));
});

test("parsePatches: upstream-sha256:none sentinel parses as the new-file baseline", () => {
  const [, newFile] = parsePatches(fullMd(sha(UPSTREAM_APP)));
  assert.equal(newFile.baseline, "none");
});

test("parsePatches: entry without a baseline span parses to baseline null", () => {
  const [entry] = parsePatches(mdNoBaseline);
  assert.equal(entry.baseline, null);
  assert.deepEqual(entry.targets, ["src/pages/_app.jsx"]);
});

test("parsePatches: shipped docs-site/PATCHES.md parses to the shipped Lia patches", () => {
  const entries = parsePatches(readFileSync(path.join(REPO, "docs-site", "PATCHES.md"), "utf8"));
  assert.deepEqual(entries.map((e) => e.targets), [
    ["src/pages/_app.js"],
    ["src/components/AskLia.jsx"],
  ]);
  assert.match(entries[0].baseline ?? "", /^[0-9a-f]{64}$/); // modified upstream file
  assert.equal(entries[1].baseline, "none"); // patch-added file
});

// --- verifyPatches: modified-file patches -------------------------------------

testTree(
  "verifyPatches: modified target kept (local differs from upstream) → ok",
  { local: { "src/pages/_app.jsx": PATCHED_APP }, upstream: { "src/pages/_app.jsx": UPSTREAM_APP } },
  ({ local, upstream }) => {
    assert.deepEqual(verifyPatches({ localDir: local, upstreamDir: upstream, patches: parsePatches(mdModified(sha(UPSTREAM_APP))) }), []);
  },
);

testTree(
  "verifyPatches: modified target reverted to upstream content by the sync → fails",
  { local: { "src/pages/_app.jsx": UPSTREAM_APP }, upstream: { "src/pages/_app.jsx": UPSTREAM_APP } },
  ({ local, upstream }) => {
    const failures = verifyPatches({ localDir: local, upstreamDir: upstream, patches: parsePatches(mdModified(sha(UPSTREAM_APP))) });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /src\/pages\/_app\.jsx.*reverted to pristine upstream content/s);
  },
);

testTree(
  "verifyPatches: modified target upstream-deleted → fails",
  { local: { "src/pages/_app.jsx": PATCHED_APP }, upstream: {} },
  ({ local, upstream }) => {
    const failures = verifyPatches({ localDir: local, upstreamDir: upstream, patches: parsePatches(mdModified(sha(UPSTREAM_APP))) });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /src\/pages\/_app\.jsx.*no longer exists upstream/s);
  },
);

// --- verifyPatches: new-file patches (upstream-sha256:none) -------------------

testTree(
  "verifyPatches: new-file patch kept (file exists locally, absent upstream) → ok",
  { local: { "src/lib/liri-bridge.js": NEW_FILE }, upstream: {} },
  ({ local, upstream }) => {
    assert.deepEqual(verifyPatches({ localDir: local, upstreamDir: upstream, patches: parsePatches(mdNewFile) }), []);
  },
);

testTree(
  "verifyPatches: upstream later adds the new-file target → fails",
  { local: { "src/lib/liri-bridge.js": NEW_FILE }, upstream: { "src/lib/liri-bridge.js": NEW_FILE } },
  ({ local, upstream }) => {
    const failures = verifyPatches({ localDir: local, upstreamDir: upstream, patches: parsePatches(mdNewFile) });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /src\/lib\/liri-bridge\.js.*now also exists upstream/s);
  },
);

testTree(
  "verifyPatches: new-file target deleted from docs-site/ by the sync → fails",
  { local: {}, upstream: {} },
  ({ local, upstream }) => {
    const failures = verifyPatches({ localDir: local, upstreamDir: upstream, patches: parsePatches(mdNewFile) });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /src\/lib\/liri-bridge\.js.*no longer exists in docs-site\//s);
  },
);

// --- verifyPatches: broken entries --------------------------------------------

testTree(
  "verifyPatches: missing baseline → clean failure naming the entry",
  { local: { "src/pages/_app.jsx": PATCHED_APP }, upstream: { "src/pages/_app.jsx": UPSTREAM_APP } },
  ({ local, upstream }) => {
    const failures = verifyPatches({ localDir: local, upstreamDir: upstream, patches: parsePatches(mdNoBaseline) });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /no baseline recorded.*upstream-sha256/s);
  },
);

// --- module safety ------------------------------------------------------------

test("importing the module never runs main() (no clone/sync on import)", () => {
  // PATH without git/rsync: if the direct-invocation guard regressed, main()
  // would try to exec git and this child would die non-zero.
  const res = spawnSync(
    process.execPath,
    ["-e", "import('./scripts/sync-docs-site.mjs').then((m) => console.log(typeof m.parsePatches, typeof m.verifyPatches))"],
    { cwd: REPO, encoding: "utf8", env: { ...process.env, PATH: "/nonexistent" } },
  );
  assert.equal(res.status, 0, `stderr: ${res.stderr}`);
  assert.match(res.stdout, /^function function/);
});
