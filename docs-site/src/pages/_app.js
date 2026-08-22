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
// plain upstream build stays untouched.
const agentOrigin = process.env.NEXT_PUBLIC_AGENT_ORIGIN || "";

export default function App({ Component, pageProps }) {
  return (
    <MDXProvider>
      <Component {...pageProps} />{" "}
      {agentOrigin && (
        <script src={`${agentOrigin}/embed.js`} data-origin={agentOrigin} defer />
      )}
    </MDXProvider>
  );
}
