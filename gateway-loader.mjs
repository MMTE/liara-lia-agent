import { ProxyAgent, setGlobalDispatcher } from "undici";

// GLM-5.2 eve promo (free through Aug 27, 2026) requires:
// 1. User-Agent EXACTLY `eve/<version>` (the AI SDK prepends its own products,
//    which the promo rejects). We rewrite it on gateway calls.
// 2. Reachability from this network — optionally via HTTPS_PROXY (e.g. a local
//    proxy when direct egress is blocked).
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxy) {
  setGlobalDispatcher(new ProxyAgent(proxy));
  console.error(`[loader] egress proxy: ${proxy}`);
}

const origFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  try {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("ai-gateway.vercel.sh")) {
      const h = new Headers(
        init?.headers ??
          (typeof input === "object" && "headers" in input ? input.headers : undefined)
      );
      const before = h.get("user-agent") || "(none)";
      const m = before.match(/eve\/[\w.-]+/);
      if (m && before !== m[0]) {
        h.set("user-agent", m[0]);
        init = { ...(init || {}), headers: h };
      }
    }
  } catch {
    /* never break the call */
  }
  return origFetch(input, init);
};
