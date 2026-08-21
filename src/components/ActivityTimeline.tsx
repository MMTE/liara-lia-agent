"use client";

import { useState } from "react";
import type { ToolPartInfo } from "./Message";

const TOOL_LABELS: Record<string, string> = {
  search_docs: "جستجوی مستندات",
  read_doc: "خواندن مستند",
  "liara-paas__getApps": "دریافت لیست اپ‌ها",
  "liara-paas__getAppByName": "بررسی اپ",
  "liara-paas__getAppLogs": "خواندن لاگ‌ها",
  "liara-paas__getAppEvents": "بررسی رخدادها",
  "liara-paas__getAppReleases": "بررسی ریلیزها",
  "liara-paas__getAppCpuReports": "گزارش CPU",
  "liara-paas__getAppMemoryReports": "گزارش حافظه",
  "liara-paas__getAppSummaryReports": "گزارش کلی",
  "liara-paas__restartApp": "ری‌استارت اپ",
  "liara-paas__updateEnvs": "تغییر متغیرها",
  "liara-paas__releasesDeploy": "دیپلوی ریلیز",
  "liara-dbaas__getListDatabases": "لیست دیتابیس‌ها",
  "liara-dbaas__getDatabase": "بررسی دیتابیس",
  ask_question: "سوال از کاربر",
};

function statusIcon(state: string): string {
  if (state.includes("approval")) return "⚠️";
  if (state.includes("output") || state.includes("result") || state.includes("available")) return "✅";
  return "⏳";
}

export default function ActivityTimeline({ tools }: { tools: ToolPartInfo[] }) {
  const [open, setOpen] = useState(false);
  const done = tools.filter((t) => t.state.includes("output") || t.state.includes("result")).length;

  return (
    <div className="w-full md:w-[78%] mr-auto rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2 text-[12.5px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[var(--text-dim)] hover:text-[var(--text)]"
      >
        <span>
          🔧 اقدامات ایجنت <span className="text-[11px]">({done}/{tools.length})</span>
        </span>
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5 border-r border-[var(--border)] pr-3">
          {tools.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span>{statusIcon(t.state)}</span>
              <span className={t.state.includes("approval") ? "text-[var(--warn)]" : ""}>
                {TOOL_LABELS[t.toolName] ?? t.toolName}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
