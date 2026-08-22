#!/usr/bin/env node
/**
 * Deploy the docs-site fork (static export) to Liara via the platform API.
 *
 *   cd docs-site && NEXT_PUBLIC_AGENT_ORIGIN=<agent> npm run build
 *   node scripts/deploy-docs.mjs
 *
 * Tars docs-site/out (already built with the production agent origin baked
 * into the static assets) and creates a `static` release — the equivalent of
 * `liara deploy --path out`. Same env contract as deploy-agent.mjs.
 */
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const API = process.env.LIARA_API_BASE || "https://api.iran.liara.ir";
const APP = process.env.DOCS_APP_NAME || "liara-lia-docs";
const OUT_DIR = process.env.DOCS_OUT_DIR || path.resolve("docs-site/out");
const DOCS_URL = (process.env.DOCS_PUBLIC_URL || `https://${APP}.liara.run`).replace(/\/+$/, "");

function envFromDotenv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const out = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

const dotenv = envFromDotenv();
const TOKEN = process.env.DEMO_LIARA_TOKEN || dotenv.DEMO_LIARA_TOKEN;
const TEAM = process.env.LIARA_TEAM_ID || dotenv.LIARA_TEAM_ID;
if (!TOKEN || !TEAM) throw new Error("DEMO_LIARA_TOKEN and LIARA_TEAM_ID are required (env or .env)");

const api = (pathname, init) =>
  fetch(`${API}/${pathname.replace(/^\//, "")}${pathname.includes("?") ? "&" : "?"}teamID=${TEAM}`, {
    ...init,
    headers: {
      "User-Agent": "liara-cli/9.5.1 (darwin arm64; x64)",
      authorization: `Bearer ${TOKEN}`,
      ...(init?.headers || {}),
    },
  });


async function main() {
  const stage = mkdtempSync(path.join(tmpdir(), "lia-docs-"));
  // _next cache headers are irrelevant on a static host upload; keep the
  // tree as-is. A 200-page static export — no service worker/PWA noise.
  const tarPath = `${stage}.tar.gz`;
  execSync(`tar -czf ${tarPath} -C ${OUT_DIR} .`);
  console.log(`tarball: ${tarPath} (${statSync(tarPath).size} bytes from ${OUT_DIR})`);

  try {
    const buf = readFileSync(tarPath);
    const form = new FormData();
    form.append("file", new Blob([buf], { type: "application/gzip" }), "source.tar.gz");
    const res = await api(`v2/projects/${APP}/sources`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`sources upload failed: ${res.status} ${await res.text()}`);
    const { sourceID } = await res.json();
    console.log(`source uploaded: ${sourceID}`);

    const rel = await api(`v2/projects/${APP}/releases`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceID,
        port: 80,
        type: "static",
        build: {},
      }),
    });
    const text = await rel.text();
    if (!rel.ok) throw new Error(`release create failed: ${rel.status} ${text}`);
    const { releaseID } = JSON.parse(text);
    console.log(`release created: ${releaseID}`);

    const start = Date.now();
    for (;;) {
      await new Promise((r) => setTimeout(r, 5000));
      const r = await api(`v1/releases/${releaseID}`);
      if (!r.ok) throw new Error(`release poll failed: ${r.status} ${await r.text()}`);
      const { release } = await r.json();
      const state = release.state;
      process.stdout.write(`\r[${Math.round((Date.now() - start) / 1000)}s] ${state}${release.queue ? ` (queue: ${release.queue})` : "           "}\x1b[K`);
      if (state === "FAILED" || state === "UNHEALTHY") {
        throw new Error(`release ${state}: ${release.failReason || "no fail reason"}`);
      }
    }
  } finally {
    rmSync(tarPath, { force: true });
  }
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
