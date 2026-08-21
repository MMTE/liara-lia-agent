import test from "node:test";
import assert from "node:assert/strict";

import { cleanMdx, extractTitle } from "../src/lib/clean-mdx.js";
import { chunkPage } from "../src/lib/chunker.js";

// Hermetic fixture — representative snippet from
// .research/docs/src/pages/paas/flask/quick-start.mdx (liara-cloud/docs),
// plus the ```-fenced CLI blocks that style of guide also uses.
const FIXTURE = `import Layout from "@/components/Layout";
import Head from "next/head";

<Layout>
<Head>
<title>مستندات استقرار سریع برنامه‌های Flask - لیارا</title>
<meta property="og:title" content="مستندات خدمات رایانش ابری لیارا" />
</Head>
# استقرار سریع برنامه‌های Flask
<hr className="mb-2" />

برای استقرار با استفاده از ابزار <Link className="text-[#2196f3] " href="/references/console/about">Liara Console</Link> کافیست تا مراحل زیر را طی کنید.

## استقرار با Liara Console

<Step  steps={[
{
  step: "۱",
  content: (
  <>
    <h3>ورود به حساب کاربری</h3>
    <p>وارد <Link className="text-[#2196f3] " href="https://console.liara.ir">کنسول لیارا</Link> شوید و با وارد کردن ایمیل یا شماره همراه ثبت شده، به اکانت خود در لیارا، لاگین کنید.</p>
  </>
  )
  },
  {
  step: "۵",
  content: (
  <>
    <h3>تنظیم فایل‌ requirements.txt</h3>
    <p>حتماً باید در مسیر اصلی پروژه، فایل <Important>requirements.txt</Important> وجود داشته باشد؛
    اگر که این فایل وجود ندارد، می‌توانید با اجرای دستور زیر (با فرض فعال بودن محیط مجازی برنامه)، این فایل را ایجاد کنید:
    </p>
    <div className="h-2" />
    <div dir='ltr'>
    <Highlight className="bash">
      {\`pip freeze > requirements.txt \`}
    </Highlight>
    </div>
  </>
  )
  }
]}/>

## استقرار با Liara CLI

ترمینال را باز کنید و با اجرای دستور زیر، ابزار Liara CLI را بر روی سیستم خود نصب کنید:

\`\`\`bash
npm install -g @liara/cli
\`\`\`

با اجرای دستور زیر، وارد حساب کاربری خود در لیارا، شوید:

\`\`\`bash
liara login
\`\`\`

<div dir='ltr'>
<Highlight className="bash">
  {\`liara deploy --app=myapp --platform=flask\`}
</Highlight>
</div>

### ایجاد برنامه

با اجرای دستور زیر، برنامه Flask خود را ایجاد کنید:

\`\`\`bash
liara create
\`\`\`

<Alert variant="info">اگر که از قبل برنامه خود را ایجاد کرده‌اید؛ نیازی به انجام این کار نیست.</Alert>
</Layout>`;

test("cleanMdx strips imports, <Head>, JSX tags and attributes", () => {
  const cleaned = cleanMdx(FIXTURE);
  assert.ok(!cleaned.includes("import "), "import lines must be gone");
  assert.ok(!cleaned.includes("<Head"), "Head block must be gone");
  assert.ok(!cleaned.includes("og:title"), "Head content must be gone");
  assert.ok(!cleaned.includes("className"), "JSX attributes must be gone");
  assert.ok(!cleaned.includes("<Link"), "Link tags must be gone");
  assert.ok(!cleaned.includes("<h3"), "JSX headings must be converted");
  assert.ok(!cleaned.includes("<>"), "fragment markers must be gone");
  assert.ok(!cleaned.includes("<Step"), "Step residue must be gone");
  assert.ok(!cleaned.includes('step: "'), "step attr noise must be gone");
  assert.ok(!cleaned.includes("content: ("), "content attr noise must be gone");
  assert.ok(!cleaned.includes("<Layout"), "Layout wrapper must be gone");
});

test("cleanMdx keeps markdown, inner text and code verbatim", () => {
  const cleaned = cleanMdx(FIXTURE);
  assert.ok(cleaned.trimStart().startsWith("# استقرار سریع برنامه‌های Flask"));
  assert.ok(cleaned.includes("### ورود به حساب کاربری"));
  assert.ok(cleaned.includes("### تنظیم فایل‌ requirements.txt"));
  assert.ok(cleaned.includes("Liara Console"));
  assert.ok(cleaned.includes("کنسول لیارا"));
  assert.ok(cleaned.includes("اگر که از قبل برنامه خود را ایجاد کرده‌اید"));
  assert.ok(
    cleaned.includes("pip freeze > requirements.txt"),
    "Highlight template content must survive",
  );
  assert.ok(
    cleaned.includes("liara deploy --app=myapp --platform=flask"),
    "Highlight template content must survive",
  );
  assert.ok(
    cleaned.includes("```bash\nnpm install -g @liara/cli\n```"),
    "fenced code must stay verbatim",
  );
  assert.ok(cleaned.includes("```bash\nliara login\n```"));
  assert.ok(cleaned.includes("```bash\nliara create\n```"));
});

