import "@/styles/globals.css";
import "@/styles/fonts.css";
import "@/styles/asciinema.css";
import "@/styles/dark.css";
import "highlight.js/styles/solarized-light.css";

import { MDXProvider } from "@mdx-js/react";

// Lia embed (ADR-0008 patch): on every page, load the agent's embed.js —
// it renders the ✦ bubble + the per-page ask pill beside it (unified in the
// launcher, bottom-left) and the selection ask-bar (highlight text → ask
// Lia about it). Gated on the build-time NEXT_PUBLIC_AGENT_ORIGIN so a
// plain upstream build stays untouched. `?v=` busts browser/edge caches of
// embed.js — set NEXT_PUBLIC_EMBED_V (e.g. git short sha) at build time;
// dev falls back to a per-build timestamp.
const agentOrigin = process.env.NEXT_PUBLIC_AGENT_ORIGIN || "";
const embedV = process.env.NEXT_PUBLIC_EMBED_V || String(Date.now()).slice(-8);

export default function App({ Component, pageProps }) {
  return (
    <MDXProvider>
      <Component {...pageProps} />{" "}
      {agentOrigin && (
        <script src={`${agentOrigin}/embed.js?v=${embedV}`} data-origin={agentOrigin} defer />
      )}
    </MDXProvider>
  );
}
