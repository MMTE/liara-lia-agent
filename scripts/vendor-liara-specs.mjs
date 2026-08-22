#!/usr/bin/env node
/**
 * Vendor Liara OpenAPI specs as JSON for eve connections — full surface.
 *
 * Downloads pinned YAML documents from liara-cloud/openapi@main, converts to
 * JSON so agent/connections/*.ts can import them inline (ADR-0007: no
 * runtime fetch, no YAML parsing in the agent bundle). AI specs that share
 * an auth mode are merged into one connection spec each:
 *
 *   liara-ai-account   = ai-workspaces + ai-keys + ai-logs + ai-playground
 *                        (account JWT, team-scoped)
 *   liara-ai-inference = ai-chat-completions + ai-embeddings + ai-tts +
 *                        ai-image-generation (AI API key, workspace path)
 *   liara-ai-models    = ai-models (public catalog, read-only)
 *
 * Vendored normalizations applied on the way through:
 *
 *   1. teamID query parameter on every operation of every account-scoped
 *      service (verified live 2026-08-22: paas/dbaas/ai need it for
 *      personal-scope tokens; dns/storage/mail/iaas accept and ignore or
 *      honor it — never rejected);
 *   2. Authorization security schemes normalized to `http: bearer`
 *      (upstream declares apiKey-in-header but documents the Bearer prefix;
 *      eve's apiKey semantics strip the prefix → 401);
 *   3. an operations manifest `ops.json` (service → operationId →
 *      {method, path}) that powers the method-based approval gate in
 *      agent/lib/liara-approval.ts.
 *
 * Usage: node scripts/vendor-liara-specs.mjs [name …]   (no args = all)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

const RAW = "https://raw.githubusercontent.com/liara-cloud/openapi/main/spec";

/**
 * Each output spec: `sources` are merged (paths + tags), `auth` picks the
 * security scheme normalization target, `teamScope` adds the teamID param.
 * Bases come from the specs' own `servers` (verified live); connections
 * may still override baseUrl via env.
 */
const SPECS = [
  { name: "paas", sources: ["paas.yaml"], teamScope: true },
  { name: "dbaas", sources: ["dbaas.yaml"], teamScope: true },
  { name: "dns", sources: ["dns.yaml"], teamScope: true },
  { name: "storage", sources: ["object-storage.yaml"], teamScope: true },
  { name: "mail", sources: ["mail.yaml"], teamScope: true },
  { name: "iaas", sources: ["Iaas.yaml"], teamScope: true },
  {
    name: "ai-account",
    title: "Liara AI Account API (workspaces, keys, logs, playground)",
    sources: ["ai-workspaces.yaml", "ai-keys.yaml", "ai-logs.yaml", "ai-playground.yaml"],
    teamScope: true,
  },
  {
    name: "ai-inference",
    title: "Liara AI Inference API (chat, embeddings, tts, images)",
    sources: ["ai-chat-completions.yaml", "ai-embeddings.yaml", "ai-tts.yaml", "ai-image-generation.yaml"],
    teamScope: false,
  },
  { name: "ai-models", sources: ["ai-models.yaml"], teamScope: false },
];

const OUT_DIR = path.resolve("agent/specs");

