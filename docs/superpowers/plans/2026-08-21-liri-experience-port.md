# Liri Experience Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the app from a single chat page into the prototyped two-surface experience — a real docs workspace (`/`) with the floating Liri assistant wired to the live Eve agent, plus (P1) a connected-mode console (`/console`) with proactive incident nudges.

**Architecture:** The prototype (`prototype/`, Vite+mocks) supplies the UI contract; the production app keeps Eve + `useEveAgent` as the only backend. New pure libs derive a docs reader from the existing corpus (`src/data/docs-chunks.json`) and map Eve stream events to the prototype's message union (`trace/answer/clarify/plan`). UI components port from `prototype/src/components/liri/` with scripted `useLiri` replaced by the real event mapper.

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (CSS-first, **no config file**), React 19, eve 0.42, framer-motion (new dep), lucide-react (new dep).

## Global Constraints

- **Deadline: 2026-08-22 15:00.** Tasks 1–8 + 10 are P0 (must ship). Task 9 is P1 — cut cleanly if time runs out; never cut Task 10.
- Persian-first RTL UI (`dir="rtl"`, Vazirmatn via existing layout). All user-facing copy in Persian, technical terms may stay English.
- Tailwind v4: arbitrary values (`text-[11.5px]`, `w-[min(100vw-1.5rem,27.5rem)]`) work; **no `tailwind.config.js` exists — never create one**. Prototype is v3: port classes as-is (all used utilities exist in v4).
- Dark app palette from `src/app/globals.css` vars (`--bg #0b0d14`, `--bg-raised`, `--border`, `--accent #8b7cf6`, `--ok/--warn/--err`). Widget panel uses these vars, **not** the prototype's zinc-950 literals. Docs surface is light (`bg-[#f8f9fb] text-zinc-900`, `color-scheme: light` on its wrapper).
- New pure logic goes in `src/lib/*.js` with JSDoc (codebase convention — `liara-client.js`, `session-store.js`), tested by `node --test tests/*.test.mjs`. No new test framework.
- The agent loop is unchanged: `agent/` (tools, connections, HITL) gets **no behavioral edits** in this plan.
- Rate limiting, session store, usage metering stay as-is; reuse `meterTurn` (extracted, not duplicated).
- Commits: conventional style (`feat:`, `fix:`, `docs:`), one per task. Never commit `.env*`, `.eve/`, `prototype/node_modules`.
- Chat history persists in localStorage under `"liara-agent-chat"` (existing key — shared by `/chat` and the widget so conversations continue across surfaces).

## Source-of-truth references (read before porting)

- Prototype components: `prototype/src/components/liri/*.tsx`, `prototype/src/components/docs/*.tsx`, `prototype/src/types/agent.ts` (message union), `prototype/src/App.tsx` (context + request-nonce pattern).
- Event shapes already parsed in prod: `src/components/Chat.tsx:34-59` (`pendingHitl` — `part.type === "dynamic-tool"`, `part.state === "approval-requested"`, `part.toolMetadata.eve.inputRequest.{requestId,kind,prompt,options}`) and `src/components/Message.tsx:34-64` (`extractCitations` from `search_docs` outputs, `extractTools`).
- Real tool names (from `agent/connections/*.ts` allow-lists): `search_docs`, `read_doc`, `getApps`, `getAppByName`, `getAppLogs`, `getAppEvents`, `getAppReleases`, `getAppCpuReports`, `getAppMemoryReports`, `getAppSummaryReports`, `restartApp`, `updateEnvs`, `releasesDeploy`, `getListDatabases`, `getDatabase`. Match by substring (`part.toolName.includes(name)`) — connection prefixes are not guaranteed.
- Corpus chunk shape (`src/lib/docs-index.ts`): `{id, slug, url, title, product, source, text}`; guides slugs are `guides/<path>` (url `https://docs.liara.ir/<path>`), api-ref slugs are `api-ref/<path>` (url `https://developers.liara.ir/<path>`).

---

## Phase A — Docs workspace (P0)

### Task 1: Corpus page/nav library — `src/lib/docs-pages.js`

**Files:**
- Create: `src/lib/docs-pages.js`
- Test: `tests/docs-pages.test.mjs`

**Interfaces:**
- Consumes: `src/data/docs-chunks.json` (via `readFileSync`, same pattern as `src/lib/docs-index.ts:33`).
- Produces (all named exports, used by Tasks 2, 3, 8):
  - `getNav(): NavGroup[]` where `NavGroup = {id: string, label: string, pages: {route: string, title: string}[]}`
  - `resolvePage(route: string): Page | null` where `Page = {route, slug, url, title, product, source, text}` (`text` = chunks joined by `\n\n`, corpus order)
  - `urlToRoute(url: string): string | null` (docs.liara.ir URL → route; other hosts → null)
  - `DEFAULT_ROUTE: string` (first overview page)

- [ ] **Step 1: Write the failing test**

```js
// tests/docs-pages.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getNav, resolvePage, urlToRoute, DEFAULT_ROUTE,
} from "../src/lib/docs-pages.js";

test("nav has grouped products with non-empty pages", () => {
  const nav = getNav();
  assert.ok(nav.length >= 5, `expected >=5 groups, got ${nav.length}`);
  for (const g of nav) {
    assert.match(g.id, /^[\w-]+$/);
    assert.ok(g.label.length > 0);
    assert.ok(g.pages.length > 0);
    for (const p of g.pages) assert.ok(p.route && p.title);
  }
  assert.equal(nav.at(-1).id, "api-ref");
});

test("resolvePage round-trips a guides route", () => {
  const nav = getNav();
  const some = nav[0].pages[0].route;
  const page = resolvePage(some);
  assert.ok(page);
  assert.equal(page.route, some);
  assert.ok(page.text.length > 200);
  assert.ok(page.url.startsWith("https://docs.liara.ir/"));
});

test("resolvePage returns null for unknown route", () => {
  assert.equal(resolvePage("no/such/page"), null);
});

test("urlToRoute maps docs.liara.ir urls, rejects others", () => {
  assert.equal(urlToRoute("https://docs.liara.ir/paas/nodejs"), "paas/nodejs");
  assert.equal(urlToRoute("https://developers.liara.ir/x"), null);
});

test("DEFAULT_ROUTE resolves", () => {
  assert.ok(resolvePage(DEFAULT_ROUTE));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/docs-pages.test.mjs`
