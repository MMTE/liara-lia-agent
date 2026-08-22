import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BM25Index } from "./bm25.js";
import { rrfFuse } from "./rrf.js";
import { tokenize } from "./persian.js";

export interface Chunk {
  id: string;
  slug: string;
  url: string;
  title: string;
  product: string;
  source: string;
  sectionPath: string;
  /** explicit section id on the docs page (deep-link anchor), when known */
  anchor?: string | null;
  text: string;
}

export interface DocHit {
  title: string;
  url: string;
  /** `url#anchor` deep link to the exact section (equals url when no anchor) */
  deepUrl: string;
  slug: string;
  source: string;
  /** explicit section id for deep linking (null when the page has none) */
  anchor: string | null;
  snippet: string;
  score: number;
}


interface VectorMeta {
  provider: string;
  model: string;
  dims: number;
}

interface CorpusFile {
  meta: Record<string, unknown>;
  chunks: Chunk[];
  vectors?: string[]; // base64 float32, parallel to chunks (added by embedding pass)
  vectorMeta?: VectorMeta; // embedding pass provenance; mismatch disables the channel
}

const DATA_PATH = join(process.cwd(), "src", "data", "docs-chunks.json");

let chunks: Chunk[] = [];
let bm25: BM25Index | null = null;
let vectors: Float32Array[] | null = null;
let warmed = false;

function warm(): void {
  if (warmed) return;
  const corpus = JSON.parse(readFileSync(DATA_PATH, "utf8")) as CorpusFile;
  chunks = corpus.chunks;
  bm25 = new BM25Index(chunks.map((c) => ({ id: c.id, text: c.text })));
  const active = resolveEmbedProvider();
  const meta = corpus.vectorMeta;
  const metaOk = !!active && !!meta && meta.provider === active.provider && meta.model === active.model;
  if (metaOk && Array.isArray(corpus.vectors) && corpus.vectors.length === chunks.length) {
    vectors = corpus.vectors.map((b64) => {
      const buf = Buffer.from(b64, "base64");
      return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
    });
  }
  warmed = true;
}

function cosineTop(queryVec: Float32Array, k: number): { id: string; score: number }[] {
  const scored: { id: string; score: number }[] = [];
  for (let i = 0; i < vectors!.length; i++) {
    const v = vectors![i];
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let j = 0; j < v.length; j++) {
      dot += v[j] * queryVec[j];
      na += v[j] * v[j];
      nb += queryVec[j] * queryVec[j];
    }
    if (na > 0 && nb > 0) scored.push({ id: chunks[i].id, score: dot / Math.sqrt(na * nb) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}

/** Semantic-channel provider: Liara AI when configured, else the paid
 *  avalai aggregator already serving chat. Vectors in the corpus file carry
 *  vectorMeta so a model change disables the channel instead of corrupting
 *  cosine scores across mismatched embedding spaces. */
function resolveEmbedProvider(): {
  provider: string;
  model: string;
  dims?: number;
  url: (ws: string) => string;
  key: string | undefined;
} | null {
  const liaraKey = process.env.LIARA_AI_API_KEY;
  const ws = process.env.LIARA_AI_WORKSPACE_ID;
  if (liaraKey && ws) {
    return {
      provider: "liara-ai",
      model: process.env.LIARA_AI_EMBED_MODEL ?? "intfloat/multilingual-e5-large",
      url: (workspace) => `https://ai.liara.ir/api/${workspace}/v1/embeddings`,
      key: liaraKey,
    };
  }
  if (process.env.AVALAI_API_KEY) {
    return {
      provider: "avalai",
      model: process.env.AVALAI_EMBED_MODEL ?? "gemini-embedding-001",
      dims: Number(process.env.AVALAI_EMBED_DIMS ?? 768) || 768,
      url: () => "https://api.avalai.ir/v1/embeddings",
      key: process.env.AVALAI_API_KEY,
    };
  }
  return null;
}

/** e5-family models require query:/passage: task prefixes; others do not. */
function e5Prefix(model: string, task: "query" | "passage"): string {
  return model.includes("e5") ? `${task}: ` : "";
}

async function embedQuery(query: string): Promise<Float32Array | null> {
  const p = resolveEmbedProvider();
  if (!p) return null;
  try {
    const res = await fetch(p.url(process.env.LIARA_AI_WORKSPACE_ID ?? ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: p.model,
        ...(p.dims ? { dimensions: p.dims } : {}),
        input: `${e5Prefix(p.model, "query")}${query}`,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { embedding: number[] }[] };
    const emb = data.data?.[0]?.embedding;
    return emb ? new Float32Array(emb) : null;
  } catch {
    return null; // degrade to keyword-only
  }
}

const queryEmbedCache = new Map<string, Float32Array>();

function snippet(text: string, len = 240): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= len ? clean : `${clean.slice(0, len)}…`;
}

export async function searchDocs(query: string, k = 6): Promise<DocHit[]> {
  warm();
  const pools: { id: string; score: number }[][] = [];
  pools.push(bm25!.search(query, 24));
  if (vectors) {
    let qv = queryEmbedCache.get(query);
    if (qv === undefined) {
      const embedded = await embedQuery(query);
      if (embedded) {
        if (queryEmbedCache.size > 512) queryEmbedCache.clear();
        queryEmbedCache.set(query, embedded);
        qv = embedded;
      }
    }
    if (qv) pools.push(cosineTop(qv, 24));
  }
  const byId = new Map<string, Chunk>(chunks.map((c) => [c.id, c]));
  const seenUrls = new Set<string>();
  const hits: DocHit[] = [];
  for (const { id, score } of rrfFuse(pools)) {
    if (hits.length >= k) break;
    const c = byId.get(id);
    if (!c || seenUrls.has(c.url)) continue;
    seenUrls.add(c.url);
    hits.push({
      title: c.title,
      url: c.url,
      deepUrl: c.anchor ? `${c.url}#${c.anchor}` : c.url,
      slug: c.slug,
      source: c.source,
      anchor: c.anchor ?? null,
      snippet: snippet(c.text),
      score,
    });
  }
  return hits;
}

export function readDoc(slug: string, maxChars = 12_000): { text: string; url: string; anchor: string | null } | null {
  warm();
  const page = chunks.filter((c) => c.slug === slug || c.url.endsWith(slug));
  if (page.length === 0) return null;
  const body = page
    .slice()
    .sort((a, b) => a.sectionPath.localeCompare(b.sectionPath))
    .map(
      (c) =>
        `## ${c.title}${c.sectionPath ? ` — ${c.sectionPath}` : ""}${c.anchor ? ` {#${c.anchor}}` : ""}\n\n${c.text}`,
    )
    .join("\n\n---\n\n");
  const first = page[0];
  return {
    text: body.length > maxChars ? `${body.slice(0, maxChars)}\n\n… (بریده شد)` : body,
    url: first.url,
    anchor: first.anchor ?? null,
  };
}

export function corpusStats(): { chunks: number; semantic: boolean } {
  warm();
  return { chunks: chunks.length, semantic: vectors !== null };
}
