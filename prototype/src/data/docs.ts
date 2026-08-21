export type Block =
{type: 'p';text: string;} |
{type: 'h2';text: string;} |
{type: 'list';items: string[];} |
{type: 'code';lang: string;caption?: string;code: string;} |
{type: 'callout';tone: 'info' | 'warn';title: string;text: string;};

export interface DocArticle {
  slug: string;
  title: string;
  description: string;
  path: string;
  updated: string;
  readTime: string;
  blocks: Block[];
}

export interface DocSection {
  title: string;
  items: {slug: string;title: string;}[];
}

export const docSections: DocSection[] = [
{
  title: 'شروع سریع',
  items: [
  { slug: 'intro', title: 'لیارا چیست؟' },
  { slug: 'first-app', title: 'ساخت اولین برنامه' }]

},
{
  title: 'پلتفرم برنامه (PaaS)',
  items: [
  { slug: 'nodejs', title: 'استقرار برنامه Node.js' },
  { slug: 'env-vars', title: 'متغیرهای محیطی' },
  { slug: 'laravel', title: 'استقرار برنامه Laravel' },
  { slug: 'docker', title: 'استقرار با Dockerfile' }]

},
{
  title: 'پایگاه داده',
  items: [
  { slug: 'postgres', title: 'PostgreSQL' },
  { slug: 'redis', title: 'Redis' }]

},
{
  title: 'شبکه و دامنه',
  items: [
  { slug: 'domains', title: 'اتصال دامنه' },
  { slug: 'troubleshoot-502', title: 'رفع خطای ۵۰۲' }]

}];