Expected: FAIL — `Cannot find module '../src/lib/docs-pages.js'`

- [ ] **Step 3: Implement**

```js
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

/** @param {string} route @returns {ReturnType<Object> | null} */
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/docs-pages.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/docs-pages.js tests/docs-pages.test.mjs
git commit -m "feat: docs page/nav model derived from corpus chunks"
```

---

### Task 2: Docs API routes

**Files:**
- Create: `src/app/api/docs/nav/route.ts`, `src/app/api/docs/page/route.ts`, `src/app/api/docs/search/route.ts`

**Interfaces:**
- Consumes: `getNav/resolvePage` (Task 1), `searchDocs` from `src/lib/docs-index.ts`.
- Produces (for Tasks 3, 4):
  - `GET /api/docs/nav` → `NavGroup[]`
  - `GET /api/docs/page?route=paas/nodejs` → `Page` | `404 {error}`
  - `GET /api/docs/search?q=دیپلوی&k=8` → `{results: {title, url, route, source, snippet}[]}` (`route` via `urlToRoute`, null for api-ref)

- [ ] **Step 1: Implement the three routes**

```ts
// src/app/api/docs/nav/route.ts
import { NextResponse } from "next/server";
import { getNav } from "@/lib/docs-pages.js";
export function GET() {
  return NextResponse.json(getNav());
}
```

```ts
// src/app/api/docs/page/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { resolvePage } from "@/lib/docs-pages.js";
export function GET(request: NextRequest) {
  const route = request.nextUrl.searchParams.get("route") ?? "";
  const page = resolvePage(route);
  if (!page) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(page);
}
```

```ts
// src/app/api/docs/search/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { searchDocs } from "@/lib/docs-index";
import { urlToRoute } from "@/lib/docs-pages.js";
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const hits = await searchDocs(q, 8);
  return NextResponse.json({
    results: hits.map((h) => ({ ...h, route: urlToRoute(h.url) })),
  });
}
```

- [ ] **Step 2: Verify against the dev server**

Run (dev server up via `npm run dev` in another terminal, port 3000):
`curl -s localhost:3000/api/docs/nav | head -c 300`
Expected: JSON array starting with `{"id":"overview","label":"شروع سریع",...`

`curl -s 'localhost:3000/api/docs/search?q=دیپلوی' | head -c 400`
Expected: `{"results":[{"title":...,"route":"..."}]}`

