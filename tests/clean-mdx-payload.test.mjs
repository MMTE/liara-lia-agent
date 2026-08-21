import test from "node:test";
import assert from "node:assert/strict";

import { cleanMdx } from "../src/lib/clean-mdx.js";
import { chunkPage } from "../src/lib/chunker.js";

// Regression: docs pages wrap entire sections inside self-closing component
// attributes (<Tabs content={[…]}/>, <Step steps={[…]}/>, <Table data={[…]}/>).
// Before the hoist fix, tag-stripping deleted those payloads — 458/1143
// corpus pages kept almost no body text (e.g. iaas/*/how-tos pages dropped
// from ~20k raw chars to ~200 cleaned). Fixtures below are trimmed snippets
// from .cache/docs/src/pages (iaas/ubuntu/how-tos/connect-domain.mdx and
// paas/flask/how-tos/use-hooks.mdx).

const TABS_FIXTURE = `import Layout from "@/components/Layout";
<Layout>
# اتصال دامنه به سرور مجازی ابری
<Tabs
  tabs={["NginX", "Apache"]}
  content={[
  <>
    <Step  steps={[
        {
            step: "۱",
            content: (
                <>
                    <h3>اضافه کردن رکورد <Important>A</Important> در سامانه مدیریت دامنه</h3>
                    <p>
                        یک رکورد از نوع <Important>A</Important> با مقدار IP سرور مجازی ابری‌تان اضافه کنید.
                    </p>
                </>
            )
        },
        {
            step: "۲",
            content: (
                <>
                    <h3>نصب وب‌سرور NginX</h3>
                    <p>با اجرای دستور زیر، NginX را نصب کنید:</p>
                    <div dir='ltr'>
                        <Highlight className="bash">
                            {\`sudo apt update && sudo apt install -y nginx\`}
                        </Highlight>
                    </div>
                </>
            )
        },
    ]}
    />
  </>
  ]}
/> بخش بعدی خارج از تب‌هاست.
</Layout>`;

test("cleanMdx hoists array-payload attrs out of self-closing components", () => {
  const cleaned = cleanMdx(TABS_FIXTURE);
  assert.ok(cleaned.includes("### اضافه کردن رکورد A در سامانه مدیریت دامنه"), "h3 inside payload must survive as heading");
  assert.ok(cleaned.includes("یک رکورد از نوع A با مقدار IP"), "prose inside payload must survive");
  assert.ok(cleaned.includes("### نصب وب‌سرور NginX"), "second step heading must survive");
  assert.ok(cleaned.includes("sudo apt update && sudo apt install -y nginx"), "code template inside payload must survive");
  assert.ok(cleaned.includes("بخش بعدی خارج از تب‌هاست."), "text after the component must survive");
  assert.ok(!cleaned.includes("<Tabs"), "Tabs tag must be stripped");
  assert.ok(!cleaned.includes("<Step"), "Step tag must be stripped");
  assert.ok(!cleaned.includes("content={["), "payload attr syntax must be gone");
  assert.ok(!cleaned.includes('step: "'), "step attr noise must be gone");
  assert.ok(!cleaned.includes("content: ("), "content attr noise must be gone");
});

test("hoisted Tabs payload content chunks into retrieval chunks", () => {
  const chunks = chunkPage({
    slug: "guides/iaas/ubuntu/how-tos/connect-domain",
    url: "https://docs.liara.ir/iaas/ubuntu/how-tos/connect-domain",
    title: "اتصال دامنه",
    product: "iaas",
    source: "guides",
    text: cleanMdx(TABS_FIXTURE),
  });
  assert.ok(chunks.length >= 1);
  const joined = chunks.map((c) => c.text).join("\n");
  assert.ok(joined.includes("نصب وب‌سرور NginX"));
  assert.ok(joined.includes("sudo apt install -y nginx"));
});

const TABLE_FIXTURE = `# هوک‌های لیارا

<Table headers={[
  "نام هوک",
  "زمان اجرا",
]} data={[
  [
    "liara_pre_build.sh",
    "قبل از بیلد فایل‌های قسمت فرانت برنامه",
  ],
  [
    "liara_post_build.sh",
    "بعد از بیلد فایل‌های قسمت فرانت برنامه",
  ],
]} />

\`\`\`bash
liara deploy
\`\`\`
`;

test("cleanMdx hoists Table header/data payloads", () => {
  const cleaned = cleanMdx(TABLE_FIXTURE);
  assert.ok(cleaned.includes("liara_pre_build.sh"), "table row data must survive");
  assert.ok(cleaned.includes("قبل از بیلد فایل‌های قسمت فرانت برنامه"), "persian cell text must survive");
  assert.ok(cleaned.includes("```bash\nliara deploy\n```"), "fenced code after table must stay verbatim");
  assert.ok(!cleaned.includes("<Table"), "Table tag must be stripped");
  assert.ok(!cleaned.includes("data={["), "payload attr syntax must be gone");
});
