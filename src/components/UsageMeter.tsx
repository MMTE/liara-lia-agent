"use client";

import { useEffect, useState } from "react";

interface Stats {
  turns: number;
  tokensIn: number;
  tokensOut: number;
  cacheReadTokens: number;
  errors: number;
  p95Ms: number;
}

export default function UsageMeter() {
  const [stats, setStats] = useState<Stats | null>(null);

  // Gated (ADR-0009): hooks must run unconditionally (rules-of-hooks), so the
  // env check lives inside the effect — unset means no /api/stats polling.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USAGE_METER !== "1") return;
    let alive = true;
    const tick = () =>
      fetch("/api/stats")
        .then((r) => r.json())
        .then((s: Stats) => alive && setStats(s))
        .catch(() => null);
    void tick();
    const id = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (process.env.NEXT_PUBLIC_USAGE_METER !== "1" || !stats) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-[var(--text-dim)]" dir="rtl">
      <span>🏁 {stats.turns} نوبت</span>
      <span>↑ {(stats.tokensIn / 1000).toFixed(1)}k توکن ورودی</span>
      <span>↓ {(stats.tokensOut / 1000).toFixed(1)}k خروجی</span>
      {stats.cacheReadTokens > 0 && <span>⚡ {(stats.cacheReadTokens / 1000).toFixed(1)}k کش</span>}
      <span>⏱ p95 {stats.p95Ms}ms</span>
      {stats.errors > 0 && <span className="text-[var(--err)]">✖ {stats.errors} خطا</span>}
    </div>
  );
}