`curl -s -o /dev/null -w '%{http_code}' 'localhost:3000/api/docs/page?route=zzz'`
Expected: `404`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/docs
git commit -m "feat: docs nav/page/search API routes"
```

---

### Task 3: Docs reader UI at `/` and `/docs/[...slug]`

**Files:**
- Create: `src/components/docs/DocsShell.tsx` (client: sidebar open state, ⌘K binding placeholder — SearchDialog lands in Task 4), `src/components/docs/DocsSidebar.tsx`, `src/components/docs/ArticleView.tsx`, `src/components/CodeBlock.tsx` (extracted from `src/components/Message.tsx:73-93`, exported for reuse)
- Create: `src/app/docs/[...slug]/page.tsx` (server)
- Modify: `src/app/page.tsx` (server — render DocsShell with `DEFAULT_ROUTE` page), `src/components/Message.tsx` (import shared CodeBlock, delete inline copy)

**Interfaces:**
- Consumes: Task 1 lib (server-side — no HTTP), prototype markup (`prototype/src/components/docs/*.tsx` for visual language), `SCENARIOS` not needed yet.
- Produces: `<DocsShell nav={NavGroup[]} page={Page} />` — Task 7 mounts `LiriWidget` inside DocsShell; Task 4 mounts `SearchDialog`. ArticleView exposes an `onAsk?: (prompt: string) => void` prop rendered as «پرسیدن از لیری درباره این صفحه» button (no-op until Task 7 wires it).

- [ ] **Step 1: Extract shared CodeBlock**

Move the `CodeBlock` component (`src/components/Message.tsx:73-93`) verbatim into `src/components/CodeBlock.tsx` with `export default` + `export function extractText`. In `Message.tsx` replace with `import CodeBlock from "./CodeBlock"`. Verify `npm run build` still passes (catches the `as never` component typing).

- [ ] **Step 2: Port DocsSidebar + ArticleView from prototype**

Adapt `prototype/src/components/docs/DocsSidebar.tsx` and `ArticleView.tsx`:
- Props: sidebar gets `nav: NavGroup[]`, `currentRoute: string`, `onNavigate(route)`, `onClose?()` (mobile drawer). Group headers use `NavGroup.label`; active page highlighted (`text-violet-700 bg-violet-50` prototype style).
- ArticleView props: `{page: Page, onAsk?: (prompt: string) => void}`. Render `page.title` as H1, `ReactMarkdown` (remarkGfm + rehypeHighlight, `pre: CodeBlock`) for `page.text`, LTR code via existing globals. Footer: source link (`page.url`, target `_blank`), button «پرسیدن از لیری درباره این صفحه» calling `onAsk?.('درباره «${page.title}» توضیح بده')`. api-ref pages: banner «این صفحه از مرجع API انگلیسی است».
- Light theme wrapper: `<div dir="rtl" style={{colorScheme:"light"}} className="min-h-screen bg-[#f8f9fb] text-zinc-900">`.

- [ ] **Step 3: DocsShell (client) + routes (server)**

DocsShell: port `prototype/src/components/docs/DocsHeader.tsx` — logo «مستندات لیارا», nav links (راهنما → first overview page, پلتفرم برنامه, پایگاه داده, مرجع API → jump to group top), search button «جست‌وجو یا پرسش از لیری… ⌘K» (disabled placeholder; Task 4 replaces), GitHub link to `liara-cloud/docs`. Layout: `flex` header + `mx-auto max-w-[1400px]` with sidebar `hidden lg:block w-64` and article flex-1; mobile: hamburger toggling sidebar as fixed drawer. Store sidebar state locally; use `useRouter` for navigation (`router.push('/docs/'+route)`).

```tsx
// src/app/page.tsx  (server)
import DocsShell from "@/components/docs/DocsShell";
import { DEFAULT_ROUTE, getNav, resolvePage } from "@/lib/docs-pages.js";
export default function Home() {
  const page = resolvePage(DEFAULT_ROUTE)!;
  return <DocsShell nav={getNav()} page={page} />;
}
```

```tsx
// src/app/docs/[...slug]/page.tsx  (server)
import { notFound } from "next/navigation";
import DocsShell from "@/components/docs/DocsShell";
import { getNav, resolvePage } from "@/lib/docs-pages.js";
export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = resolvePage((slug ?? []).join("/"));
  if (!page) notFound();
  return <DocsShell nav={getNav()} page={page} />;
}
```

- [ ] **Step 4: Browser verification**

`npm run dev`, then in a browser: `/` renders light docs page with sidebar; click a sidebar page → `/docs/...` renders; narrow viewport → hamburger drawer works; code blocks show «کپی» on hover. Screenshot for the task log.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/docs src/components/docs src/components/CodeBlock.tsx src/components/Message.tsx
git commit -m "feat: docs workspace surface at / and /docs/[...slug]"
```

---

### Task 4: Docs-site fork — vendor + bring up (ADR-0008)

**Files:**
- Create: `docs-site/` (vendored copy of `github.com/liara-cloud/docs` @ upstream HEAD, no `.git`), `docs-site/PATCHES.md`, `scripts/sync-docs-site.mjs`
- Modify: `.gitignore` (`docs-site/node_modules/`, `docs-site/out/`, `docs-site/.next/`), `tsconfig.json` (exclude `"prototype"` — pre-existing tsc breakage, folded here from Task 3)

**Interfaces:**
- Consumes: upstream repo (already cloned at `/tmp/liara-docs`; re-clone if missing: `git clone --depth 1 https://github.com/liara-cloud/docs`).
- Produces (for Tasks 8, 10):
  - `docs-site/` buildable: `cd docs-site && yarn install && yarn build` → static export in `docs-site/out/` (their `next.config.mjs` sets `output: "export"`, `trailingSlash: true`).
  - `scripts/sync-docs-site.mjs`: re-syncs upstream (`git clone --depth 1` to temp, rsync over `docs-site/` excluding `node_modules/.next/out`), then fails loudly listing PATCHES.md entries that no longer apply.
  - `PATCHES.md`: numbered list of every intentional diff vs upstream (starts with just the vendoring note; Task 8 appends the `_app.jsx` embed patch).

- [ ] **Step 1: Vendor the fork**

Copy `/tmp/liara-docs` → `docs-site/` excluding `.git`. Write `PATCHES.md` header: upstream URL, synced commit SHA (`git -C /tmp/liara-docs rev-parse HEAD`), patch list (initially «none»). Add the three `.gitignore` entries and the `tsconfig.json` prototype exclude. Verify `npm run build` (agent app) is now clean — this closes Task 3's deferred concern.

- [ ] **Step 2: Bring it up**

`cd docs-site && yarn install && yarn build` (their build runs `sitemap` + `fetch:models` scripts; if `fetch:models` needs network/keys and fails, record the failure and make it non-fatal the way their repo intends — check `src/scripts/fetch-liara-ai-models.js` — rather than skipping `yarn build`). Verify `docs-site/out/index.html` exists plus a Persian page (e.g. `out/paas/nodejs/index.html` or nearest real path from the sitemap output). Serve: `npx --yes serve docs-site/out -l 3002` (background) → `curl -s localhost:3002/ | head -c 200` returns their HTML.

- [ ] **Step 3: Record integration facts in PATCHES.md**

Investigate and record (facts Task 8 depends on): (a) does Header search (Meilisearch client in `src/components/Header/index.jsx`) work without credentials against their public instance, or does it fail silently? (b) are fonts/images self-contained in `out/` or fetched from liara.ir CDNs? (c) export page count (`find docs-site/out -name index.html | wc -l`). No code changes in this step.

- [ ] **Step 4: Commit**

```bash
git add docs-site scripts/sync-docs-site.mjs .gitignore tsconfig.json
git commit -m "feat: vendor liara-cloud/docs fork as presentation layer (ADR-0008)"
```

**Scope note (deliberate cut):** the previously planned ⌘K SearchDialog for the in-app reader is dropped — the docs fork ships Liara's own search, and the in-app reader is demoted to fallback (ADR-0008 §5). Recorded, not silently dropped.

---

## Phase B — Liri widget on the real agent (P0)

### Task 5: Event mapper — `src/lib/liri-events.js`

**Files:**
- Create: `src/lib/liri-events.js`
- Test: `tests/liri-events.test.mjs`

**Interfaces:**
- Consumes: raw eve message objects `{id, role, parts: unknown[]}` (shapes per `Chat.tsx:34-59` / `Message.tsx:34-64`).
- Produces (used by Task 7):
  - `TOOL_META`: `{toolName: {label: string, kind: "read"|"docs"|"write"}}`
  - `mapConversation(messages): LiriMessage[]` where
```ts
type LiriMessage =
  | {id: string; kind: "user"; text: string}
  | {id: string; kind: "trace"; variant: "inspect" | "verify"; steps: TraceStep[]}
  | {id: string; kind: "answer"; text: string; citations: {title: string; url: string; route: string | null}[]}
  | {id: string; kind: "clarify"; requestId: string; question: string; options: {id: string; label: string}[]; answered: string | null}
  | {id: string; kind: "plan"; requestId: string; summary: string; changes: {tool: string; label: string; risk: "caution" | "safe"; detail: string}[]; options: {id: string; label: string}[]; status: "pending" | "approved" | "rejected"};
type TraceStep = {tool: string; label: string; kind: "read" | "docs" | "write"; state: "active" | "done"; result: string};
```
  - `summarizeOutput(toolName: string, output: unknown): string`

- [ ] **Step 1: Write the failing test**

```js
// tests/liri-events.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapConversation, TOOL_META, summarizeOutput } from "../src/lib/liri-events.js";

const userMsg = (text) => ({ id: "u1", role: "user", parts: [{ type: "text", text }] });
const agentMsg = (parts) => ({ id: "a1", role: "assistant", parts });

test("user message maps to user kind", () => {
  const out = mapConversation([userMsg("سلام")]);
  assert.equal(out[0].kind, "user");
  assert.equal(out[0].text, "سلام");
});

test("tool parts become a trace with labels and results", () => {
  const out = mapConversation([
    userMsg("q"),
    agentMsg([
      { type: "dynamic-tool", toolName: "search_docs", state: "output-available",
        output: { resultCount: 2, results: [{ title: "استقرار Node.js", url: "https://docs.liara.ir/paas/nodejs" }] } },
      { type: "dynamic-tool", toolName: "read_doc", state: "running", input: { slug: "guides/paas/nodejs" } },
      { type: "text", text: "پاسخ" },
    ]),
  ]);
  const trace = out.find((m) => m.kind === "trace");
  assert.equal(trace.steps.length, 2);
  assert.equal(trace.steps[0].label, TOOL_META["search_docs"].label);
  assert.equal(trace.steps[0].state, "done");
  assert.equal(trace.steps[1].state, "active");
  assert.ok(trace.steps[0].result.includes("۲"));
  const answer = out.find((m) => m.kind === "answer");
  assert.equal(answer.text, "پاسخ");
  assert.equal(answer.citations[0].route, "paas/nodejs");
});

test("approval-requested becomes a pending plan with write-tool change", () => {
  const out = mapConversation([
    agentMsg([
      { type: "dynamic-tool", toolName: "updateEnvs", state: "approval-requested",
        input: { name: "my-api", env: { NODE_OPTIONS: "--max-old-space-size=512" } },
        toolMetadata: { eve: { inputRequest: { requestId: "r1", kind: "tool-approval",
          prompt: "افزودن متغیر محیطی NODE_OPTIONS به my-api", options: [{ id: "yes", label: "تأیید" }, { id: "no", label: "انصراف" }] } } } },
    ]),
  ]);
  const plan = out.find((m) => m.kind === "plan");
  assert.equal(plan.status, "pending");
  assert.equal(plan.changes[0].risk, "caution");
  assert.ok(plan.changes[0].detail.includes("NODE_OPTIONS"));
});

test("approved plan flips status and later traces become verify variant", () => {
  const out = mapConversation([
    agentMsg([{ type: "dynamic-tool", toolName: "updateEnvs", state: "output-available", input: { name: "x", env: {} },
      toolMetadata: { eve: { inputRequest: { requestId: "r1", kind: "tool-approval", prompt: "p", options: [] } } } }]),
    agentMsg([{ type: "dynamic-tool", toolName: "getAppReleases", state: "output-available" }]),
  ]);
  assert.equal(out.find((m) => m.kind === "plan").status, "approved");
  const traces = out.filter((m) => m.kind === "trace");
  assert.equal(traces.at(-1).variant, "verify");
});

test("ask-question hitl becomes clarify", () => {
  const out = mapConversation([
    agentMsg([{ type: "dynamic-tool", toolName: "ask_question", state: "approval-requested",
      toolMetadata: { eve: { inputRequest: { requestId: "r2", kind: "ask-question",
        prompt: "کدام برنامه؟", options: [{ id: "a", label: "my-api" }] } } } }]),
  ]);
  const c = out.find((m) => m.kind === "clarify");
  assert.equal(c.question, "کدام برنامه؟");
  assert.equal(c.options[0].label, "my-api");
});

test("summarizeOutput handles known and unknown shapes", () => {
  assert.ok(summarizeOutput("getApps", { projects: [{}, {}] }).includes("۲"));
  assert.equal(summarizeOutput("unknown_tool", { foo: 1 }), "");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/liri-events.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```js
// src/lib/liri-events.js
/** Maps eve stream messages to the Liri UI message union (prototype/src/types/agent.ts). */

