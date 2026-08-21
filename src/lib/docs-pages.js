// src/lib/docs-pages.js
/** Docs reader model derived from the retrieval corpus (no rebuild needed). */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_PATH = join(process.cwd(), "src", "data", "docs-chunks.json");

const PRODUCT_LABELS = {
  overview: "شروع سریع",
  paas: "پلتفرم برنامه (PaaS)",
  dbaas: "پایگاه داده",
  "object-storage": "ذخیره‌سازی ابری",
  ai: "سرویس‌های AI",
  dns: "DNS",
  mail: "ایمیل",
  iaas: "سرور ابری",
  "one-click-apps": "اپ‌های آماده",
  references: "منابع و مراجع",
  "email-server": "سرور ایمیل",
  mirrors: "آینه‌های دانلود",
  "dns-management-system": "مدیریت DNS",
};
const API_REF_LABEL = "مرجع API (API Reference)";

/** @typedef {{route:string,title:string}} NavPage @typedef {{id:string,label:string,pages:NavPage[]}} NavGroup */

let navCache = null;
let pagesCache = null;

function build() {
  if (navCache) return;
  /** @type {{chunks: {slug:string,url:string,title:string,product:string,source:string,text:string}[]}} */
  const corpus = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const bySlug = new Map(); // slug -> {title,url,product,source,texts:[]}
  for (const c of corpus.chunks) {
    let e = bySlug.get(c.slug);
    if (!e) bySlug.set(c.slug, (e = { title: c.title, url: c.url, product: c.product, source: c.source, texts: [] }));
    e.texts.push(c.text);
  }
  const groups = new Map(); // product -> NavPage[] (insertion order)
  for (const [slug, e] of bySlug) {
    const route = slug.startsWith("guides/") ? slug.slice("guides/".length) : slug;
    const key = e.source === "api-ref" ? "api-ref" : e.product;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ route, title: e.title });
  }
  // overview first, api-ref last, others by size desc (stable within)
  const ordered = [...groups.entries()].sort((a, b) => {
    const w = (k) => (k === "overview" ? -1 : k === "api-ref" ? 1 : 0);
    return (w(a[0]) - w(b[0])) || (b[1].length - a[1].length);
  });
  navCache = ordered.map(([id, pages]) => ({
    id,
    label: id === "api-ref" ? API_REF_LABEL : (PRODUCT_LABELS[id] ?? id),
    pages,
  }));
  pagesCache = new Map(); // route -> page
  for (const [slug, e] of bySlug) {
    const route = slug.startsWith("guides/") ? slug.slice("guides/".length) : slug;
    pagesCache.set(route, { route, slug, url: e.url, title: e.title, product: e.product, source: e.source, text: e.texts.join("\n\n") });
  }
}

/** @returns {NavGroup[]} */
export function getNav() {
  build();
  return navCache;
}

/** @param {string} route @returns {{route: string, slug: string, url: string, title: string, product: string, source: string, text: string} | null} */
export function resolvePage(route) {
  build();
  return pagesCache.get(route) ?? null;
}

/** docs.liara.ir URL → in-app route; anything else → null (external). */
export function urlToRoute(url) {
  if (typeof url !== "string") return null;
  const m = url.match(/^https:\/\/docs\.liara\.ir\/(.+?)\/?$/);
  return m ? m[1] : null;
}

export const DEFAULT_ROUTE = (() => {
  build();
  return navCache[0]?.pages[0]?.route ?? "";
})();
