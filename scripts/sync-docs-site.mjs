#!/usr/bin/env node
/**
 * Sync docs-site/ from the upstream liara-cloud/docs fork (ADR-0008).
 *
 *   node scripts/sync-docs-site.mjs
 *
 * 1. Shallow-clone upstream HEAD into a temp dir.
 * 2. Verify patches (BEFORE touching docs-site/): every patch listed in
 *    docs-site/PATCHES.md records the sha256 of its target file in pristine
 *    upstream at patch time (`upstream-sha256:<hex>`). If upstream has since
 *    changed (or deleted) that file, the patch may no longer apply: list the
 *    offending entries and exit 1 without syncing.
 * 3. rsync the clone over docs-site/ with --delete, preserving local-only
 *    state: node_modules/, .next/, out/, PATCHES.md (and never copying .git).
 * 4. On success, update the "Synced commit:" SHA line in PATCHES.md.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const UPSTREAM_URL = "https://github.com/liara-cloud/docs";
const DOCS_DIR = path.join(ROOT, "docs-site");
const PATCHES_MD = path.join(DOCS_DIR, "PATCHES.md");

const RSYNC_EXCLUDES = [".git", "node_modules", ".next", "out", "PATCHES.md"].flatMap((e) => ["--exclude", e]);

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: "inherit", ...opts });
}

function out(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Parse `## Patches` entries: [{ targets: [paths], baseline: "<hex>" | null, raw }] */
function parsePatches(md) {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^##\s+Patches\s*$/.test(l));
  if (start === -1) return [];
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#\s/.test(line)) break; // next section
    const m = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (!m) continue;
    const spans = [...m[1].matchAll(/`([^`]+)`/g)].map((s) => s[1]);
    const baseline = /^upstream-sha256:([0-9a-f]{64})$/.exec(spans.find((s) => s.startsWith("upstream-sha256:")) || "")?.[1] ?? null;
    const targets = spans.filter((s) => !s.startsWith("upstream-sha256:") && s.includes("/"));
    entries.push({ targets, baseline, raw: m[1].trim() });
  }
  return entries;
}

// --- main -------------------------------------------------------------------

if (!existsSync(DOCS_DIR) || !existsSync(PATCHES_MD)) {
  console.error(`[sync-docs-site] missing ${PATCHES_MD} — vendor docs-site/ first (see ADR-0008, Task 4).`);
  process.exit(1);
}

const patchesMd = readFileSync(PATCHES_MD, "utf8");
const oldShaLine = /^-\s*Synced commit:\s*`([0-9a-f]+)`/m.exec(patchesMd);
const oldSha = oldShaLine?.[1] ?? "(unrecorded)";

const tmp = mkdtempSync(path.join(tmpdir(), "liara-docs-sync-"));
try {
  console.log(`[sync-docs-site] cloning ${UPSTREAM_URL} (depth 1)…`);
  run("git", ["clone", "--depth", "1", UPSTREAM_URL, tmp]);

  const newSha = out("git", ["-C", tmp, "rev-parse", "HEAD"]);
  console.log(`[sync-docs-site] upstream HEAD: ${newSha} (was ${oldSha})`);

  // Verify patches against the pristine clone BEFORE overwriting anything.
  const entries = parsePatches(patchesMd);
  const failures = [];
  for (const e of entries) {
    if (e.targets.length === 0) continue;
    if (!e.baseline) {
      failures.push(`no upstream-sha256 baseline recorded — add one per target file:\n    ${e.raw}`);
      continue;
    }
    for (const t of e.targets) {
      const inClone = path.join(tmp, t);
      const hash = existsSync(inClone) && statSync(inClone).isFile() ? sha256(inClone) : null;
      if (hash !== e.baseline) {
        failures.push(
          `patch target \`${t}\` ${hash ? "changed" : "was deleted"} upstream since the patch was made\n    ${e.raw}`,
        );
      }
    }
  }
  if (failures.length > 0) {
    console.error(`\n[sync-docs-site] PATCHES.md entries that may no longer apply — NOT syncing:`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      `\nRe-apply the patches against the new upstream, update their upstream-sha256 baselines\n` +
        `in docs-site/PATCHES.md, then re-run. Local docs-site/ was left untouched.`,
    );
    process.exit(1);
  }

  console.log(`[sync-docs-site] rsyncing upstream over docs-site/ (patch entries verified: ${entries.length})…`);
  run("rsync", ["-a", "--delete", ...RSYNC_EXCLUDES, `${tmp}/`, `${DOCS_DIR}/`]);

  writeFileSync(PATCHES_MD, patchesMd.replace(oldShaLine[0], `- Synced commit: \`${newSha}\``));
  console.log(`[sync-docs-site] done. PATCHES.md "Synced commit" updated to ${newSha.slice(0, 12)}…`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