export const TOOL_META = {
  search_docs: { label: "جست‌وجو در مستندات لیارا", kind: "docs" },
  read_doc: { label: "خواندن سند کامل", kind: "docs" },
  getApps: { label: "دریافت فهرست برنامه‌ها", kind: "read" },
  getAppByName: { label: "خواندن وضعیت برنامه", kind: "read" },
  getAppLogs: { label: "خواندن لاگ‌های برنامه", kind: "read" },
  getAppEvents: { label: "خواندن رویدادهای برنامه", kind: "read" },
  getAppReleases: { label: "بررسی تاریخچه استقرار", kind: "read" },
  getAppCpuReports: { label: "گزارش CPU", kind: "read" },
  getAppMemoryReports: { label: "گزارش حافظه", kind: "read" },
  getAppSummaryReports: { label: "خلاصه متریک‌ها", kind: "read" },
  restartApp: { label: "ری‌استارت برنامه", kind: "write" },
  updateEnvs: { label: "تغییر متغیرهای محیطی", kind: "write" },
  releasesDeploy: { label: "استقرار دوباره", kind: "write" },
  getListDatabases: { label: "دریافت فهرست دیتابیس‌ها", kind: "read" },
  getDatabase: { label: "خواندن وضعیت دیتابیس", kind: "read" },
};

