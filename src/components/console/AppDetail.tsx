"use client";

import { AlertOctagon, ArrowRight, GitBranch, Settings } from "lucide-react";
import { configRows, formatWhen, sortedReleases, type LiaraProject, type LiaraReleases } from "./types";

/** Release state → Persian label + badge color (spec `state` field). */
function releaseBadge(state: string | undefined): { label: string; cls: string } {
  if (state === "failed") return { label: "ناموفق", cls: "bg-red-50 text-red-600" };
  if (state === "ready") return { label: "موفق", cls: "bg-emerald-50 text-emerald-600" };
  if (state === "building") return { label: "در حال ساخت", cls: "bg-amber-50 text-amber-600" };
  return { label: state ?? "نامشخص", cls: "bg-zinc-100 text-zinc-600" };
}

interface AppDetailProps {
  name: string;
  app: LiaraProject | null;
  releases: LiaraReleases | null;
  /** demo mode: prototype's mock build log for the failed release */
  buildLog?: string[];
  onAsk: (text: string) => void;
  onBack?: () => void;
}

/**
 * Single-app view ported from prototype/src/pages/Dashboard.tsx: releases
 * timeline (failed → red badge + Lia banner), config summary and quick
 * actions that ask the page-level Lia widget.
 */
export function AppDetail({ name, app, releases, buildLog, onAsk, onBack }: AppDetailProps) {
  const list = sortedReleases(releases);
  const latest = list[0] ?? null;
  const failed = latest?.state === "failed";

  const quickActions: { label: string; prompt: string }[] = [
    { label: "چرا شکست خورد؟", prompt: `آخرین استقرار برنامه «${name}» را بررسی کن؛ اگر مشکلی هست ریشه‌اش را بگو.` },
    { label: "خلاصه لاگ‌ها", prompt: `لاگ‌های برنامه «${name}» را بررسی کن و مشکلات احتمالی را بگو.` },
    { label: "بررسی وضعیت", prompt: `وضعیت فعلی برنامه «${name}» را با رویدادهای اخیرش بررسی کن و خلاصه‌ای بگو.` },
  ];

  return (
    <div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-[12.5px] text-zinc-500 transition hover:text-zinc-800"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          همه برنامه‌ها
        </button>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="ltr text-[20px] font-bold text-zinc-900">{name}</h1>
        {app?.status && (
          <span className={`rounded-md px-2 py-0.5 text-[11.5px] ${app.status.match(/fail|error|down|crash/i) ? "bg-red-50 text-red-600" : "bg-zinc-900 text-white"}`}>
            {app.status}
          </span>
        )}
        {failed && (
          <span className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-0.5 text-[11.5px] text-red-600">
            <AlertOctagon className="h-3.5 w-3.5" />
            آخرین استقرار ناموفق
          </span>
        )}
      </div>

      {failed && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="flex-1 text-[12.5px] leading-6 text-red-700">
            آخرین استقرار این برنامه ناموفق بوده است. لیا می‌تواند لاگ‌ها و ریلیزها را بررسی کند و ریشه مشکل را بگوید.
          </p>
          <button
            type="button"
            onClick={() =>
              onAsk(`چرا آخرین استقرار ${name} شکست خورده؟ لاگ‌ها و ریلیزهاش را بررسی کن و ریشه مشکل را بگو.`)
            }
            className="rounded-xl bg-red-600 px-4 py-1.5 text-[12px] font-medium text-white transition hover:bg-red-700"
          >
            بررسی با لیا
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-zinc-900">
            <GitBranch className="h-4 w-4 text-zinc-400" />
            استقرارها
          </h2>
          {app === null && releases === null ? (
            <p className="py-4 text-center text-[12.5px] text-zinc-500">
              اطلاعات این برنامه در دسترس نیست. بعداً دوباره تلاش کن.
            </p>
          ) : list.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-zinc-500">استقراری برای این برنامه ثبت نشده است.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {list.map((release, i) => {
                const badge = releaseBadge(release.state);
                return (
                  <li key={release._id ?? i} className="flex items-center gap-3 py-2.5">
                    {release.gitInfo?.commit && (
                      <code className="ltr rounded bg-zinc-100 px-1.5 py-px font-mono text-[11px] text-zinc-600">
                        {release.gitInfo.commit}
                      </code>
                    )}
                    <span className="ltr truncate text-[12.5px] text-zinc-700" dir="ltr">
                      {release.gitInfo?.message ?? release.imageName ?? release.tag ?? "—"}
                    </span>
                    <span className={`ms-auto rounded-md px-2 py-0.5 text-[11px] ${badge.cls}`}>{badge.label}</span>
                    <span className="ltr w-24 text-left font-mono text-[11px] text-zinc-400">
                      {formatWhen(release.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {buildLog && buildLog.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
              <p className="border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11.5px] text-zinc-500">
                لاگ ساخت آخرین استقرار
              </p>
              <pre className="ltr overflow-x-auto bg-zinc-950 p-3 text-left font-mono text-[11.5px] leading-6 text-red-300">
                {buildLog.join("\n")}
              </pre>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-zinc-900">
              <Settings className="h-4 w-4 text-zinc-400" />
              پیکربندی
            </h2>
            {app === null ? (
              <p className="text-[12.5px] text-zinc-500">پیکربندی در دسترس نیست.</p>
            ) : (
              <dl className="space-y-2 text-[12.5px]">
                {configRows(app).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-3">
                    <dt className="w-20 shrink-0 text-zinc-500">{k}</dt>
                    <dd className="ltr font-mono text-[11.5px] text-zinc-800">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-[13.5px] font-semibold text-zinc-900">کارهای سریع با لیا</h2>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onAsk(action.prompt)}
                  className="w-full rounded-xl border border-zinc-200 py-1.5 text-[12px] text-zinc-700 transition hover:border-cyan-300 hover:text-cyan-700"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
