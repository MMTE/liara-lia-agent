import { withEve } from "eve/next";

// Dev mode (EVE_DEV_ORIGIN set): the eve agent runs STANDALONE (`eve dev`,
// started by dev.sh with the egress-proxy loader) and Next reverse-proxies
// /eve/* and workflow callbacks to it via plain rewrites. This mirrors the
// proven test-eve setup — withEve's in-process relay mishandles proxied
// environments. Production (no EVE_DEV_ORIGIN) uses withEve same-origin.
//
// .mjs (ESM) by design: Liara's next-platform build step rewrites the config
// to inject its standalone settings, and a CommonJS next.config.js cannot
// load under this repo's "type": "module" — liara-cloud/docs uses the same
// .mjs shape on the same platform.
// Deployed builds run on Liara's shared builder: scripts/deploy-agent.mjs
// drops a .liara-build marker into the tarball so we can cheapen the remote
// build (tsc/eslint already gate every local deploy — see deploy flow).
import { existsSync } from "node:fs";
const liteBuild = existsSync(new URL("./.liara-build", import.meta.url));

 const standaloneOrigin = process.env.EVE_DEV_ORIGIN;
const baseConfig = {
  output: "standalone",
  // The docs corpus is read from disk at runtime (src/lib/docs-index.ts uses
  // process.cwd()) — trace it into the standalone server output.
  outputFileTracingIncludes: {
    "/**": ["./src/data/docs-chunks.json"],
  },
  ...(liteBuild && {
    // Liara's shared builder times out on full type-check+lint passes
    // (measured 2026-08-22: >15 min without reaching compile). Quality gates
    // stay local: tsc --noEmit + node --test run before every deploy.
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    experimental: { cpus: 2 },
  }),
};

const standaloneConfig = {
  ...baseConfig,
  async rewrites() {
    return [
      { source: "/eve/:path*", destination: `${standaloneOrigin}/eve/:path*` },
      { source: "/.well-known/workflow/:path*", destination: `${standaloneOrigin}/.well-known/workflow/:path*` },
    ];
  },
};

export default standaloneOrigin ? standaloneConfig : withEve(baseConfig);
