"use client";

import { ChevronLeft, CircleDot } from "lucide-react";
import type { LiaraProject } from "./types";

/** Status → badge color: healthy greens, failure reds, everything else zinc. */
const STATUS_COLORS: [RegExp, string][] = [
  [/run|ok|ready|active|deploy/i, "bg-emerald-50 text-emerald-700"],
  [/fail|error|down|crash|stop/i, "bg-red-50 text-red-600"],
];

function statusColor(status: string | undefined): string {
  for (const [re, cls] of STATUS_COLORS) if (re.test(status ?? "")) return cls;
  return "bg-zinc-100 text-zinc-600";
}

interface AppsListProps {
  apps: LiaraProject[];
  onSelect: (name: string) => void;
}

/** Connected-mode list of the account's Liara apps (spec getApps fields). */
export function AppsList({ apps, onSelect }: AppsListProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-zinc-900">
        <CircleDot className="h-4 w-4 text-zinc-400" />
        برنامه‌های شما
      </h2>
      {apps.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-zinc-500">
          برنامه‌ای در این حساب پیدا نشد. از کنسول لیارا یک برنامه بساز تا اینجا ببینی‌اش.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {apps.map((app) => (
            <li key={app._id ?? app.project_id}>
              <button
                type="button"
                onClick={() => app.project_id && onSelect(app.project_id)}
                className="flex w-full items-center gap-3 py-2.5 text-start transition hover:bg-zinc-50"
              >
                <span className="ltr font-mono text-[12.5px] font-medium text-zinc-800">
                  {app.project_id ?? "—"}
                </span>
                <span className="rounded-md bg-zinc-100 px-1.5 py-px font-mono text-[11px] text-zinc-500">
                  {app.type ?? "?"}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] ${statusColor(app.status)}`}>
                  {app.status ?? "نامشخص"}
                </span>
                <span className="ms-auto flex items-center gap-2 text-[11.5px] text-zinc-400">
                  {app.planID && <span className="ltr font-mono">{app.planID}</span>}
                  <ChevronLeft className="h-4 w-4 text-zinc-300 rtl:rotate-0" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
