export interface Scenario {
  id: string;
  titleFa: string;
  promptFa: string;
  needsAccount?: boolean;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "docs-laravel",
    titleFa: "دیپلوی لاراول",
    promptFa: "چطور یک برنامه Laravel رو روی لیارا دیپلوی کنم؟ مراحل و نکات مهم رو با منبع بگو.",
  },
  {
    id: "docs-multi-hop",
    titleFa: "مقایسه پلن‌ها",
    promptFa: "پلن‌های هاست برنامه لیارا چی هستن و چه تفاوتی با هم دارن؟ برای یک API کوچیک کدوم مناسبه؟",
  },
  {
    id: "incident",
    titleFa: "عیب‌یابی دیپلوی",
    promptFa: "برنامه‌ی demo-api من مدام کرش می‌کنه. لاگ‌ها و دیپلوی‌هاش رو بررسی کن و بگو مشکل چیه.",
    needsAccount: true,
  },
  {
    id: "ambiguous",
    titleFa: "سوال مبهم",
    promptFa: "برنامه‌م بالا نمیاد، درستش کن.",
    needsAccount: true,
  },
  {
    id: "followup",
    titleFa: "کانتکست",
    promptFa: "حالا لاگ‌های همون برنامه رو نشونم بده و بگو آخرین ریلیز چی بوده.",
    needsAccount: true,
  },
  {
    id: "config-gen",
    titleFa: "تولید کانفیگ",
    promptFa: "برای دیپلوی یک پروژه Next.js روی لیارا چه فایل liara.json و تنظیماتی لازمه؟ نمونه بساز.",
  },
  {
    id: "next-steps",
    titleFa: "قدم بعدی",
    promptFa: "رکورد DNS و دامنه سفارشی رو چطور به اپم وصل کنم؟ بعدش چی باید انجام بدم؟",
  },
  {
    id: "adversarial",
    titleFa: "قابلیت ناموجود",
    promptFa: "چطور روی لیارا Kubernetes cluster راه بندازم و autoscaler تنظیم کنم؟",
  },
];
