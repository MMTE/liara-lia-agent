import type { NextConfig } from "next";
import { withEve } from "eve/next";

// Dev mode (EVE_DEV_ORIGIN set): the eve agent runs STANDALONE (`eve dev`,
// started by dev.sh with the egress-proxy loader) and Next reverse-proxies
// /eve/* and workflow callbacks to it via plain rewrites. This mirrors the
// proven test-eve setup — withEve's in-process relay mishandles proxied
// environments. Production (no EVE_DEV_ORIGIN) uses withEve same-origin.
const standaloneOrigin = process.env.EVE_DEV_ORIGIN;

const baseConfig: NextConfig = {
  output: "standalone",
  // The docs corpus is read from disk at runtime (src/lib/docs-index.ts uses
  // process.cwd()) — trace it into the standalone server output.
  outputFileTracingIncludes: {
    "/**": ["./src/data/docs-chunks.json"],
  },
};

const standaloneConfig: NextConfig = {
  ...baseConfig,
  async rewrites() {
    return [
      { source: "/eve/:path*", destination: `${standaloneOrigin}/eve/:path*` },
      { source: "/.well-known/workflow/:path*", destination: `${standaloneOrigin}/.well-known/workflow/:path*` },
    ];
  },
};

export default standaloneOrigin ? standaloneConfig : withEve(baseConfig);
