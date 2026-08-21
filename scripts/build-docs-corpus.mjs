#!/usr/bin/env node
/**
 * Task 4 (corpus half): build the dual docs corpus (no embeddings).
 *
 *  Corpus A "guides"  — liara-cloud/docs (Persian guides) cloned into
 *    .cache/docs; walks every .md/.mdx under src/pages (skipping _* files),
 *    cleans MDX and chunks. URL map: src/pages/<rest>.mdx →
 *    https://docs.liara.ir/<rest> (trailing /index and extension stripped,
 *
 *  Corpus B "api-ref" — developers.liara.ir llms.txt (.md pages only,
 *    /spec/ links excluded), fetched with concurrency 8 and cached in
 *    .cache/apiref/<sha1(url)>.md; each page chunked by its ## headings.
 *
 * Output: src/data/docs-chunks.json {meta, chunks} — Chunk shape from
 * src/lib/chunker.js (reused, not reimplemented).
 *
 * Usage: node scripts/build-docs-corpus.mjs
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { cleanMdx, extractTitle } from "../src/lib/clean-mdx.js";
import { chunkPage } from "../src/lib/chunker.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DOCS_REPO = "https://github.com/liara-cloud/docs";
const DOCS_DIR = join(ROOT, ".cache", "docs");
const APIREF_DIR = join(ROOT, ".cache", "apiref");
const OUT_PATH = join(ROOT, "src", "data", "docs-chunks.json");
const LLMS_TXT = "https://developers.liara.ir/llms.txt";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  }
}

/** Clone (depth 1) or fast-forward-update the guides repo. */
function syncDocsRepo() {
  if (existsSync(join(DOCS_DIR, ".git"))) {
    process.stdout.write("Updating .cache/docs (git pull)… ");
    run("git", ["-C", DOCS_DIR, "pull", "--ff-only"]);
    console.log("done");
  } else {
    mkdirSync(DOCS_DIR, { recursive: true });
    process.stdout.write(`Cloning ${DOCS_REPO} (depth 1)… `);
    run("git", ["clone", "--depth", "1", DOCS_REPO, DOCS_DIR]);
    console.log("done");
  }
}

/** Recursively collect .md/.mdx files (skip _-prefixed) under dir. */
function walkPages(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full, out);
    else if (/\.(md|mdx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Corpus A: Persian guides.
 * src/pages/<rest>.mdx → https://docs.liara.ir/<rest>
 */
function buildGuides() {
  const pagesDir = join(DOCS_DIR, "src", "pages");
  const files = walkPages(pagesDir);
  const chunks = [];
  let pages = 0;
  for (const file of files) {
    const rel = relative(pagesDir, file).replaceAll("\\", "/");
    const rest = rel.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "");
    const raw = readFileSync(file, "utf8");
    const text = cleanMdx(raw);
    if (!text.trim()) continue;
    pages++;
    chunks.push(
      ...chunkPage({
        slug: `guides/${rest}`,
        url: `https://docs.liara.ir/${rest}`,
        title: extractTitle(raw) ?? rest.split("/").pop(),
        product: rest.includes("/") ? rest.split("/")[0] : "overview",
        source: "guides",
        text,
      }),
    );
  }
  return { chunks, pages };
}

/**
 * Corpus B product facet: first URL segment, normalized so products line
 * up with the guides corpus — /pages/<p>.md overview pages → p, ai-*
 * sections → ai, Liara's /dbass/ spelling → dbaas.
 */
function apiProduct(pathname) {
  const segs = pathname.replace(/^\//, "").split("/").filter(Boolean);
  let first = (segs[0] ?? "misc").replace(/\.md$/, "");
  if (first === "pages" && segs[1]) first = segs[1].replace(/\.md$/, "");
  if (first.startsWith("ai-")) return "ai";
  return first === "dbass" ? "dbaas" : first;
}

async function fetchText(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

/** Drop the llms.txt banner blockquote: everything before the first `# `. */
function stripBanner(md) {
  const m = md.match(/^#\s+.+$/m);
  return m ? md.slice(m.index) : md;
}

/** .md links on developers.liara.ir, /spec/ excluded, deduped. */
function parseLlmsTxt(txt) {
  const seen = new Map(); // url → link title
  for (const m of txt.matchAll(
    /\[([^\]]+)\]\((https:\/\/developers\.liara\.ir\/[^)\s]+\.md)\)/g,
  )) {
    if (m[2].includes("/spec/")) continue;
    if (!seen.has(m[2])) seen.set(m[2], m[1].trim());
  }
  return [...seen.entries()].map(([url, title]) => ({ url, title }));
}

/** Fixed-size worker pool preserving item order. */
async function pooled(items, size, worker) {
  let next = 0;
  const results = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i]).catch((err) => ({ error: String(err?.message ?? err) }));
      }
    }),
  );
  return results;
}

