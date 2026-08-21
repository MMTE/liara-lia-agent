import { fetch as undiciFetch, ProxyAgent } from "undici";

// Egress routing by HOST ALLOWLIST: only these hosts go through the proxy
// (OpenRouter is geo-blocked direct; the Vercel Gateway promo needs the eve
// UA rewrite). Everything else — localhost, the eve dev child, workflow
// self-callbacks, and all Liara APIs (Iran-local) — goes direct. An allowlist
// is used deliberately: a localhost *denylist* missed URL forms like [::1]
// and broke withEve's internal relay (empty 400 via proxy).
const PROXY_HOSTS = new Set(["openrouter.ai", "www.openrouter.ai", "ai-gateway.vercel.sh"]);

const proxyUrl = process.env.EVE_EGRESS_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
if (proxyUrl) console.error(`[loader] egress proxy: ${proxyUrl} (hosts: ${[...PROXY_HOSTS].join(", ")})`);

const origFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = (input, init) => {
  let host = "";
  try {
    const url = typeof input === "string" ? input : input?.url ?? "";
    host = url ? new URL(url).hostname : "";
  } catch {
    /* fallthrough */
  }

  if (!proxyAgent || !PROXY_HOSTS.has(host)) return origFetch(input, init);

  // proxied host → undici fetch with explicit dispatcher (+ gateway UA rewrite)
  try {
    const url = typeof input === "string" ? input : input?.url ?? "";
    if (host === "ai-gateway.vercel.sh") {
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
    void url;
  } catch {
    /* never break the call */
  }
  return undiciFetch(input, { ...(init || {}), dispatcher: proxyAgent });
};
