"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { TraceStep } from "./types";

const faNum = (n: number) => String(n).replace(/\d/g, (d) => "۱۲۳۴۵۶۷۸۹"[Number(d)]);

interface ToolTraceProps {
  steps: TraceStep[];
  variant: "inspect" | "verify";
}

/**
 * Light "thinking" element: one compact line while the agent works (live
 * step label), collapsing to a quiet summary line when finished. The full
 * step list is one click away — never rendered bulky by default.
 */
export function ToolTrace({ steps, variant }: ToolTraceProps) {
  const [open, setOpen] = useState(false);
  const done = steps.length > 0 && steps.every((s) => s.state === "done");
  const liveIndex = steps.reduce((acc, s, i) => (s.state === "active" ? i : acc), -1);
  const doneCount = steps.filter((s) => s.state === "done").length;
  const live = steps[liveIndex];
  const title = variant === "verify" ? "اجرا و راستی‌آزمایی" : "بررسی";

  return (
    <section aria-label={`مراحل اجرای ابزار: ${title}`} className="text-[11.5px] leading-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-start text-[var(--text-dim)] transition hover:bg-[var(--bg)]/60 hover:text-[var(--text)]"
      >
        {done ? (
          <Check className="h-3 w-3 shrink-0 text-[var(--ok)]" />
        ) : (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--accent)]" />
        )}
        <span className="shrink-0">{title}</span>
        {!done && live && (
          <>
            <span className="text-[var(--text-dim)]/60">·</span>
            <span className="min-w-0 truncate">{live.label}</span>
          </>
        )}
        {done && (
          <>
            <span className="text-[var(--text-dim)]/60">·</span>
            <span className="shrink-0">{faNum(doneCount)} مرحله</span>
          </>
        )}
        <ChevronDown
          className={[
            "ms-0.5 h-3 w-3 shrink-0 text-[var(--text-dim)] transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <ol className="mt-1 space-y-1 border-s border-[var(--border)] ps-3">
          {steps.map((step, i) => (
            <li key={`${step.tool}-${i}`} className="flex items-start gap-1.5">
              {step.state === "done" ? (
                <Check className="mt-1 h-2.5 w-2.5 shrink-0 text-[var(--ok)]" />
              ) : (
                <Loader2 className="mt-1 h-2.5 w-2.5 shrink-0 animate-spin text-[var(--accent)]" />
              )}
              <div className="min-w-0 flex-1">
                <span
                  className={[
                    step.state === "active" ? "text-[var(--text)]" : "text-[var(--text-dim)]",
                  ].join(" ")}
                >
                  {step.label}
                </span>
                {step.state === "done" && step.result && (
                  <span className="text-[var(--text-dim)]/70"> — {step.result}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
