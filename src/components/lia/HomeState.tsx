"use client";

import { SCENARIOS } from "@/lib/scenarios";
import { Mascot } from "./Mascot";
import type { LiaResourceState } from "./types";

interface HomeStateProps {
  scopeLabel: string;
  resource?: string;
  detail?: string;
  state?: LiaResourceState;
  onAsk: (prompt: string) => void;
}

export function HomeState({ scopeLabel, resource, detail, state, onAsk }: HomeStateProps) {
  // scopeLabel intentionally not shown: the panel header subtitle already
  // carries it — repeating it here tripled the branding stack.
  const contextLine = [resource, detail].filter(Boolean).join(" · ");
  return (
    <div className="px-4 pb-2 pt-6">
      <div className="flex flex-col items-center text-center">
        <Mascot size={64} src="/lia/wave.gif" mood={state === "failed" ? "warning" : "idle"} />
        <h2 className="mt-3 text-[15px] font-semibold text-[var(--text)]">سلام! من لیا هستم</h2>
        {contextLine && <p className="mt-1 max-w-[19rem] text-[12px] text-[var(--text-dim)]">{contextLine}</p>}
        <p className="mt-1 max-w-[19rem] text-[12.5px] leading-6 text-[var(--text-dim)]">
          می‌توانم مستندات لیارا را بخوانم، منابع شما را بررسی کنم و با تأیید شما تغییرشان بدهم.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {SCENARIOS.slice(0, 6).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onAsk(s.promptFa)}
            className="flex flex-col items-start gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-3 text-right transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <span className="text-[12px] text-[var(--accent)]">{s.titleFa}</span>
            <span className="line-clamp-2 text-[12px] leading-5 text-[var(--text-dim)]">{s.promptFa}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
