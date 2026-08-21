#!/usr/bin/env node
/**
 * Sync docs-site/ from the upstream liara-cloud/docs fork (ADR-0008).
 *
 *   node scripts/sync-docs-site.mjs
 *
 * 1. Pre-flight: docs-site/PATCHES.md must exist and carry a
 *    `- Synced commit: \`<sha>\`` line (rewritten on success).
 * 2. Shallow-clone upstream HEAD into a temp dir.
 * 3. Pre-rsync guard (upstream drift): every patch entry in PATCHES.md
 *    records the sha256 of its target in pristine upstream at patch time
 *    (`upstream-sha256:<hex>`) — or `upstream-sha256:none` for a file
 *    upstream never had (patch-added file). If upstream has since
 *    changed/deleted the target (or added a `none` target), the patch may
 *    no longer apply: list the entries and exit 1 WITHOUT touching docs-site/.
 * 4. rsync the clone over docs-site/ with --delete, preserving local-only
 *    state: node_modules/, .next/, out/, PATCHES.md (never copies .git).
 *    NOTE: rsync reverts locally-modified targets to upstream content and
 *    --delete removes patch-added files — hence step 5.
 * 5. Post-rsync guard (verifyPatches): every patch target must still exist
 *    in docs-site/ and still differ from pristine upstream (`none`: must
 *    exist locally and still be absent upstream). Otherwise list the
 *    wiped/reverted patches and exit 1 — docs-site/ is git-tracked, so
 *    `git checkout HEAD -- docs-site/<target>` restores them — and leave
 *    the "Synced commit" line untouched.
 * 6. On success, rewrite the whole "Synced commit" line with the new SHA
 *    and today's date.
 *
 * Pure helpers exported for tests (node --test tests/docs-sync-site.test.mjs):
 *   parsePatches(md) → [{ targets: string[], baseline: "<hex>"|"none"|null, raw }]
 *   verifyPatches({ localDir, upstreamDir, patches }) → failure strings ([] = ok)
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const UPSTREAM_URL = "https://github.com/liara-cloud/docs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DOCS_DIR = path.join(ROOT, "docs-site");
const PATCHES_MD = path.join(DOCS_DIR, "PATCHES.md");

const RSYNC_EXCLUDES = [".git", "node_modules", ".next", "out", "PATCHES.md"].flatMap((e) => ["--exclude", e]);

/** Matches the whole header line, including any ` (date)` suffix. */
const SYNCED_LINE_RE = /^-\s*Synced commit:\s*`([0-9a-f]+)`.*$/m;
const BASELINE_RE = /^upstream-sha256:([0-9a-f]{64}|none)$/;

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

function out(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Parse the `## Patches` section of PATCHES.md.
 * Numbered items only; parsing stops at the next heading of ANY level, so
 * numbered lists in later sections (e.g. "## Integration facts") are ignored.
 * Each entry: { targets: [...paths in backticks containing "/"],
 *               baseline: "<64-hex>" | "none" | null, raw: "item text" }.
 */
export function parsePatches(md) {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^##\s+Patches\s*$/.test(l));
  if (start === -1) return [];
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break; // next section (any heading level)
    const m = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (!m) continue;
    const spans = [...m[1].matchAll(/`([^`]+)`/g)].map((s) => s[1]);
    const baselineSpan = spans.find((s) => s.startsWith("upstream-sha256:"));
    const baseline = baselineSpan ? (BASELINE_RE.exec(baselineSpan)?.[1] ?? null) : null;
    const targets = spans.filter((s) => !s.startsWith("upstream-sha256:") && s.includes("/"));
    entries.push({ targets, baseline, raw: m[1].trim() });
  }
  return entries;
}

/**
 * Post-rsync verification (pure): `rsync -a --delete` reverts modified patch
 * targets to pristine upstream content and deletes patch-added files. Every
 * patch target must still exist under localDir and still differ from the
 * pristine copy under upstreamDir. `none` baselines: target must exist
 * locally and NOT exist upstream. Returns failure strings (empty = all good).
 */
export function verifyPatches({ localDir, upstreamDir, patches }) {
  const failures = [];
  for (const e of patches) {
    for (const t of e.targets) {
      const local = path.join(localDir, t);
      const upstream = path.join(upstreamDir, t);
      if (!isFile(local)) {
        failures.push(`patch target \`${t}\` no longer exists in docs-site/ (deleted by sync)\n    ${e.raw}`);
        continue;
      }
      if (e.baseline === "none") {
        if (isFile(upstream)) {
          failures.push(`new-file patch target \`${t}\` now also exists upstream — reconcile, then record its upstream sha256\n    ${e.raw}`);
        }
      } else if (e.baseline === null) {
        failures.push(`no baseline recorded (expected \`upstream-sha256:<hex>\`, or \`upstream-sha256:none\` for a new file) — cannot verify\n    ${e.raw}`);
      } else if (!isFile(upstream)) {
        failures.push(`patch target \`${t}\` no longer exists upstream — port the patch or drop the entry\n    ${e.raw}`);
      } else if (sha256(local) === sha256(upstream)) {
        failures.push(`patch target \`${t}\` was reverted to pristine upstream content (patch stripped by sync)\n    ${e.raw}`);
      }
    }
  }
  return failures;
}

