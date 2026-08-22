/**
 * Lia slash-commands — thin, deterministic prompt templates over the agentic
 * tool surface (full API map in agent/instructions.md). The agent does the
 * real work; commands only guarantee phrasing that maps to one clear intent.
 *
 * `/cmd args…` → natural-language prompt sent to the agent as-is.
 * Unknown `/x` still sends verbatim — the agent answers naturally.
 */

export interface LiaCommand {
  /** what the user types after "/" */
  readonly command: string;
  /** inline arg hint shown in the palette, without brackets */
  readonly args?: string;
  /** one-line palette description (Persian UI copy) */
  readonly description: string;
  /** builds the agent prompt from raw args */
  readonly prompt: (args: string) => string;
}

const q = (s: string) => s.trim();

export const LIA_COMMANDS: readonly LiaCommand[] = [
  {
    command: "apps",
    description: "فهرست برنامه‌های PaaS",
    prompt: () => q("همه برنامه‌های (apps) اکانت رو فهرست کن: اسم، پلتفرم، وضعیت و پلن هر کدوم."),
  },
  {
    command: "app",
    args: "name",
    description: "جزئیات یک برنامه",
    prompt: (a) => q(`جزئیات کامل برنامه «${a}» رو نشونم بده: وضعیت، پلن، دامنه‌ها، دیسک‌ها و آخرین ریلیز.`),
  },
  {
    command: "logs",
    args: "name",
    description: "لاگ‌های یک برنامه",
    prompt: (a) => q(`لاگ‌های برنامه «${a}» رو بیار و اگر خطایی می‌بینی، علت احتمالی‌ش رو بگو.`),
  },
  {
    command: "events",
    args: "name",
    description: "رویدادهای یک برنامه",
    prompt: (a) => q(`رویدادها (events) برنامه «${a}» رو فهرست کن و مهم‌ترین‌ها رو خلاصه کن.`),
  },
  {
    command: "releases",
    args: "name",
    description: "ریلیزهای یک برنامه",
    prompt: (a) => q(`ریلیزهای برنامه «${a}» رو با تاریخ و وضعیت نشونم بده.`),
  },
  {
    command: "metrics",
    args: "name",
    description: "متریک‌های CPU/حافظه",
    prompt: (a) => q(`متریک‌های CPU و حافظه برنامه «${a}» رو بیار و نکته مهمی داره رو بگو.`),
  },
  {
    command: "restart",
    args: "name",
    description: "ری‌استارت برنامه (نیاز به تأیید)",
    prompt: (a) => q(`برنامه «${a}» رو ری‌استارت کن.`),
  },
  {
    command: "envs",
    args: "name",
    description: "متغیرهای محیطی برنامه",
    prompt: (a) => q(`متغیرهای محیطی برنامه «${a}» رو فهرست کن (مقادیر حساسی مثل توکن‌ها رو ماسک کن).`),
  },
  {
    command: "dbs",
    description: "فهرست دیتابیس‌ها",
    prompt: () => q("همه دیتابیس‌های اکانت رو فهرست کن: نوع، پلن، وضعیت و حجم."),
  },
  {
    command: "backups",
    args: "name",
    description: "بکاپ‌های دیتابیس",
    prompt: (a) => q(`بکاپ‌های دیتابیس «${a}» رو با تاریخ بساز و فهرست کن.`),
  },
  {
    command: "zones",
    description: "فهرست زون‌های DNS",
    prompt: () => q("همه زون‌های DNS اکانت رو فهرست کن و وضعیت nameserver هر کدوم رو بگو."),
  },
  {
    command: "records",
    args: "zone",
    description: "رکوردهای یک زون",
    prompt: (a) => q(`رکوردهای DNS زون «${a}» رو فهرست کن.`),
  },
  {
    command: "buckets",
    description: "فهرست باکت‌های استوریج",
    prompt: () => q("باکت‌های Object Storage اکانت رو فهرست کن: اسم، پلن، حالت دسترسی و حجم."),
  },
  {
    command: "vms",
    description: "فهرست سرورهای ابری",
    prompt: () => q("سرورهای ابری (VMها) اکانت رو فهرست کن: پلن، سیستم‌عامل، وضعیت و ترافیک."),
  },
  {
    command: "mailservers",
    description: "فهرست میلسرورها",
    prompt: () => q("میلسرورهای اکانت رو فهرست کن: دامنه، پلن، وضعیت DNS و تعداد میل‌های ارسالی."),
  },
  {
    command: "ai",
    args: "question",
    description: "پرسش از مدل‌ها و ورک‌اسپیس‌های لیارا AI",
    prompt: (a) => q(`درباره لیارا AI: ${a} — ورک‌اسپیس‌ها و کاتالوگ مدل‌ها رو هم در نظر بگیر.`),
  },
  {
    command: "usage",
    description: "خلاصه مصرف اکانت",
    prompt: () => q("یک خلاصه کلی از اکانت بده: چند برنامه، دیتابیس، باکت، زون DNS و میلسرور داریم و وضعیت کلی چطوره."),
  },
  {
    command: "help",
    description: "راهنمای قابلیت‌ها و دستورها",
    prompt: () => q("قابلیت‌هایت رو معرفی کن: کدوم سرویس‌های لیارا رو می‌تونی مدیریت کنی و چه دستورهایی (/…) دارم؟"),
  },
];

/** Parse `/cmd rest…` → the command's prompt, or null when the draft is not
 * a command (sent verbatim). Unknown slash input also returns null — the
 * agent handles it conversationally. */
export function resolveCommandPrompt(raw: string): string | null {
  const text = raw.trim();
  if (!text.startsWith("/")) return null;
  const sp = text.slice(1).search(/\s|$/);
  const name = text.slice(1, sp + 1);
  const rest = text.slice(1 + sp).trim();
  const cmd = LIA_COMMANDS.find((c) => c.command === name);
  if (!cmd) return null;
  return cmd.prompt(rest);
}

/** Palette candidates for the current draft (typed after "/"). */
export function matchCommands(draft: string): LiaCommand[] {
  const text = draft.trim();
  if (!text.startsWith("/")) return [];
  const body = text.slice(1);
  if (/\s/.test(body)) return [];
  return LIA_COMMANDS.filter((c) => c.command.startsWith(body));
}
