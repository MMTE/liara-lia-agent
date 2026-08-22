"use client";

import { FileText, PenLine, Search } from "lucide-react";
import type { LiaMessage, ToolKind } from "./types";

const icons: Record<ToolKind, React.ComponentType<{ className?: string }>> = {
  read: Search,
  docs: FileText,
  write: PenLine,
};

const tone: Record<ToolKind, string> = {
  read: "text-[var(--text-dim)] bg-[var(--bg-raised)]",
  docs: "text-[var(--accent)] bg-[var(--accent-soft)]",
  write: "text-[var(--warn)] bg-[var(--warn)]/10",
};

export function ActivityView({ messages }: { messages: LiaMessage[] }) {
  // flatten all trace steps, newest first
  const entries = messages
    .filter((m): m is Extract<LiaMessage, { kind: "trace" }> => m.kind === "trace")
    .flatMap((m) => m.steps)
    .reverse();

  if (entries.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[12.5px] text-[var(--text-dim)]">
        هنوز عملیاتی ثبت نشده است. هر خواندن، جست‌وجو یا تغییری که لیا انجام دهد اینجا ثبت می‌شود.
      </div>
    );
  }

  return (
    <div className="p-3">
      <p className="mb-2 px-1 text-[11px] text-[var(--text-dim)]">امروز</p>
      <ol className="space-y-1">
        {entries.map((e, i) => {
          const Icon = icons[e.kind] ?? Search;
          return (
            <li key={`${e.tool}-${i}`} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[var(--bg-raised)]">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tone[e.kind] ?? tone.read}`}>
                <Icon className="h-3 w-3" />
              </span>
              <span className="truncate text-[12.5px] text-[var(--text)]">{e.label}</span>
              <code className="ms-2 hidden shrink-0 rounded bg-[var(--bg-raised)] px-1.5 py-px font-mono text-[10px] text-[var(--text-dim)] sm:block">
                {e.tool}
              </code>
              <span className="ms-auto shrink-0 text-[11px] text-[var(--text-dim)]">—</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
