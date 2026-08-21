#!/usr/bin/env node
/**
 * Exploration loop for the Lia mascot: FLUX.2 Pro with reference images.
 *
 *   node scripts/explore-lia.mjs [refsDir] [outDir] [count]
 *
 * Defaults: refsDir = ../../lia-picture-assets (main checkout), outDir = its
 * output/ subfolder, count = 3. Each run uploads the reference images via the
 * Replicate files API, generates `count` seeded variants at 0.5 MP (fast,
 * cheap exploration size), and writes them to outDir. Seeds are printed so a
 * promising variant can be reproduced later at higher resolution.
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Replicate from "replicate";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REFS = path.resolve(process.argv[2] ?? path.join(ROOT, "..", "..", "lia-picture-assets"));
const OUT = path.resolve(process.argv[3] ?? path.join(REFS, "output"));
const COUNT = Number(process.argv[4] ?? 3);

// User-provided design brief (2026-08-22) — verbatim.
const PROMPT = `Using the attached images as visual references, design an original AI assistant mascot named Lia, inspired by the overall visual identity and character traits of Liara T'Soni from Mass Effect.

Do NOT create a direct replica, screenshot, or exact copy of the original character. Preserve the recognizable high-level inspiration — an intelligent blue-skinned alien-like female character, calm and curious expression, elegant facial features, subtle sci-fi aesthetic — while creating an original mascot specifically designed for a modern developer platform.

Character:
- Female AI assistant named Lia
- Intelligent, calm, curious, trustworthy, slightly playful
- Friendly and approachable rather than overly cute
- Futuristic but minimal
- Professional enough to belong to a cloud/developer product
- Expressive eyes and subtle facial expressions
- Blue/cyan skin with a refined, non-photorealistic appearance
- Simplified facial and anatomical details suitable for a small UI avatar
- No weapons, armor, combat elements, or dramatic sci-fi props

Visual direction — a polished 2D/3D hybrid mascot illustration with clean shapes, soft lighting, subtle gradients, smooth rendering, a premium SaaS/product aesthetic, slightly stylized proportions, a strong silhouette that remains recognizable at 32–64px, and minimal visual noise. The character should feel like an AI companion for developers, not a game character.

Avatar — primary head-and-shoulders avatar: centered composition, face clearly visible, looking slightly toward the viewer, neutral-friendly expression, simple clean background, designed to work inside a circular avatar container, strong readability at small sizes. Keep the character design consistent; this render is the neutral/default expression.

Important: the attached images are style and character references only. Do not reproduce any copyrighted artwork, exact pose, exact costume, exact facial rendering, or exact character illustration from the references. The final result should feel like "Lia — a friendly, intelligent AI companion from the Liara developer platform."

Avoid: photorealism, anime exaggeration, chibi proportions, generic robot appearance, generic human assistant appearance, excessive cyberpunk elements, busy backgrounds, text, logos, UI elements, or watermarks.`;

async function token() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  try {
    const env = await readFile(path.join(ROOT, ".env"), "utf8");
    return env.match(/^REPLICATE_API_TOKEN=(.+)$/m)?.[1]?.trim();
  } catch {
    /* no .env */
  }
  return undefined;
}

/** Convert webp (unsupported by flux input_images) to jpeg via macOS sips. */
function sips(args) {
  return new Promise((resolve, reject) => {
    spawn("sips", args, { stdio: "ignore" }).on("close", (c) => (c === 0 ? resolve() : reject(new Error(`sips exited ${c}`))));
  });
}

const auth = await token();
if (!auth) {
  console.error("✖ REPLICATE_API_TOKEN not set (env or .env).");
  process.exit(1);
}
const replicate = new Replicate({ auth });
await mkdir(OUT, { recursive: true });

// Stage reference images (convert webp → jpeg in a temp dir).
const names = (await readdir(REFS)).filter((n) => /\.(jpe?g|png|webp)$/i.test(n));
if (names.length === 0) {
  console.error(`✖ no reference images found in ${REFS}`);
  process.exit(1);
}
const staged = [];
for (const name of names) {
  const src = path.join(REFS, name);
  if (/\.webp$/i.test(name)) {
    const dst = path.join(os.tmpdir(), `lia-ref-${name.replace(/\.webp$/i, "")}.jpeg`);
    await sips(["-s", "format", "jpeg", src, "--out", dst]);
    staged.push(dst);
  } else {
    staged.push(src);
  }
}
console.log(`refs: ${staged.length} image(s) from ${REFS}`);

// Upload refs once via the files API (hosted URLs, no data-URL size limits).
const refUrls = [];
for (const file of staged) {
  const buf = await readFile(file);
  const uploaded = await replicate.files.create(buf, { filename: path.basename(file) });
  refUrls.push(uploaded.urls.get);
}

for (let i = 1; i <= COUNT; i++) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const outPath = path.join(OUT, `lia-explore-${String(i).padStart(2, "0")}-${seed}.webp`);
  try {
    const output = await replicate.run("black-forest-labs/flux-2-pro", {
      input: {
        prompt: PROMPT,
        input_images: refUrls,
        resolution: "0.5 MP",
        aspect_ratio: "1:1",
        output_format: "webp",
        output_quality: 85,
        safety_tolerance: 2,
        seed,
      },
    });
    await writeFile(outPath, output);
    console.log(`✓ ${outPath} (seed ${seed})`);
  } catch (e) {
    console.error(`✖ variant ${i} (seed ${seed}) failed: ${e.message}`);
  }
}
