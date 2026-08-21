"use client";

import { Check, Loader2 } from "lucide-react";
import type { ToolKind, TraceStep } from "./types";

const kindLabel: Record<ToolKind, string> = {
  read: "خواندن",
  docs: "مستندات",
  write: "نوشتن",
};

const faNum = (n: number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

interface ToolTraceProps {
  steps: TraceStep[];
  variant: "inspect" | "verify";
}

export function ToolTrace({ steps, variant }: ToolTraceProps) {
  const title = variant === "verify" ? "اجرا و راستی‌آزمایی" : "مراحل بررسی";
  const done = steps.length > 0 && steps.every((s) => s.state === "done");
  // last step still running is the live one
  const liveIndex = steps.reduce((acc, s, i) => (s.state === "active" ? i : acc), -1);
  const doneCount = steps.filter((s) => s.state === "done").length;

  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg)]/60 p-3"
      aria-label={`مراحل اجرای ابزار: ${title}`}
    >
      <header className="mb-2.5 flex items-center gap-2">
        {done ? (
          <Check className="h-3.5 w-3.5 text-[var(--ok)]" />
        ) : (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
        )}
        <h3 className="text-[12.5px] font-medium text-[var(--text)]">{title}</h3>
        <span className="ms-auto text-[11px] text-[var(--text-dim)]">
          {faNum(Math.min(doneCount, steps.length))}/{faNum(steps.length)}
        </span>
      </header>

      <ol className="space-y-1.5">
        {steps.map((step, i) => {
          const state = step.state;
          const live = i === liveIndex && !done;
          return (
            <li key={`${step.tool}-${i}`}>
              <div
                className={[
                  "flex items-start gap-2 rounded-lg px-2 py-1.5 transition",
                  live ? "bg-[var(--accent-soft)]" : "",
                ].join(" ")}
              >
                <span className="mt-[3px]">
                  {state === "done" ? (
                    <Check className="h-3.5 w-3.5 text-[var(--ok)]" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] text-[var(--text)]">{step.label}</p>
                    <code className="rounded bg-[var(--bg-raised)] px-1.5 py-px font-mono text-[10.5px] text-[var(--text-dim)]">
                      {step.tool}
                    </code>
                    <span className="rounded bg-[var(--bg-raised)] px-1.5 py-px text-[10px] text-[var(--text-dim)]">
                      {kindLabel[step.kind] ?? step.kind}
                    </span>
                  </div>
                  {state === "done" && step.result && (
                    <p className="mt-0.5 text-[11.5px] text-[var(--text-dim)]">{step.result}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