export const articles: Record<string, DocArticle> = {
  nodejs: {
    slug: 'nodejs',
    title: 'استقرار برنامه Node.js',
    description:
    'راهنمای کامل استقرار یک برنامه Node.js روی پلتفرم لیارا؛ از تنظیم liara.json تا انتخاب نسخه و اجرای اولین دیپلوی.',
    path: 'app-deploy/nodejs/getting-started',
    updated: '۱۴ مرداد ۱۴۰۵',
    readTime: '۶ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'برای اجرای یک برنامه Node.js روی لیارا کافی است پلتفرم را روی node تنظیم کنید و مطمئن شوید برنامه روی پورتی که لیارا در اختیارتان می‌گذارد گوش می‌دهد. لیارا پس از دریافت سورس، مرحله ساخت (Build) و سپس اجرای برنامه را انجام می‌دهد.'
    },
    { type: 'h2', text: 'پیش‌نیازها' },
    {
      type: 'list',
      items: [
      'نصب CLI لیارا با دستور npm i -g @liara/cli',
      'ورود به حساب کاربری با liara login',
      'وجود فایل package.json در ریشه پروژه']

    },
    { type: 'h2', text: 'فایل پیکربندی liara.json' },
    {
      type: 'p',
      text: 'با فایل liara.json می‌توانید پلتفرم، پورت، نسخه Node.js و دستور اجرای برنامه را مشخص کنید. این فایل باید در ریشه پروژه قرار بگیرد.'
    },
    {
      type: 'code',
      lang: 'json',
      caption: 'liara.json',
      code: `{
  "platform": "node",
  "app": "my-api",
  "port": 3000,
  "node": {
    "version": "20"
  }
}`
    },
    { type: 'h2', text: 'گوش دادن روی هاست درست' },
    {
      type: 'p',
      text: 'برنامه شما باید روی 0.0.0.0 و روی پورت تعریف‌شده گوش دهد. اگر روی localhost گوش دهد، درخواست‌ها از بیرون کانتینر به برنامه نمی‌رسند و با خطای ۵۰۲ روبه‌رو می‌شوید.'
    },
    {
      type: 'code',
      lang: 'javascript',
      caption: 'server.js',
      code: `const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("server is running on " + port);
});`
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'نسخه Node.js',
      text: 'اگر در package.json فیلد engines را تعیین کرده‌اید، نسخه تعریف‌شده در liara.json باید با آن سازگار باشد؛ در غیر این صورت مرحله ساخت با خطا متوقف می‌شود.'
    },
    { type: 'h2', text: 'اجرای دیپلوی' },
    {
      type: 'code',
      lang: 'bash',
      code: `liara deploy --app my-api --port 3000`
    },
    {
      type: 'p',
      text: 'پس از پایان دیپلوی می‌توانید با liara logs --app my-api لاگ‌های زنده برنامه را ببینید.'
    }]

  },
  'troubleshoot-502': {
    slug: 'troubleshoot-502',
    title: 'رفع خطای ۵۰۲',
    description: 'دلایل رایج خطای ۵۰۲ پس از دیپلوی و روش تشخیص هرکدام.',
    path: 'paas/troubleshooting/502',
    updated: '۲ مرداد ۱۴۰۵',
    readTime: '۴ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'خطای ۵۰۲ یعنی درخواست به برنامه شما رسیده اما پاسخی از فرایند برنامه دریافت نشده است. سه دلیل رایج آن را در ادامه می‌بینید.'
    },
    {
      type: 'list',
      items: [
      'برنامه روی localhost گوش می‌دهد به‌جای 0.0.0.0',
      'پورت اعلام‌شده در liara.json با پورت واقعی برنامه یکسان نیست',
      'فرایند برنامه بلافاصله بعد از اجرا کرش کرده است']

    },
    {
      type: 'callout',
      tone: 'info',
      title: 'بررسی سریع',
      text: 'در لاگ‌های اجرا (Runtime) دنبال پیام listening بگردید. نبودن این پیام یعنی برنامه بالا نیامده است.'
    }]

  },
  postgres: {
    slug: 'postgres',
    title: 'PostgreSQL',
    description: 'ساخت دیتابیس PostgreSQL و اتصال آن به برنامه.',
    path: 'databases/postgresql/about',
    updated: '۹ تیر ۱۴۰۵',
    readTime: '۵ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'پس از ساخت دیتابیس، رشته اتصال در بخش مشخصات دیتابیس در دسترس است. توصیه می‌شود این مقدار را به‌صورت متغیر محیطی و از نوع Secret به برنامه بدهید.'
    },
    {
      type: 'code',
      lang: 'bash',
      code: `DATABASE_URL=postgresql://root:<password>@<host>:<port>/postgres`
    }]

  },
  'env-vars': {
    slug: 'env-vars',
    title: 'متغیرهای محیطی',
    description: 'تعریف، به‌روزرسانی و امن‌سازی متغیرهای محیطی برنامه.',
    path: 'paas/environment-variables',
    updated: '۲۸ خرداد ۱۴۰۵',
    readTime: '۳ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'هر تغییر در متغیرهای محیطی باعث اجرای دوباره برنامه می‌شود. مقادیر حساس مانند رمز دیتابیس را به‌صورت Secret ذخیره کنید تا در لاگ‌ها و رابط کاربری نمایش داده نشوند.'
    }]

  },
  intro: {
    slug: 'intro',
    title: 'لیارا چیست؟',
    description: 'مروری بر سرویس‌های ابری لیارا.',
    path: 'intro',
    updated: '۱ مرداد ۱۴۰۵',
    readTime: '۲ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'لیارا یک پلتفرم ابری است که استقرار برنامه، پایگاه داده، فضای ذخیره‌سازی ابری، سرویس ایمیل و زیرساخت را در یک جا فراهم می‌کند.'
    }]

  },
  'first-app': {
    slug: 'first-app',
    title: 'ساخت اولین برنامه',
    description: 'از ساخت برنامه تا اولین دیپلوی موفق.',
    path: 'paas/getting-started',
    updated: '۱ مرداد ۱۴۰۵',
    readTime: '۴ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'ابتدا در کنسول یک برنامه بسازید، پلتفرم و پلن را انتخاب کنید و سپس با CLI یا از طریق GitHub سورس خود را مستقر کنید.'
    }]

  },
  laravel: {
    slug: 'laravel',
    title: 'استقرار برنامه Laravel',
    description: 'اجرای مهاجرت‌ها، تنظیم APP_KEY و استقرار برنامه Laravel.',
    path: 'app-deploy/laravel/getting-started',
    updated: '۲۰ تیر ۱۴۰۵',
    readTime: '۷ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'برای Laravel مقدار platform را laravel قرار دهید و در بخش laravel.configureNginx و دستورات پس از استقرار، مهاجرت‌های دیتابیس را اجرا کنید.'
    }]

  },
  docker: {
    slug: 'docker',
    title: 'استقرار با Dockerfile',
    description: 'وقتی به کنترل کامل روی محیط اجرا نیاز دارید.',
    path: 'app-deploy/docker/getting-started',
    updated: '۵ تیر ۱۴۰۵',
    readTime: '۵ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'اگر platform برابر docker باشد، لیارا از Dockerfile موجود در ریشه پروژه برای ساخت ایمیج استفاده می‌کند.'
    }]

  },
  redis: {
    slug: 'redis',
    title: 'Redis',
    description: 'ساخت و اتصال Redis برای کش و صف.',
    path: 'databases/redis/about',
    updated: '۱۲ تیر ۱۴۰۵',
    readTime: '۳ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'Redis برای کش، نگهداری نشست و صف مناسب است. پس از ساخت، مقدار REDIS_URL را در متغیرهای محیطی برنامه قرار دهید.'
    }]

  },
  domains: {
    slug: 'domains',
    title: 'اتصال دامنه',
    description: 'اتصال دامنه اختصاصی و فعال‌سازی گواهی SSL.',
    path: 'paas/domains',
    updated: '۳ مرداد ۱۴۰۵',
    readTime: '۴ دقیقه',
    blocks: [
    {
      type: 'p',
      text: 'پس از افزودن دامنه، رکورد A یا CNAME اعلام‌شده را در DNS ثبت کنید و سپس گواهی SSL رایگان را فعال کنید.'
    }]

  }
};