async function buildApiRef() {
  mkdirSync(APIREF_DIR, { recursive: true });
  const entries = parseLlmsTxt(await fetchText(LLMS_TXT));
  console.log(`llms.txt: ${entries.length} api-ref pages`);

  const results = await pooled(entries, 8, async ({ url, title }) => {
    const cachePath = join(APIREF_DIR, `${createHash("sha1").update(url).digest("hex")}.md`);
    let md;
    try {
      md = readFileSync(cachePath, "utf8");
    } catch {
      md = await fetchText(url);
      writeFileSync(cachePath, md);
    }
    const body = stripBanner(md);
    if (!body.trim()) return null;
    const pathname = new URL(url).pathname;
    const rest = pathname.replace(/^\//, "").replace(/\.md$/, "");
    const h1 = body.match(/^#\s+(.+)$/m);
    return chunkPage({
      slug: `api-ref/${rest}`,
      url: url.replace(/\.md$/, ""),
      title: (h1?.[1] ?? title).trim(),
      product: apiProduct(pathname),
      source: "api-ref",
      text: body,
    });
  });

  const chunks = [];
  const errors = [];
  for (const r of results) {
    if (r?.error) errors.push(r.error);
    else if (r) chunks.push(...r);
  }
  for (const e of errors) console.warn(`  fetch error (skipped): ${e}`);
  return { chunks, pages: chunks.length ? entries.length - errors.length : 0, errors };
}

function summarize(chunks) {
  const bySource = {};
  const byProduct = {};
  let len = 0;
  for (const c of chunks) {
    bySource[c.source] = (bySource[c.source] ?? 0) + 1;
    byProduct[c.product] = (byProduct[c.product] ?? 0) + 1;
    len += c.text.length;
  }
  const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1]);
  console.log(`\ntotal chunks: ${chunks.length} (avg ${Math.round(len / Math.max(chunks.length, 1))} chars)`);
  console.log(`by source: ${JSON.stringify(bySource)}`);
  console.log(`by product: ${JSON.stringify(Object.fromEntries(top))}`);
  console.log("\nsamples:");
  for (const c of [chunks[0], chunks[Math.floor(chunks.length / 2)], chunks.at(-1)]) {
    console.log(`  - [${c.source}] ${c.title} — ${c.url}`);
    console.log(`    ${c.text.slice(0, 100).replace(/\n/g, " ")}`);
  }
}

async function main() {
  syncDocsRepo();
  const guides = buildGuides();
  console.log(`guides: ${guides.pages} pages → ${guides.chunks.length} chunks`);
  const apiRef = await buildApiRef();
  console.log(`api-ref: ${apiRef.pages} pages → ${apiRef.chunks.length} chunks`);

  const chunks = [...guides.chunks, ...apiRef.chunks];
  const out = {
    meta: {
      builtAt: new Date().toISOString(),
      guidesPages: guides.pages,
      apiRefPages: apiRef.pages,
      chunks: chunks.length,
    },
    chunks,
  };
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out));
  summarize(chunks);
  console.log(`\nwrote ${OUT_PATH} (${(statSync(OUT_PATH).size / 1e6).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