const faNum = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const isObj = (v) => typeof v === "object" && v !== null;

function metaFor(toolName) {
  for (const [key, meta] of Object.entries(TOOL_META)) if (toolName.includes(key)) return { key, ...meta };
  return { key: toolName, label: toolName, kind: "read" };
}

export function summarizeOutput(toolName, output) {
  if (!isObj(output)) return "";
  const o = isObj(output.output) ? output.output : isObj(output.result) ? output.result : output;
  const first = Array.isArray(o.results) && o.results[0];
  if (toolName.includes("search_docs")) return `${faNum(o.resultCount ?? (o.results?.length ?? 0))} نتیجه${first?.title ? " — " + first.title : ""}`;
  if (toolName.includes("read_doc")) return String(o.slug ?? "");
  if (toolName.includes("getApps")) return `${faNum(o.projects?.length ?? 0)} برنامه`;
  if (toolName.includes("getAppLogs")) return `${faNum(String(o.text ?? o.logs ?? "").split("\n").filter(Boolean).length)} خط لاگ`;
  if (toolName.includes("Databases") && Array.isArray(o.databases)) return `${faNum(o.databases.length)} دیتابیس`;
  for (const v of Object.values(o)) if (typeof v === "string" && v.length <= 80) return v;
  return "";
}

function inputDetail(toolName, input) {
  if (!isObj(input)) return "";
  if (toolName.includes("updateEnvs") && isObj(input.env)) {
    return Object.entries(input.env).map(([k, v]) => `${k} = ${String(v).slice(0, 60)}`).join(" · ");
  }
  const name = input.name ?? input.projectName ?? input.app;
  if (name) return `برنامه ${name}`;
  const s = JSON.stringify(input);
  return s && s.length > 2 ? s.slice(0, 80) : "";
}

function partsText(parts) {
  return parts.filter(isObj).filter((p) => p.type === "text" && typeof p.text === "string").map((p) => p.text).join("\n\n");
}

function citationsFrom(toolParts) {
  const out = [], seen = new Set();
  for (const p of toolParts) {
    if (!String(p.toolName ?? "").includes("search_docs")) continue;
    const carrier = isObj(p.output) ? p.output : isObj(p.result) ? p.result : null;
    for (const r of (carrier && Array.isArray(carrier.results) ? carrier.results : []).filter(isObj)) {
      if (typeof r.url !== "string" || seen.has(r.url)) continue;
      seen.add(r.url);
      const m = r.url.match(/^https:\/\/docs\.liara\.ir\/(.+?)\/?$/);
      out.push({ title: String(r.title ?? r.url), url: r.url, route: m ? m[1] : null });
    }
  }
  return out.slice(0, 8);
}

export function mapConversation(messages) {
  const out = [];
  let verifyMode = false;
  for (const m of messages ?? []) {
    if (!isObj(m) || !Array.isArray(m.parts)) continue;
    if (m.role === "user") { out.push({ id: m.id, kind: "user", text: partsText(m.parts) }); continue; }
    const parts = m.parts.filter(isObj);
    const tools = parts.filter((p) => p.type === "dynamic-tool");
    if (tools.length) {
      out.push({
        id: `${m.id}-trace`, kind: "trace", variant: verifyMode ? "verify" : "inspect",
        steps: tools.map((p) => {
          const meta = metaFor(String(p.toolName ?? ""));
          const state = p.state === "output-available" || p.state === "error" || String(p.state).includes("reject") ? "done" : "active";
          const result = p.state === "output-available" ? summarizeOutput(String(p.toolName ?? ""), isObj(p.output) ? p.output : p.result) : "";
          return { tool: meta.key, label: meta.label, kind: meta.kind, state, result };
        }),
      });
    }
    for (const p of tools) {
      if (p.state !== "approval-requested") continue;
      const req = p.toolMetadata?.eve?.inputRequest;
      if (!isObj(req) || typeof req.requestId !== "string") continue;
      const meta = metaFor(String(p.toolName ?? ""));
      const options = (Array.isArray(req.options) ? req.options : []).filter(isObj)
        .map((o) => ({ id: String(o.id), label: String(o.label ?? o.id) }));
      const question = String(req.prompt ?? "");
      if (String(req.kind) === "tool-approval") {
        out.push({
          id: `${m.id}-plan-${req.requestId}`, kind: "plan", requestId: req.requestId,
          summary: question,
          changes: [{ tool: meta.key, label: meta.label, risk: meta.kind === "write" ? "caution" : "safe", detail: inputDetail(meta.key, p.input) }],
          options, status: "pending",
        });
      } else {
        out.push({ id: `${m.id}-clarify-${req.requestId}`, kind: "clarify", requestId: req.requestId, question, options, answered: null });
      }
    }
    // resolution pass: an approval part that moved past 'approval-requested' marks plans answered
    for (const p of tools) {
      if (p.state === "approval-requested" || !isObj(p.toolMetadata?.eve?.inputRequest)) continue;
      const rid = p.toolMetadata.eve.inputRequest.requestId;
      const st = String(p.state);
      for (const msg of out) {
        if (msg.kind !== "plan" || msg.requestId !== rid) continue;
        msg.status = st.includes("reject") ? "rejected" : "approved";
        verifyMode = msg.status === "approved";
      }
      if (st.includes("reject")) verifyMode = false;
    }
    const text = partsText(m.parts);
    const citations = citationsFrom(tools);
    if (text || citations.length) out.push({ id: `${m.id}-answer`, kind: "answer", text, citations });
  }
  return out;
}
```

Note: the resolution pass above sets `verifyMode` before the answer is pushed — traces in *later* messages get `variant: "verify"`. If eve reports rejection states differently in practice, inspect a live stream (`window.__dbgFinish` in Chat.tsx already dumps events) and adjust the state-name tests — behavior contract stays.

- [ ] **Step 4: Run tests**

Run: `node --test tests/liri-events.test.mjs`
Expected: PASS (6 tests). Then `node --test` — whole suite green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/liri-events.js tests/liri-events.test.mjs
git commit -m "feat: eve event → Liri message mapper with tool labels"
```