/** Pre-rsync guard (pure): has upstream drifted away from the recorded baselines? */
function upstreamDrift(upstreamDir, entries) {
  const failures = [];
  for (const e of entries) {
    for (const t of e.targets) {
      const inClone = path.join(upstreamDir, t);
      if (e.baseline === "none") {
        if (isFile(inClone)) {
          failures.push(`new-file patch target \`${t}\` was added upstream — reconcile, then record its upstream sha256\n    ${e.raw}`);
        }
      } else if (e.baseline === null) {
        failures.push(`no baseline recorded (expected \`upstream-sha256:<hex>\`, or \`upstream-sha256:none\` for a new file) — cannot verify\n    ${e.raw}`);
      } else {
        const hash = isFile(inClone) ? sha256(inClone) : null;
        if (hash !== e.baseline) {
          failures.push(`patch target \`${t}\` ${hash ? "changed" : "was deleted"} upstream since the patch was made\n    ${e.raw}`);
        }
      }
    }
  }
  return failures;
}

// --- main -------------------------------------------------------------------

function main() {
  if (!existsSync(DOCS_DIR) || !existsSync(PATCHES_MD)) {
    console.error(`[sync-docs-site] missing ${PATCHES_MD} — vendor docs-site/ first (see ADR-0008, Task 4).`);
    process.exit(1);
  }
  const patchesMd = readFileSync(PATCHES_MD, "utf8");
  const syncedLine = SYNCED_LINE_RE.exec(patchesMd);
  if (!syncedLine) {
    console.error(`[sync-docs-site] docs-site/PATCHES.md has no "- Synced commit: \`<sha>\`" line — fix the header before syncing.`);
    process.exit(1);
  }
  const oldSha = syncedLine[1];

  const tmp = mkdtempSync(path.join(tmpdir(), "liara-docs-sync-"));
  try {
    console.log(`[sync-docs-site] cloning ${UPSTREAM_URL} (depth 1)…`);
    run("git", ["clone", "--depth", "1", UPSTREAM_URL, tmp]);

    const newSha = out("git", ["-C", tmp, "rev-parse", "HEAD"]);
    console.log(`[sync-docs-site] upstream HEAD: ${newSha} (was ${oldSha})`);

    const entries = parsePatches(patchesMd);

    // Pre-rsync: abort before touching docs-site/ if upstream drifted under a patch.
    const drift = upstreamDrift(tmp, entries);
    if (drift.length > 0) {
      console.error(`\n[sync-docs-site] PATCHES.md entries that may no longer apply — NOT syncing:`);
      for (const f of drift) console.error(`  - ${f}`);
      console.error(`\nRe-apply the patches against the new upstream, update their baselines in\ndocs-site/PATCHES.md, then re-run. Local docs-site/ was left untouched.`);
      process.exit(1);
    }

    console.log(`[sync-docs-site] rsyncing upstream over docs-site/ (${entries.length} patch entries verified against upstream)…`);
    run("rsync", ["-a", "--delete", ...RSYNC_EXCLUDES, `${tmp}/`, `${DOCS_DIR}/`]);

    // Post-rsync: rsync --delete may have wiped the patches — fail loudly if so.
    const wiped = verifyPatches({ localDir: DOCS_DIR, upstreamDir: tmp, patches: entries });
    if (wiped.length > 0) {
      console.error(`\n[sync-docs-site] PATCHES.md entries NOT applied after sync (rsync reverted/removed them):`);
      for (const f of wiped) console.error(`  - ${f}`);
      console.error(
        `\ndocs-site/ now holds pristine upstream ${newSha.slice(0, 12)}… and PATCHES.md was NOT updated.\n` +
          `Restore the patched files from git (\`git checkout HEAD -- docs-site/<target>\`), re-apply them\n` +
          `on top of the new upstream, update their baselines in docs-site/PATCHES.md, then re-run.`,
      );
      process.exit(1);
    }

    const date = new Date().toISOString().slice(0, 10);
    writeFileSync(PATCHES_MD, patchesMd.replace(SYNCED_LINE_RE, `- Synced commit: \`${newSha}\` (${date})`));
    console.log(`[sync-docs-site] done. ${entries.length} patch entries verified in place; "Synced commit" → ${newSha.slice(0, 12)}… (${date})`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// Run only when executed directly (`node scripts/sync-docs-site.mjs`);
// importing the module (tests) must never trigger a clone/sync.
const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (invokedDirectly) main();
