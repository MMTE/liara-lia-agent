#!/usr/bin/env node
/**
 * Vendor Liara OpenAPI specs (PaaS + DBaaS) as JSON for eve connections.
 *
 * Downloads the pinned YAML documents from liara-cloud/openapi@main and
 * converts them to JSON so agent/connections/*.ts can import them inline
 * (ADR-0007: no runtime fetch, no YAML parsing in the agent bundle).
 *
 * Usage: node scripts/vendor-liara-specs.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

const SPECS = [
  {
    name: "paas",
    url: "https://raw.githubusercontent.com/liara-cloud/openapi/main/spec/paas.yaml",
  },
  {
    name: "dbaas",
    url: "https://raw.githubusercontent.com/liara-cloud/openapi/main/spec/dbaas.yaml",
  },
];

const OUT_DIR = path.resolve("agent/specs");

for (const { name, url } of SPECS) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  const yamlText = await res.text();
  const spec = parse(yamlText); // YAML → JS object (JSON-compatible)
  await mkdir(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `${name}.json`);
  await writeFile(out, JSON.stringify(spec, null, 2) + "\n");
  const ops = Object.values(spec.paths ?? {})
    .flatMap((pathItem) => Object.values(pathItem ?? {}))
    .filter((op) => op && typeof op === "object" && "operationId" in op)
    .map((op) => op.operationId);
  console.log(`✓ ${name}: wrote ${out} (${ops.length} operations)`);
  console.log(`  operationIds: ${ops.sort().join(", ")}`);
}