---

### Task 6: Dependencies, mascot asset, shared client bits

**Files:**
- Modify: `package.json` (+`framer-motion`, +`lucide-react`), `src/components/Chat.tsx` (use extracted meter)
- Create: `src/lib/turn-meter.js` (moved from `Chat.tsx:100-134`), `public/liri.jpg` (copy of `prototype/public/fc3580b9-8c51-4b1d-958c-23c730603997.jpg`)

**Interfaces:**
- Produces: `export function meterTurn(events: unknown[], status: string): void` (identical behavior; used by Chat **and** LiriWidget), `export const STORAGE_KEY = "liara-agent-chat"`.

- [ ] **Step 1: Install deps + copy asset**

```bash
npm i framer-motion@^11.18.2 lucide-react@^0.522.0
cp prototype/public/fc3580b9-8c51-4b1d-958c-23c730603997.jpg public/liri.jpg
```

- [ ] **Step 2: Extract turn meter**

Move `meterTurn` + `isObj` helper from `Chat.tsx:100-134` into `src/lib/turn-meter.js` (add `STORAGE_KEY` export; move `const STORAGE_KEY` too). Update `Chat.tsx` imports. Run `node --test` (unchanged) and `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json public/liri.jpg src/lib/turn-meter.js src/components/Chat.tsx
git commit -m "chore: framer-motion + lucide deps, mascot asset, shared turn meter"
```

---

### Task 7: Liri widget components port

**Files:**
- Create: `src/components/liri/LiriWidget.tsx`, `LiriPanel.tsx`, `Mascot.tsx`, `HomeState.tsx`, `ToolTrace.tsx`, `AnswerCard.tsx`, `ClarifyCard.tsx`, `PlanCard.tsx`, `ActivityView.tsx`, `useLiriAgent.ts`

**Interfaces:**
- Consumes: `mapConversation` (Task 5), `useEveAgent` from `eve/react`, `STORAGE_KEY/meterTurn` (Task 6), `SCENARIOS` from `src/lib/scenarios.ts`, `ConnectPanel`, `UsageMeter`, `CodeBlock` (Task 3), `urlToRoute`-style link handling.
- Produces: `<LiriWidget surface={"docs"|"console"} scopeLabel resource? detail? state? request? onNavigate? />` where `request = {text: string, nonce: number}` (prototype's nonce pattern). Used by Task 8 (docs) and Task 9 (console).

- [ ] **Step 1: `useLiriAgent` hook** (`src/components/liri/useLiriAgent.ts`)

Thin adapter over `useEveAgent` (mirror `Chat.tsx:155-205`): `initialEvents/initialSession` from localStorage under `STORAGE_KEY`, `onFinish` persists + calls `meterTurn`. Returns `{messages: LiriMessage[] (useMemo(mapConversation)), status, isBusy, error, ask(text), respond(requestId, optionId), cancel, reset}`. `reset` clears localStorage and calls agent's new-conversation path (mirror the existing «گفت‌وگوی جدید» behavior if present in eve react API; otherwise reload state by key remount — implement as `location.reload()` fallback is NOT acceptable; use eve's session reset if exposed, else hide the button).

- [ ] **Step 2: Port presentational cards**

Port from `prototype/src/components/liri/` adapting per these rules:
- Colors: prototype zinc literals → palette vars (`bg-zinc-950` → `bg-[var(--bg-raised)]`, `border-white/10` → `border-[var(--border)]`, text zinc-100/400 → `var(--text)`/`var(--text-dim)`). Keep rounded-3xl panel, framer-motion transitions.
- `Mascot.tsx`: swap `/fc3580b9-*.jpg` → `/liri.jpg`; keep mood rings (idle/thinking/warning/success → derive: busy→thinking, pending plan→warning, last trace verify done→success, else idle).
- `ToolTrace.tsx`: props `{title: string, steps: TraceStep[], variant}` — port step rows (label + `code` tool name + kind chip «خواندن»/«مستندات»/«نوشتن», result line, spinner→check by `state`). Title: variant inspect → «مراحل بررسی», verify → «اجرا و راستی‌آزمایی». Active step = last with `state:"active"`.
- `AnswerCard.tsx`: `{text, citations, streaming}` — ReactMarkdown (remarkGfm, rehypeHighlight, `pre: CodeBlock`), citations footer «منابع از مستندات لیارا»: each citation a button — `route` ? internal navigate (`onNavigate(route)`) : external `<a target="_blank">`. `streaming` → blinking caret.
- `ClarifyCard.tsx` + `PlanCard.tsx`: port structure; ClarifyCard `{question, options, answered?, onAnswer(optionId)}`; PlanCard `{summary, changes, options, status, onAnswer}` — change rows: numbered, label, risk badge («نیازمند تأیید» caution / «بی‌خطر» safe), `detail` in LTR mono, footer note «هیچ عملیات مخربی انجام نمی‌شود؛ تغییرات فقط با تأیید شما اجرا می‌شوند.». Buttons from `options` (approve/reject by label regex like `Chat.tsx:76`). status approved/rejected → collapsed badge, buttons hidden.
- `HomeState.tsx`: greeting «سلام! من لیری هستم» + context line (scopeLabel/resource/detail) + quick-action grid from `SCENARIOS.slice(0, 6)` → `onAsk(s.promptFa)`.
- `ActivityView.tsx`: flatten all `trace` messages' steps (newest first) — label, tool chip, kind icon; «—» for time (not tracked).
- `LiriPanel.tsx`: port shell — header (Mascot, «لیری» + subtitle by surface, chat/activity tablist, reset + close), context strip (`scopeLabel · resource · state` with ok/failed dot), message list rendering mapped LiriMessages (user bubble, trace→ToolTrace, answer→AnswerCard, clarify→ClarifyCard, plan→PlanCard), error banner (port `Chat.tsx:260-264`), composer (textarea auto-grow, Enter send, «توقف» while busy), footer: `UsageMeter` + disclaimer «پاسخ‌ها از مستندات رسمی لیارا ساخته می‌شوند. تغییرات فقط با تأیید شما اجرا می‌شوند.». `onNavigate` required for citations.
- [ ] **Step 3: `LiriWidget.tsx`** — port `prototype/src/components/liri/Liri.tsx` bubble/nudge/AnimatePresence logic: fixed `bottom-5 left-5 z-50` (RTL: use physical `left` like prototype), collapsed Mascot button «گفت‌وگو با لیری», opens panel; `request.nonce` effect opens + `ask(request.text)`; `nudge?: {text, cta}` prop with 4s delayed show + dismiss (console surface passes it in Task 9). Owns `useLiriAgent`; passes everything down.

