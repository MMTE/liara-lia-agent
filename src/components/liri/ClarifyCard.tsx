"use client";

import { HelpCircle } from "lucide-react";
import type { HitlOption } from "./types";

interface ClarifyCardProps {
  question: string;
  options: HitlOption[];
  /** label of the chosen option once answered (null while pending) */
  answered: string | null;
  onAnswer: (optionId: string) => void;
}

export function ClarifyCard({ question, options, answered, onAnswer }: ClarifyCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)]/60 p-3">
      <p className="mb-2.5 flex items-start gap-2 text-[13px] text-[var(--text)]">
        <HelpCircle className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
        {question}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const selected = answered === o.label;
          return (
            <button
              key={o.id}
              type="button"
              disabled={!!answered}
              onClick={() => onAnswer(o.id)}
              className={[
                "rounded-xl border p-2.5 text-right transition",
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : answered
                    ? "border-[var(--border)] opacity-40"
                    : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]",
              ].join(" ")}
            >
              <span className="block text-[12.5px] font-medium text-[var(--text)]">{o.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
