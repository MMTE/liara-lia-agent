#!/usr/bin/env node
/**
 * Generate the "Lia" agent character image via Replicate flux-2-max.
 *
 *   node scripts/generate-lia.mjs
 *
 * Reads REPLICATE_API_TOKEN from the environment, falling back to .env
 * in the repo root. Writes the render to public/lia.png and prints the
 * Replicate delivery URL. Edit PROMPT below to iterate on the design.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Replicate from "replicate";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "public", "lia.png");

// Stylized 3D synthetic mascot — violet-on-dark product palette (globals.css).
// Centered head-and-shoulders framing: the avatar crops to a circle at 190% zoom.
const PROMPT = [
  "Lia, mascot character design: a friendly synthetic AI assistant for a cloud platform,",
  "rendered as a high-end 3D character. Compact rounded robot with a smooth matte graphite",
  "body in deep midnight-blue tones, a softly glowing violet glass face panel with two calm",
  "minimal crescent eyes, thin lavender light seams along the shoulders and chest, small",
  "precise floating hands. Centered head-and-shoulders portrait facing the viewer, head",
  "filling the central third of the frame for use as a circular avatar. Dark studio",
  "background with a soft violet gradient glow and gentle rim light. Calm, competent,",
  "approachable mood; clean cinematic lighting, soft shadows, Pixar-quality character",
  "render, ultra-detailed, premium tech-brand mascot aesthetic, no text.",
].join(" ");

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

const auth = await token();
if (!auth) {
  console.error("✖ REPLICATE_API_TOKEN not set (env or .env). Get one at https://replicate.com/account/api-tokens");
  process.exit(1);
}

console.log("Generating Lia (flux-2-max, 1:1, ~30–90s)…");
try {
  const replicate = new Replicate({ auth });
  const output = await replicate.run("black-forest-labs/flux-2-max", {
    input: {
      prompt: PROMPT,
      resolution: "1 MP",
      aspect_ratio: "1:1",
      output_format: "png",
      safety_tolerance: 2,
    },
  });

  await writeFile(OUT, output);
  const bytes = (await readFile(OUT)).length;
  console.log(`✓ ${OUT} (${(bytes / 1024).toFixed(0)} KB)`);
  console.log(`  url: ${output.url()}`);
} catch (e) {
  console.error(`✖ generation failed: ${e.message}`);
  process.exit(1);
}