test("extractTitle reads <title>, falls back to H1, else null", () => {
  assert.equal(
    extractTitle(FIXTURE),
    "مستندات استقرار سریع برنامه‌های Flask - لیارا",
  );
  assert.equal(extractTitle("# عنوان صفحه\n\nمتن"), "عنوان صفحه");
  assert.equal(extractTitle("متن بدون عنوان"), null);
});

const PAGE = {
  slug: "paas/flask/quick-start",
  url: "https://docs.liara.ir/paas/flask/quick-start",
  title: extractTitle(FIXTURE),
  product: "flask",
  source: "guides",
  text: cleanMdx(FIXTURE),
};

test("chunkPage splits at H2/H3 and produces complete chunks", () => {
  const chunks = chunkPage(PAGE);
  assert.ok(chunks.length >= 4, "expected preamble + 3 sections at least");
  assert.equal(
    new Set(chunks.map((c) => c.id)).size,
    chunks.length,
    "ids must be unique",
  );
  for (const c of chunks) {
    assert.equal(c.slug, PAGE.slug);
    assert.equal(c.url, PAGE.url);
    assert.equal(c.title, PAGE.title);
    assert.equal(c.product, "flask");
    assert.equal(c.source, "guides");
    assert.equal(typeof c.sectionPath, "string");
    assert.ok(c.text.trim().length > 0);
    // fences never split: backtick fence markers always come in pairs
    const fenceMarkers = (c.text.match(/```/g) ?? []).length;
    assert.equal(fenceMarkers % 2, 0, `chunk ${c.id} splits a code fence`);
  }
  const console_ = chunks.find((c) => c.sectionPath === "استقرار با Liara Console");
  assert.ok(console_, "H2 section chunk must exist");
  assert.ok(console_.text.startsWith("## استقرار با Liara Console"));
  assert.ok(console_.text.includes("### ورود به حساب کاربری"));
  const cli = chunks.find((c) => c.sectionPath === "استقرار با Liara CLI");
  assert.ok(cli, "H2 section chunk must exist");
  assert.ok(cli.text.startsWith("## استقرار با Liara CLI"));
  const nested = chunks.find(
    (c) => c.sectionPath === "استقرار با Liara CLI > ایجاد برنامه",
  );
  assert.ok(nested, "H3 section chunk must exist with nested sectionPath");
  assert.ok(nested.text.startsWith("### ایجاد برنامه"));
});

test("chunkPage hard-splits oversized sections at ~1200 chars", () => {
  const paras = Array.from(
    { length: 24 },
    (_, i) =>
      `نکته ${i + 1}: برای استقرار بی‌نقص برنامه Flask خود در لیارا، حتماً فایل requirements.txt را به‌روزرسانی کنید، شبکه خصوصی و منابع سخت‌افزاری مناسب انتخاب کنید و سپس دستور liara deploy را اجرا کنید.`,
  ).join("\n\n");
  const chunks = chunkPage({ ...PAGE, slug: "long", text: `## نکات تکمیلی\n\n${paras}` });
  assert.ok(chunks.length >= 2, "oversized section must be hard-split");
  for (const c of chunks) {
    assert.ok(c.text.length <= 1200, `chunk ${c.id} exceeds 1200 chars`);
    assert.equal(c.sectionPath, "نکات تکمیلی");
  }
});

test("chunkPage never splits inside a code fence, even oversized ones", () => {
  const giantCommand = "npm install " + "lodash express morgan ".repeat(120);
  const chunks = chunkPage({
    ...PAGE,
    slug: "fence",
    text: `## پیکربندی پیشرفته\n\nیک مثال کامل:\n\n\`\`\`bash\n${giantCommand}\n\`\`\`\n`,
  });
  const fenceChunks = chunks.filter((c) => c.text.includes("npm install"));
  assert.equal(fenceChunks.length, 1, "fence must stay in a single chunk");
  const fence = fenceChunks[0];
  assert.ok(fence.text.includes("```bash"));
  assert.ok(fence.text.trimEnd().endsWith("```"));
  assert.ok(fence.text.includes(giantCommand), "fence content must be intact");
  assert.ok(fence.text.length > 1200, "oversized fence kept whole");
});
