#!/usr/bin/env node
/**
 * Embedding pass over the docs corpus: adds `vectors` (base64 float32,
 * parallel to `chunks`) + `vectorMeta` consumed by src/lib/docs-index.ts.
 * Provider chain mirrors resolveEmbedProvider(): Liara AI when
 * LIARA_AI_API_KEY + LIARA_AI_WORKSPACE_ID are set, else avalai
 * (gemini-embedding-001 @ 768 dims by default). e5-family models get the
 * matching passage: prefix; queries embed with query: (see docs-index).
 *
 * Resumable: writes src/data/.embed-progress.json every few batches.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

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
const pick = (k) => process.env[k] || dotenv[k];

let provider, model, dims, url, key;
if (pick("LIARA_AI_API_KEY") && pick("LIARA_AI_WORKSPACE_ID")) {
  provider = "liara-ai";
  model = pick("LIARA_AI_EMBED_MODEL") ?? "intfloat/multilingual-e5-large";
  url = `https://ai.liara.ir/api/${pick("LIARA_AI_WORKSPACE_ID")}/v1/embeddings`;
  key = pick("LIARA_AI_API_KEY");
} else if (pick("AVALAI_API_KEY")) {
  provider = "avalai";
  model = pick("AVALAI_EMBED_MODEL") ?? "gemini-embedding-001";
  dims = Number(pick("AVALAI_EMBED_DIMS") ?? 768) || 768;
  url = "https://api.avalai.ir/v1/embeddings";
  key = pick("AVALAI_API_KEY");
} else {
  console.error("embed-docs-corpus: no embedding provider configured (LIARA_AI_* or AVALAI_API_KEY)");
  process.exit(1);
}
const prefix = model.includes("e5") ? "passage: " : "";
const BATCH = Number(pick("EMBED_BATCH") ?? 64);
const CORPUS = new URL("../src/data/docs-chunks.json", import.meta.url);
const PROGRESS = new URL("../src/data/.embed-progress.json", import.meta.url);

const corpus = JSON.parse(readFileSync(CORPUS, "utf8"));
const chunks = corpus.chunks;
if (corpus.vectorMeta?.provider === provider && corpus.vectorMeta?.model === model && corpus.vectors?.length === chunks.length) {
  console.log(`corpus already embedded with ${provider}/${model} (${chunks.length} vectors) — nothing to do`);
  process.exit(0);
}
const vectors = corpus.vectors?.length === chunks.length && corpus.vectorMeta?.provider === provider && corpus.vectorMeta?.model === model
  ? corpus.vectors
  : new Array(chunks.length).fill(null);
const pending = vectors.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
console.log(`provider=${provider} model=${model} dims=${dims ?? "auto"} chunks=${chunks.length} batch=${BATCH} pending=${pending.length}`);

let dim = corpus.vectorMeta?.dims ?? null;
async function embedBatch(idxs) {
  const inputs = idxs.map((i) => prefix + chunks[i].text);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, ...(dims ? { dimensions: dims } : {}), input: inputs }),
      });
      if (!res.ok) throw new Error(`http ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const rows = (await res.json()).data ?? [];
      if (rows.length !== idxs.length) throw new Error(`expected ${idxs.length} embeddings, got ${rows.length}`);
      for (let k = 0; k < idxs.length; k++) {
        const emb = rows[k].embedding;
        if (!emb?.length) throw new Error(`empty embedding at data index ${k}`);
        if (dim === null) dim = emb.length;
        if (emb.length !== dim) throw new Error(`dim drift: ${emb.length} != ${dim}`);
        const f32 = new Float32Array(emb);
        vectors[idxs[k]] = Buffer.from(f32.buffer, 0, f32.byteLength).toString("base64");
      }
      return;
    } catch (err) {
      const wait = 2000 * attempt;
      console.error(`  batch failed (attempt ${attempt}): ${err.message} — retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("batch exhausted retries");
}

const started = Date.now();
let n = 0;
const batches = Math.ceil(pending.length / BATCH);
for (let b = 0; b < batches; b++) {
  const idxs = pending.slice(b * BATCH, (b + 1) * BATCH);
  await embedBatch(idxs);
  n += idxs.length;
  if (b % 5 === 4 || b === batches - 1) {
    writeFileSync(PROGRESS, JSON.stringify({ done: n, total: pending.length, dim }));
    const rate = n / ((Date.now() - started) / 1000);
    console.log(`  embedded ${n}/${pending.length} (dim=${dim}, ${rate.toFixed(1)}/s)`);
  }
}

if (vectors.filter((v) => v === null).length > 0) throw new Error("chunks still without vectors");
corpus.vectors = vectors;
corpus.vectorMeta = { provider, model, dims: dim };
writeFileSync(CORPUS, JSON.stringify(corpus));
existsSync(PROGRESS) && writeFileSync(PROGRESS, JSON.stringify({ done: pending.length, total: pending.length, dim }));
console.log(`wrote ${vectors.length} vectors (${provider}/${model}, dim=${dim}) into docs-chunks.json`);
