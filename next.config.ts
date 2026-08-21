import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The docs corpus is read from disk at runtime (src/lib/docs-index.ts uses
  // process.cwd()) — trace it into the standalone server output.
  outputFileTracingIncludes: {
    "/**": ["./src/data/docs-chunks.json"],
  },
};

export default withEve(nextConfig);