async function fetchSpec(file) {
  const url = `${RAW}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return parse(await res.text());
}

/** Merge secondary sources into the first (paths + tags). Throws on path
 * collisions — two ops claiming the same method+path must never silently
 * overwrite each other. */
function mergeSpecs(specs, title) {
  const [base, ...rest] = specs;
  const merged = structuredClone(base);
  merged.info = { ...merged.info, title, version: merged.info?.version ?? "1.0.0" };
  const seen = new Map(
    Object.entries(merged.paths ?? {}).flatMap(([p, item]) =>
      Object.entries(item ?? {})
        .filter(([, op]) => op && typeof op === "object" && "operationId" in op)
        .map(([m, op]) => [`${m.toUpperCase()} ${p}`, op.operationId]),
    ),
  );
  for (const extra of rest) {
    for (const [p, item] of Object.entries(extra.paths ?? {})) {
      for (const [m, op] of Object.entries(item ?? {})) {
        if (!op || typeof op !== "object" || !("operationId" in op)) continue;
        const key = `${m.toUpperCase()} ${p}`;
        const prev = seen.get(key);
        if (prev && prev !== op.operationId) {
          throw new Error(`path collision merging AI specs: ${key} is ${prev} and ${op.operationId}`);
        }
        if (prev) continue; // same op appearing twice (shared component) — keep first
        seen.set(key, op.operationId);
        merged.paths = merged.paths ?? {};
        merged.paths[p] = merged.paths[p] ?? {};
        merged.paths[p][m] = op;
      }
    }
    merged.tags = [...(merged.tags ?? []), ...(extra.tags ?? [])];
  }
  return merged;
}

/** Upstream specs occasionally reuse an operationId across two paths (e.g.
 * mail's `getTags` on two GETs). eve derives tool names from operationId, so
 * a duplicate would collide — deterministically rename the second and later
 * occurrences to `<id>_2`, `<id>_3`, … Returns a rename log string. */
function dedupeOperationIds(spec) {
  const seen = new Map();
  const log = [];
  for (const item of Object.values(spec.paths ?? {})) {
    for (const op of Object.values(item ?? {})) {
      if (!op || typeof op !== "object" || !("operationId" in op)) continue;
      const n = (seen.get(op.operationId) ?? 0) + 1;
      seen.set(op.operationId, n);
      if (n > 1) {
        log.push(`${op.operationId}→${op.operationId}_${n}`);
        op.operationId = `${op.operationId}_${n}`;
      }
    }
  }
  return log.join(", ");
}

/**
 * Liara team scope: the platform API selects the account context via the
 * `teamID` query param (same mechanism the CLI uses for every request). A
 * token that is not team-bound server-side (e.g. the built-in demo token)
 * must carry ?teamID=<LIARA_TEAM_ID> or it sees an empty account. The
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
 * Liara's upstream specs declare `jwt`/`apiKey` as apiKey-in-header named
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

/** Flatten every operation into {method, path} — the approval gate's source
 * of truth for read vs. write classification. */
function buildManifest(specsByService) {
  const manifest = {};
  for (const [service, spec] of Object.entries(specsByService)) {
    manifest[service] = {};
    for (const [p, item] of Object.entries(spec.paths ?? {})) {
      for (const [m, op] of Object.entries(item ?? {})) {
        if (!op || typeof op !== "object" || !("operationId" in op)) continue;
        manifest[service][op.operationId] = { method: m.toUpperCase(), path: p };
      }
    }
  }
  return manifest;
}
const requested = process.argv.slice(2).filter(Boolean);
const selected = requested.length ? SPECS.filter((s) => requested.includes(s.name)) : SPECS;
if (requested.length && selected.length !== requested.length) {
  const known = SPECS.map((s) => s.name).join(", ");
  throw new Error(`unknown spec name(s) ${requested.join(", ")} — known: ${known}`);
}
const specsByService = {};
for (const { name, sources, title, teamScope } of selected) {
  const parsed = [];
  for (const file of sources) parsed.push(await fetchSpec(file));
  const spec = sources.length === 1 ? parsed[0] : mergeSpecs(parsed, title);
  const renamed = dedupeOperationIds(spec);
  const injected = teamScope ? injectTeamScopeParameter(spec) : 0;
  const fixed = normalizeBearerSecurity(spec);
  specsByService[name] = spec;
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, `${name}.json`), JSON.stringify(spec, null, 2) + "\n");
  const ops = Object.values(spec.paths ?? {})
    .flatMap((pathItem) => Object.values(pathItem ?? {}))
    .filter((op) => op && typeof op === "object" && "operationId" in op)
    .map((op) => op.operationId);
  console.log(`✓ ${name}: ${ops.length} operations (teamID on ${injected}, bearer-normalized schemes: ${fixed}${renamed ? `, deduped ids: ${renamed}` : ""})`);
  console.log(`  operationIds: ${ops.sort().join(", ")}`);
}

const manifest = buildManifest(specsByService);
await writeFile(path.join(OUT_DIR, "ops.json"), JSON.stringify(manifest, null, 2) + "\n");
const total = Object.values(manifest).reduce((n, ops) => n + Object.keys(ops).length, 0);
const writes = Object.values(manifest)
  .flatMap((ops) => Object.values(ops))
  .filter((op) => op.method !== "GET").length;
console.log(`✓ ops.json: ${total} operations across ${Object.keys(manifest).length} services (${writes} non-GET → approval-gated)`);