- [ ] **Step 4: Unit + type check**

Run: `npm run build` — no type errors across new components.

- [ ] **Step 5: Commit**

```bash
git add src/components/liri
git commit -m "feat: Liri widget components on real eve events"
```

---

### Task 8: Embed wiring — Liri inside the docs fork (ADR-0008)

**Files:**
- Create: `public/embed.js` (agent origin; vanilla JS, no build step), `src/app/chat/page.tsx` (moved current home)
- Modify: `docs-site/src/pages/_app.jsx` (create — upstream has none; loads embed.js), `docs-site/PATCHES.md` (append patch entry), `src/components/liri/LiriPanel.tsx` or `AnswerCard.tsx` citation handler (Task 7 output) for docs-site deep links

**Interfaces:**
- Consumes: `LiriWidget` (Task 7) mounted at `/chat` (full-page, `?embed=1` compact), `docs-site/` build (Task 4), extension (unchanged).
- Produces:
  - `embed.js`: self-configuring loader — reads `document.currentScript.dataset.origin` (default same-origin), injects fixed RTL bubble («✦ لیری») bottom-left + iframe panel `<origin>/chat?embed=1`, Escape/click-outside closes, inline styles only (must render inside the docs fork's Tailwind scope without depending on it).
  - `docs-site` patch: `_app.jsx` renders `<script src="${process.env.NEXT_PUBLIC_AGENT_ORIGIN || "https://liara-agent.iran.liara.ir"}/embed.js" data-origin={...} defer />`.
  - Citations with `route` ALWAYS open `${process.env.NEXT_PUBLIC_DOCS_SITE_ORIGIN}/${route}` — the fork is the only docs surface (ADR-0008 §5, product-owner ruling: no fallback branch to the in-app reader).

- [ ] **Step 1: Move chat to `/chat`; `/` becomes a backend landing**

`src/app/chat/page.tsx` = old `src/app/page.tsx` content; the widget mounts full-page there (`?embed=1` keeps compact chrome). The in-app reader was already deleted (user directive, executed as Task 4.5) — `/` is a redirect to `/chat` (server `redirect()`), the backend app's face. Nothing docs-related lives on the agent app.

- [ ] **Step 2: Write `public/embed.js` + docs-site patch**

Port the injection logic from `extension/content.js` (bubble/panel/iframe/close) into `public/embed.js` with: RTL-aware positioning (`left: 20px; bottom: 20px`), a Liri-branded bubble (mascot `public/liri.jpg` from agent origin, 52px round, shadow), panel `width: min(420px, calc(100vw - 24px)); height: min(660px, 78vh)`, `iframe.src = origin + "/chat?embed=1"`. Create `docs-site/src/pages/_app.jsx` (`export default function App({ Component, pageProps })` + the script tag + `<Component {...pageProps} />`); append the patch entry to `PATCHES.md`.

- [ ] **Step 3: Citation deep links**

AnswerCard citation clicks and the Chat UI's existing `Citations` component → `window.open(docsSiteOrigin + "/" + route, "_blank")` with `docsSiteOrigin = process.env.NEXT_PUBLIC_DOCS_SITE_ORIGIN` (required env for this behavior; if unset, render citations as plain external links to `citation.url` — never route to the in-app reader).

- [ ] **Step 4: End-to-end verification (P0 gate)**

Agent dev on :3000 (already running); rebuild docs-site with `NEXT_PUBLIC_AGENT_ORIGIN=http://localhost:3000 yarn build` and serve `out/` on :3002. In a browser on `localhost:3002`: Liri bubble visible on every docs page → click → iframe panel loads `/chat?embed=1` → ask «چطور یک برنامه Node.js را دیپلوی کنم؟» → tool trace streams → cited answer → citation click lands on the docs-site page for that path. Also verify the extension still opens against `/chat?embed=1`. Screenshots of each state.

- [ ] **Step 5: Commit**

```bash
git add public/embed.js src/app/chat src/components/liri docs-site/src/pages/_app.jsx docs-site/PATCHES.md
git commit -m "feat: Liri embedded in the docs fork via agent-origin loader (ADR-0008)"
```


---

## Phase C — Console surface (P1 — cut here if behind schedule)

### Task 9: Connected console + proactive nudge

**Files:**
- Create: `src/lib/liara-bff.js`, `src/app/api/liara/apps/route.ts`, `src/app/api/liara/apps/[name]/route.ts`, `src/app/api/liara/apps/[name]/logs/route.ts`, `src/app/console/page.tsx`, `src/components/console/AppsList.tsx`, `src/components/console/AppDetail.tsx`

**Interfaces:**
- Consumes: `session-store` (`get(sid)` from cookie, pattern of `agent/channels/eve.ts:13-27`), Liara REST (`https://api.iran.liara.ir`) — read `agent/specs/paas.json` for exact response fields of `getApps` (`GET /v1/projects`), `getAppByName`, `getAppReleases`, `getAppEvents`, `getAppLogs` before coding; reuse field names verbatim.
- Produces:
  - `GET /api/liara/apps` → `{connected: boolean, apps: {name, status, plan?}[]}` (401-shaped `{connected:false}` when no session)
  - `GET /api/liara/apps/[name]` → `{app, releases, events}` (parallel `Promise.allSettled`, tolerate per-source failure with `null`)
  - `GET /api/liara/apps/[name]/logs?since=` → capped 200 lines
  - `/console` page: not connected → ConnectPanel hero + «حالت دمو» showing prototype's mock `my-api` dashboard (data from `prototype/src/pages/Dashboard.tsx:8-19`, labeled «نمونه — داده واقعی نیست»); connected → real apps list → detail (status, releases timeline with failed badge, config summary, quick actions).

- [ ] **Step 1: `src/lib/liara-bff.js`**

```js
/** BFF for the console surface: same sid→token session as the eve channel. */
import { get as getSession } from "./session-store.js";

const BASE = process.env.LIARA_API_BASE || "https://api.iran.liara.ir";

/** @returns {Promise<{token: string} | null>} */
export async function sessionFromRequest(request) {
  const cookie = request.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)sid=([A-Za-z0-9_-]{16,})/);
  if (!m) return null;
  const s = getSession(m[1]);
  return s ? { token: s.token } : null;
}

export async function liaraGet(token, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw Object.assign(new Error(`liara ${res.status}`), { status: res.status });
  return res.status === 204 ? null : res.json();
}
```

- [ ] **Step 2: Routes** — each: `sessionFromRequest` → null → `NextResponse.json({connected:false},{status:401})`; else `liaraGet` mapping spec fields; `[name]` uses `Promise.allSettled` over app/releases/events; logs capped at 200 lines (`.split("\n").slice(-200)`), 15s `revalidate = 0` / `dynamic = "force-dynamic"`.

- [ ] **Step 3: Console UI** — port `prototype/src/pages/Dashboard.tsx` structure to real data. `AppDetail` quick actions call a `onAsk` prop that bubbles to the page-level `LiriWidget` request (surface="console", scopeLabel="کنسول لیارا", resource=app name, state ok/failed). **Proactive nudge:** if latest release of the open app has failed state (per spec field), pass `nudge={{text: `لیری دید استقرار آخرین ریلیز «${app}» ناموفق بوده. بررسی کنم؟`, cta: "بررسی کن"}}`; CTA → `ask("چرا آخرین استقرار ${app} شکست خورده؟ لاگ‌ها و ریلیزهاش را بررسی کن و ریشه مشکل را بگو.")`.

- [ ] **Step 4: Browser verification** — connected: list loads, detail shows releases, failed release triggers nudge, CTA runs a real diagnosis turn in the widget. Demo mode shows mock with disclaimer. Screenshot both.

- [ ] **Step 5: Commit**

```bash
git add src/lib/liara-bff.js src/app/api/liara src/app/console src/components/console
git commit -m "feat: connected console surface with proactive incident nudge"
```

---

## Phase D — Ship (P0)

### Task 10: Smoke, docs, deploy readiness

**Files:**
- Modify: `scripts/smoke.mjs`, `README.md`, `CHANGELOG.md`
- Reference: `docs/adr/0008-docs-repo-as-presentation-layer.md` (already written — do not create a new ADR)

- [ ] **Step 1: Extend smoke** — post-deletion state: `GET /` redirects to `/chat` (307/308); `GET /chat` 200; (if Task 9 shipped) `GET /console` 200 and `GET /api/liara/apps` → 401 `{connected:false}` unauthenticated. Run: `node scripts/smoke.mjs http://localhost:3000` → `SMOKE OK n/n`.

- [ ] **Step 2: README/CHANGELOG** — README: judge guide rewritten for the real topology (primary link = the docs-site deployment with Liri embedded; agent app = `/chat` + `/console` + APIs; extension install), architecture section updated per ADR-0008, `docs-site/PATCHES.md` + sync script documented, prototype folder mentioned as design reference. CHANGELOG entry summarizing the port + pivot.


- [ ] **Step 3: Full verification gate**

```bash
node --test            # all unit suites green
npm run build          # production build clean
node scripts/smoke.mjs http://localhost:3000
```

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke.mjs README.md CHANGELOG.md
git commit -m "docs: ship docs-fork presentation layer; smoke coverage for new surfaces"
```

---

## Self-Review

- **Spec coverage vs rubric:** UI/UX (55) → Tasks 4, 7, 8 (real docs fork + embedded Liri, traces, cards, RTL). Agentic (50) → Tasks 5, 7 (clarify/plan/verify rendering of real HITL), 9 (proactive nudge). Correctness (80) → unchanged retrieval + citation deep-links into the docs fork (Task 8). Security (50) → embed.js is same-script-origin content + iframe (no new trust boundary); Task 9 BFF reuses httpOnly sid + read-only endpoints. Deployment (40) / Cost (25) → two Liara apps (docs fork static export + agent Node app); Task 10 verifies agent app + records docs-site deploy steps.
- **Deliberate cuts:** mascot mood micro-animations beyond rings, activity timestamps, model-generated suggestion chips (SCENARIOS chips reused instead), api-ref reader styling beyond banner. Recorded, not silently dropped.
- **Type consistency:** `TraceStep.state` (`active|done`) consumed by ToolTrace; `LiriMessage` union matches Task 5 test fixtures; `NavGroup/Page` shapes identical in Tasks 1–3; `request` nonce pattern matches prototype `LiriRequest`.
- **Risk:** eve approval state names after respond are the one unverified assumption (noted in Task 5) — verify against a live stream before styling resolved states.
