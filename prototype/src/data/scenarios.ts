import type { Scenario } from '../types/agent';

/**
 * Scripted agent runs used by the prototype. Each scenario mirrors a real
 * Liara Agent loop: understand → inspect → diagnose → plan → approve → act → verify.
 */
export const scenarios: Scenario[] = [
{
  id: 'deploy-node',
  surface: 'docs',
  prompt: 'چطور یک برنامه Node.js را روی لیارا مستقر کنم؟',
  intent: 'پاسخ از مستندات',
  steps: [
  {
    id: 's1',
    label: 'جست‌وجو در مستندات لیارا',
    tool: 'search_docs',
    kind: 'docs',
    result: '۴ سند مرتبط پیدا شد',
    output: [
    'app-deploy/nodejs/getting-started  · score 0.93',
    'paas/environment-variables         · score 0.71',
    'app-deploy/nodejs/liara-json       · score 0.68'],

    durationMs: 900
  },
  {
    id: 's2',
    label: 'باز کردن سند اصلی',
    tool: 'read_doc',
    kind: 'docs',
    result: 'app-deploy/nodejs/getting-started',
    durationMs: 700
  },
  {
    id: 's3',
    label: 'بررسی نمونه پیکربندی',
    tool: 'read_doc',
    kind: 'docs',
    result: 'liara.json — پلتفرم، پورت، نسخه',
    durationMs: 600
  }],

  answer: {
    headline: 'سه قدم تا اولین دیپلوی',
    paragraphs: [
    'برای اجرای یک برنامه Node.js روی لیارا، پلتفرم را روی node بگذارید، پورت را اعلام کنید و مطمئن شوید برنامه روی 0.0.0.0 گوش می‌دهد.'],

    bullets: [
    'نصب CLI و ورود: npm i -g @liara/cli سپس liara login',
    'ساخت فایل liara.json در ریشه پروژه',
    'اجرای دیپلوی با liara deploy --app my-api --port 3000'],

    code: {
      lang: 'json',
      caption: 'liara.json',
      code: `{
  "platform": "node",
  "app": "my-api",
  "port": 3000,
  "node": { "version": "20" }
}`
    },
    citations: [
    { title: 'استقرار برنامه Node.js', path: 'app-deploy/nodejs/getting-started', section: 'شروع سریع' },
    { title: 'متغیرهای محیطی', path: 'paas/environment-variables' }]

  },
  suggestions: [
  'نسخه Node.js را چطور تغییر دهم؟',
  'متغیر محیطی امن چطور تعریف کنم؟',
  'حساب لیارا را وصل کن و برنامه‌هایم را ببین']

},
{
  id: 'why-502',
  surface: 'docs',
  prompt: 'بعد از دیپلوی، برنامه‌ام خطای ۵۰۲ می‌دهد. چرا؟',
  intent: 'عیب‌یابی از روی مستندات',
  steps: [
  {
    id: 's1',
    label: 'تشخیص نیت کاربر',
    tool: 'classify_intent',
    kind: 'read',
    result: 'عیب‌یابی زمان اجرا',
    durationMs: 500
  },
  {
    id: 's2',
    label: 'جست‌وجوی چندمرحله‌ای در مستندات',
    tool: 'search_docs',
    kind: 'docs',
    result: '۳ علت رایج ۵۰۲ استخراج شد',
    output: [
    'paas/troubleshooting/502            · score 0.95',
    'app-deploy/nodejs/getting-started   · score 0.74'],

    durationMs: 900
  },
  {
    id: 's3',
    label: 'استخراج بخش‌های مرتبط',
    tool: 'rerank_chunks',
    kind: 'docs',
    result: '۵ قطعه از ۲ سند',
    durationMs: 600
  }],

  answer: {
    headline: 'سه علت رایج، به ترتیب احتمال',
    paragraphs: [
    'خطای ۵۰۲ یعنی درخواست به کانتینر رسیده اما پاسخی از فرایند برنامه برنگشته است.'],

    bullets: [
    'برنامه روی localhost گوش می‌دهد؛ باید روی 0.0.0.0 باشد',
    'پورت liara.json با پورت واقعی برنامه یکی نیست',
    'فرایند بلافاصله پس از اجرا کرش کرده است'],

    code: {
      lang: 'javascript',
      caption: 'server.js',
      code: `app.listen(process.env.PORT || 3000, "0.0.0.0");`
    },
    citations: [
    { title: 'رفع خطای ۵۰۲', path: 'paas/troubleshooting/502' },
    { title: 'استقرار برنامه Node.js', path: 'app-deploy/nodejs/getting-started', section: 'گوش دادن روی هاست درست' }]

  },
  proactive: {
    text: 'اگر حساب لیارا را وصل کنید، می‌توانم لاگ‌های واقعی همین برنامه را بخوانم و دقیقاً بگویم کدام‌یک از این سه مورد است.',
    cta: 'اتصال حساب لیارا'
  },
  suggestions: ['لاگ اجرا را چطور ببینم؟', 'پورت برنامه را عوض کن', 'رفتن به سند خطای ۵۰۲']
},
{
  id: 'diagnose-deploy',
  surface: 'dashboard',
  prompt: 'چرا؟',
  intent: 'عیب‌یابی استقرار ‎#۱۸۴',
  steps: [
  {
    id: 's1',
    label: 'خواندن وضعیت استقرار',
    tool: 'get_deployment',
    kind: 'read',
    result: 'deployment #184 · failed · مرحله build',
    durationMs: 800
  },
  {
    id: 's2',
    label: 'خواندن لاگ ساخت',
    tool: 'get_build_logs',
    kind: 'read',
    result: '۱۳۲ خط بررسی شد · ۱ خطای بحرانی',
    output: [
    'npm ERR! code EBADENGINE',
    'npm ERR! notsup Unsupported engine for my-api@1.4.0',
    'npm ERR! required: { node: ">=20.0.0" }',
    'npm ERR! current:  { node: "v18.20.4" }'],

    durationMs: 1000
  },
  {
    id: 's3',
    label: 'بررسی پیکربندی برنامه',
    tool: 'get_app_config',
    kind: 'read',
    result: 'runtime: node 18 · port 3000 · plan: standard',
    durationMs: 700
  },
  {
    id: 's4',
    label: 'جست‌وجو در مستندات لیارا',
    tool: 'search_docs',
    kind: 'docs',
    result: 'سند «نسخه Node.js» پیدا شد',
    durationMs: 800
  }],

  answer: {
    headline: 'ریشه خطا: ناسازگاری نسخه Node.js',
    paragraphs: [
    'استقرار ‎#۱۸۴ در مرحله ساخت متوقف شده است. پکیج my-api به Node.js نسخه ۲۰ یا بالاتر نیاز دارد، در حالی که برنامه روی Node.js 18 پیکربندی شده است.'],

    bullets: [
    'شاهد ۱: خطای EBADENGINE در لاگ ساخت',
    'شاهد ۲: engines.node = ">=20.0.0" در package.json',
    'شاهد ۳: runtime فعلی برنامه = node 18'],

    citations: [
    { title: 'استقرار برنامه Node.js', path: 'app-deploy/nodejs/getting-started', section: 'نسخه Node.js' }]

  },
  plan: {
    title: 'ارتقای نسخه اجرا و استقرار دوباره',
    summary: 'دو تغییر روی برنامه my-api در محیط production.',
    changes: [
    {
      id: 'c1',
      title: 'تغییر نسخه Node.js برنامه',
      tool: 'update_app',
      before: 'node 18',
      after: 'node 20',
      risk: 'caution'
    },
    {
      id: 'c2',
      title: 'اجرای دوباره استقرار آخرین کامیت',
      tool: 'deploy_app',
      after: 'commit 8f21c0a',
      risk: 'caution'
    },
    {
      id: 'c3',
      title: 'پایش استقرار تا سالم شدن سرویس',
      tool: 'watch_deployment',
      risk: 'safe'
    }],

    note: 'هیچ عملیات مخربی انجام نمی‌شود؛ داده‌ای حذف یا بازنویسی نمی‌گردد.'
  },
  verify: [
  { id: 'v1', label: 'به‌روزرسانی نسخه اجرا', tool: 'update_app', kind: 'write', result: 'node 18 → 20', durationMs: 900 },
  { id: 'v2', label: 'شروع استقرار ‎#۱۸۵', tool: 'deploy_app', kind: 'write', result: 'در حال ساخت…', durationMs: 1100 },
  { id: 'v3', label: 'پایان مرحله ساخت', tool: 'watch_deployment', kind: 'read', result: 'build موفق در ۵۸ ثانیه', durationMs: 1200 },
  { id: 'v4', label: 'بررسی سلامت سرویس', tool: 'get_app_health', kind: 'read', result: 'HTTP 200 · پاسخ ۱۲۴ms', durationMs: 900 }],

  verifiedMessage: 'برنامه my-api دوباره سالم است. استقرار ‎#۱۸۵ با موفقیت انجام شد.',
  proactive: {
    text: 'همچنین دیدم برای این برنامه health check تعریف نشده است. اگر بخواهید می‌توانم یک بررسی سلامت روی مسیر ‎/healthz تنظیم کنم تا دفعه بعد خودم زودتر متوجه شوم.',
    cta: 'تنظیم health check'
  },
  suggestions: ['لاگ‌های اجرا را نشان بده', 'health check را تنظیم کن', 'این تغییر را به staging هم اعمال کن']
},
{
  id: 'provision-db',
  surface: 'dashboard',
  prompt: 'یک دیتابیس PostgreSQL بساز و به my-api وصلش کن.',
  intent: 'تأمین منابع',
  clarify: {
    question: 'قبل از ساخت، یک نکته: این دیتابیس برای کدام محیط باشد؟',
    options: [
    { id: 'prod', label: 'production', hint: 'پلن standard · پشتیبان‌گیری روزانه' },
    { id: 'staging', label: 'staging', hint: 'پلن پایه · بدون پشتیبان‌گیری' }]

  },
  steps: [
  { id: 's1', label: 'بررسی برنامه هدف', tool: 'get_app', kind: 'read', result: 'my-api · production · سالم', durationMs: 700 },
  { id: 's2', label: 'فهرست دیتابیس‌های موجود', tool: 'list_databases', kind: 'read', result: 'هیچ PostgreSQL فعالی وجود ندارد', durationMs: 700 },
  { id: 's3', label: 'خواندن مستندات اتصال', tool: 'search_docs', kind: 'docs', result: 'databases/postgresql/about', durationMs: 800 }],

  answer: {
    headline: 'آماده اجرا',
    paragraphs: [
    'یک نمونه PostgreSQL نسخه ۱۶ در منطقه ایران می‌سازم، رشته اتصال آن را به‌صورت Secret در برنامه my-api ثبت می‌کنم و سپس برنامه را دوباره اجرا می‌کنم تا متغیر جدید اعمال شود.'],

    citations: [{ title: 'PostgreSQL', path: 'databases/postgresql/about' }]
  },
  plan: {
    title: 'ساخت PostgreSQL و اتصال به my-api',
    summary: 'یک منبع ساخته می‌شود و یک متغیر محیطی جدید اضافه می‌گردد.',
    changes: [
    { id: 'c1', title: 'ساخت دیتابیس PostgreSQL 16', tool: 'create_database', after: 'pg-prod · plan standard · ایران', risk: 'caution' },
    { id: 'c2', title: 'افزودن متغیر DATABASE_URL', tool: 'set_env_var', after: 'Secret · مقدار پنهان', risk: 'safe' },
    { id: 'c3', title: 'اجرای دوباره برنامه my-api', tool: 'restart_app', risk: 'caution' }],

    note: 'هزینه تخمینی دیتابیس بر اساس پلن standard محاسبه می‌شود.'
  },
  verify: [
  { id: 'v1', label: 'ساخت دیتابیس', tool: 'create_database', kind: 'write', result: 'pg-prod ساخته شد', durationMs: 1200 },
  { id: 'v2', label: 'ثبت متغیر محیطی', tool: 'set_env_var', kind: 'write', result: 'DATABASE_URL · Secret', durationMs: 800 },
  { id: 'v3', label: 'اجرای دوباره برنامه', tool: 'restart_app', kind: 'write', result: 'my-api دوباره اجرا شد', durationMs: 1000 },
  { id: 'v4', label: 'تست اتصال از داخل برنامه', tool: 'check_connection', kind: 'read', result: 'اتصال برقرار است · ۹ms', durationMs: 900 }],

  verifiedMessage: 'دیتابیس ساخته شد و برنامه my-api با موفقیت به آن متصل است.',
  suggestions: ['یک Redis هم اضافه کن', 'پشتیبان‌گیری روزانه را فعال کن', 'مقدار DATABASE_URL را نشان بده']
},
{
  id: 'explain-config',
  surface: 'dashboard',
  prompt: 'این پیکربندی را برایم توضیح بده.',
  intent: 'توضیح منبع جاری',
  steps: [
  { id: 's1', label: 'خواندن پیکربندی برنامه', tool: 'get_app_config', kind: 'read', result: 'node 18 · port 3000 · ایران · standard', durationMs: 700 },
  { id: 's2', label: 'یافتن مستندات مرتبط', tool: 'search_docs', kind: 'docs', result: '۲ سند مرتبط', durationMs: 700 }],

  answer: {
    headline: 'پیکربندی my-api در یک نگاه',
    paragraphs: [
    'این برنامه با پلتفرم Node.js اجرا می‌شود و ترافیک ورودی به پورت ۳۰۰۰ کانتینر هدایت می‌شود.'],

    bullets: [
    'دستور ساخت: npm ci && npm run build — نصب دقیق وابستگی‌ها سپس بیلد تولیدی',
    'پورت ۳۰۰۰: برنامه باید روی همین پورت و روی 0.0.0.0 گوش دهد',
    'منطقه ایران · پلن standard: مناسب بار متوسط تولیدی'],

    citations: [
    { title: 'استقرار برنامه Node.js', path: 'app-deploy/nodejs/getting-started' },
    { title: 'متغیرهای محیطی', path: 'paas/environment-variables' }]

  },
  suggestions: ['نسخه Node را به ۲۰ ارتقا بده', 'خطاهای اخیر را بررسی کن', 'مصرف منابع را نشان بده']
}];


export const scenarioById = (id: string) => scenarios.find((s) => s.id === id);

/** matches free typed text to a scenario, with a graceful fallback */
export function matchScenario(text: string, surface: 'docs' | 'dashboard'): Scenario {
  const t = text.trim();
  const has = (...keys: string[]) => keys.some((k) => t.includes(k));

  if (has('۵۰۲', '502')) return scenarios[1];
  if (has('دیتابیس', 'PostgreSQL', 'postgres', 'ردیس')) return scenarios[3];
  if (has('توضیح', 'پیکربندی', 'configuration')) return scenarios[4];
  if (has('چرا', 'خطا', 'شکست', 'failed', 'عیب', 'درست کن', 'fix')) {
    return surface === 'dashboard' ? scenarios[2] : scenarios[1];
  }
  if (has('Node', 'node', 'دیپلوی', 'استقرار')) return scenarios[0];
  return surface === 'dashboard' ? scenarios[4] : scenarios[0];
}