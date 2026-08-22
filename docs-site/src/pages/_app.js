import "@/styles/globals.css";
import "@/styles/fonts.css";
import "@/styles/asciinema.css";
import "@/styles/dark.css";
import "highlight.js/styles/solarized-light.css";

import { MDXProvider } from "@mdx-js/react";

import AskLia from "@/components/AskLia";

// Lia embed (ADR-0008 patch): on every page, render the per-page ask button
// and load the agent's embed.js (bubble + panel). Gated on the build-time
// NEXT_PUBLIC_AGENT_ORIGIN so a plain upstream build stays untouched.
const agentOrigin = process.env.NEXT_PUBLIC_AGENT_ORIGIN || "";

export default function App({ Component, pageProps }) {
  return (
    <MDXProvider>
      <Component {...pageProps} />{" "}
      <AskLia />
      {agentOrigin && (
        <script src={`${agentOrigin}/embed.js`} data-origin={agentOrigin} defer />
      )}
    </MDXProvider>
  );
}
