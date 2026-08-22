#!/usr/bin/env node
/**
 * Vendor Liara OpenAPI specs (PaaS + DBaaS) as JSON for eve connections.
 *
 * Downloads the pinned YAML documents from liara-cloud/openapi@main and
 * converts them to JSON so agent/connections/*.ts can import them inline
 * (ADR-0007: no runtime fetch, no YAML parsing in the agent bundle). Two
 * vendored normalizations are applied on the way through:
 *
 *   1. teamID query parameter on every operation (team scope — see below);
 *   2. Authorization security scheme normalized to `http: bearer`.
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

/**
 * Liara team scope: the platform API selects the account context via the
 * `teamID` query param (same mechanism the CLI uses for every request). The
 * built-in demo token is NOT team-bound server-side, so agent calls made with
 * it must carry ?teamID=<LIARA_TEAM_ID> or they see an empty account. The
 * parameter is declared (optional, hidden from the model) on every operation
 * and filled per call by the connections' providedArguments.
 */
function injectTeamScopeParameter(spec) {
  const param = {
    name: "teamID",
    in: "query",
    required: false,
    description: "Liara team scope — auto-provided by the connection; not a model input.",
    schema: { type: "string" },
  };
  let ops = 0;
  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const op of Object.values(pathItem ?? {})) {
      if (!op || typeof op !== "object" || !("operationId" in op)) continue;
      op.parameters = Array.isArray(op.parameters) ? op.parameters : [];
      if (!op.parameters.some((p) => p && typeof p === "object" && p.name === "teamID" && p.in === "query")) {
        op.parameters.push(param);
        ops += 1;
      }
    }
  }
  return ops;
}

/**
 * Liara's upstream specs declare `jwt` as apiKey-in-header named
 * "Authorization" but document it as "send with the `Bearer: ` prefix".
 * eve's OpenAPI client strips the Bearer prefix for apiKey schemes (raw
 * key semantics), which Liara rejects with 401 — normalize the scheme to
 * the OpenAPI-accurate `http: bearer` so the prefix survives.
 */
function normalizeBearerSecurity(spec) {
  const schemes = spec.components?.securitySchemes ?? spec.securityDefinitions;
  if (!schemes) return 0;
  let fixed = 0;
  for (const [name, scheme] of Object.entries(schemes)) {
    if (
      scheme &&
      scheme.type === "apiKey" &&
      scheme.in === "header" &&
      /^authorization$/i.test(String(scheme.name ?? ""))
    ) {
      schemes[name] = { type: "http", scheme: "bearer", description: scheme.description };
      fixed += 1;
    }
  }
  return fixed;
}

const OUT_DIR = path.resolve("agent/specs");

for (const { name, url } of SPECS) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  const yamlText = await res.text();
  const spec = parse(yamlText); // YAML → JS object (JSON-compatible)
  const injected = injectTeamScopeParameter(spec);
  const fixed = normalizeBearerSecurity(spec);
  await mkdir(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `${name}.json`);
  await writeFile(out, JSON.stringify(spec, null, 2) + "\n");
  const ops = Object.values(spec.paths ?? {})
    .flatMap((pathItem) => Object.values(pathItem ?? {}))
    .filter((op) => op && typeof op === "object" && "operationId" in op)
    .map((op) => op.operationId);
  console.log(`✓ ${name}: wrote ${out} (${ops.length} operations, teamID on ${injected}, bearer-normalized schemes: ${fixed})`);
  console.log(`  operationIds: ${ops.sort().join(", ")}`);
}
