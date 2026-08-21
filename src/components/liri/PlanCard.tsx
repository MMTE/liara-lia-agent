"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { HitlOption, PlanChange, PlanRisk } from "./types";

const riskStyles: Record<PlanRisk, { label: string; className: string }> = {
  safe: { label: "بی‌خطر", className: "bg-[var(--ok)]/10 text-[var(--ok)]" },
  caution: { label: "نیازمند تأیید", className: "bg-[var(--warn)]/10 text-[var(--warn)]" },
};

/** same approve detection as the main chat (Chat.tsx HitlCard) */
const APPROVE_RE = /approve|تأیید|بله|yes/i;

interface PlanCardProps {
  summary: string;
  changes: PlanChange[];
  options: HitlOption[];
  status: "pending" | "approved" | "rejected";
  onAnswer: (optionId: string) => void;
}

export function PlanCard({ summary, changes, options, status, onAnswer }: PlanCardProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-[var(--warn)]/25 bg-[var(--warn)]/[0.04]"
      aria-label="بازبینی تغییرات پیشنهادی"
    >
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <ShieldCheck className="h-4 w-4 text-[var(--warn)]" />
        <h3 className="text-[13px] font-semibold text-[var(--text)]">بازبینی تغییرات</h3>
        <span className="ms-auto rounded-full bg-[var(--bg-raised)] px-2 py-0.5 text-[10.5px] text-[var(--text-dim)]">
          {changes.length} تغییر
        </span>
      </header>

      <div className="space-y-3 p-3">
        <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-[var(--text)]">{summary}</p>

        <ol className="space-y-2">
          {changes.map((c, i) => (
            <li key={`${c.tool}-${i}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--bg-raised)] text-[11px] text-[var(--text-dim)]">
                  {i + 1}
                </span>
                <p className="text-[12.5px] text-[var(--text)]">{c.label}</p>
                <span className={`ms-auto rounded px-1.5 py-0.5 text-[10px] ${riskStyles[c.risk]?.className ?? riskStyles.caution.className}`}>
                  {(riskStyles[c.risk] ?? riskStyles.caution).label}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 ps-7">
                <code className="rounded bg-[var(--bg-raised)] px-1.5 py-px font-mono text-[10.5px] text-[var(--text-dim)]">
                  {c.tool}
                </code>
                {c.detail && (
                  <code dir="ltr" className="truncate rounded bg-[var(--bg-raised)] px-1.5 py-px font-mono text-[10.5px] text-[var(--text-dim)]">
                    {c.detail}
                  </code>
                )}
              </div>
            </li>
          ))}
        </ol>

        <p className="flex items-start gap-1.5 text-[11.5px] text-[var(--text-dim)]">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-[var(--warn)]" />
          هیچ عملیات مخربی انجام نمی‌شود؛ تغییرات فقط با تأیید شما اجرا می‌شوند.
        </p>

        {status === "pending" ? (
          <div className="flex gap-2 pt-0.5">
            {options.map((o) =>
              APPROVE_RE.test(o.label) ? (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onAnswer(o.id)}
                  className="flex-1 rounded-xl bg-[var(--ok)]/15 px-3 py-1.5 text-[12.5px] font-medium text-[var(--ok)] transition hover:bg-[var(--ok)]/25"
                >
                  {o.label}
                </button>
              ) : (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onAnswer(o.id)}
                  className="flex-1 rounded-xl border border-[var(--border)] px-3 py-1.5 text-[12.5px] text-[var(--text-dim)] transition hover:text-[var(--text)]"
                >
                  {o.label}
                </button>
              )
            )}
          </div>
        ) : (
          <p
            className={[
              "rounded-lg px-2.5 py-1.5 text-[12px]",
              status === "approved" ? "bg-[var(--ok)]/10 text-[var(--ok)]" : "bg-[var(--bg-raised)] text-[var(--text-dim)]",
            ].join(" ")}
          >
            {status === "approved" ? "تغییرات تأیید شد و اجرا گردید." : "اجرای تغییرات لغو شد."}
          </p>
        )}
      </div>
    </section>
  );
}
