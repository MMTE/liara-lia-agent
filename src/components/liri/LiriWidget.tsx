"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { LiriPanel } from "./LiriPanel";
import { Mascot } from "./Mascot";
import { useLiriAgent } from "./useLiriAgent";
import type { LiriResourceState, LiriSurface } from "./types";

export interface LiriRequest {
  text: string;
  /** increment to trigger a new request from outside the widget */
  nonce: number;
}

export interface LiriNudge {
  text: string;
  cta: string;
}

interface LiriWidgetProps {
  surface: LiriSurface;
  scopeLabel: string;
  resource?: string;
  detail?: string;
  state?: LiriResourceState;
  request?: LiriRequest;
  nudge?: LiriNudge;
  /** standalone /chat mount: render the panel inline filling the viewport, no floating bubble */
  fullPage?: boolean;
}

/**
 * Floating Liri launcher: collapsed bubble (bottom-left, physical `left` for
 * RTL), proactive nudge after 4s, and a nonce-triggered ask from the host page.
 */
export function LiriWidget({ surface, scopeLabel, resource, detail, state, request, nudge, fullPage }: LiriWidgetProps) {
  const agent = useLiriAgent();
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const handledNonce = useRef(request?.nonce ?? 0);

  useEffect(() => {
    if (!request || request.nonce === 0 || request.nonce === handledNonce.current) return;
    handledNonce.current = request.nonce;
    setOpen(true);
    setShowNudge(false);
    agent.ask(request.text);
  }, [request?.nonce, agent.ask]);

  useEffect(() => {
    if (!nudge) {
      setShowNudge(false);
      return;
    }
    const t = setTimeout(() => setShowNudge(true), 4000);
    return () => clearTimeout(t);
  }, [nudge]);

  // Standalone /chat mount: panel inline at full viewport height — the
  // bubble/nudge machinery only makes sense floating over a host page.
  if (fullPage) {
    return (
      <div className="flex h-[100dvh] w-full justify-center">
        <LiriPanel
          fullPage
          surface={surface}
          scopeLabel={scopeLabel}
          resource={resource}
          detail={detail}
          state={state}
          agent={agent}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="pointer-events-auto origin-bottom-left"
          >
            <LiriPanel
              surface={surface}
              scopeLabel={scopeLabel}
              resource={resource}
              detail={detail}
              state={state}
              agent={agent}
              onClose={() => setOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!open && showNudge && nudge && (
          <motion.div
            key="nudge"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            dir="rtl"
            className="pointer-events-auto w-[19rem] rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 text-[var(--text)] shadow-2xl shadow-black/40"
          >
            <div className="flex items-start gap-2.5">
              <Mascot mood="warning" size={30} />
              <p className="flex-1 text-[12.5px] leading-6 text-[var(--text)]">{nudge.text}</p>
              <button
                type="button"
                onClick={() => setShowNudge(false)}
                aria-label="بستن اعلان"
                className="rounded-md p-1 text-[var(--text-dim)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowNudge(false);
                setOpen(true);
              }}
              className="mt-2.5 w-full rounded-xl bg-[var(--accent)] py-1.5 text-[12.5px] font-medium text-[#0b0d14] transition hover:opacity-90"
            >
              {nudge.cta}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "بستن لیری" : "گفت‌وگو با لیری"}
        aria-expanded={open}
        className="pointer-events-auto group flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-raised)] py-1.5 pe-3 ps-1.5 text-[var(--text)] shadow-xl shadow-black/30 transition hover:border-[var(--accent)]"
      >
        <Mascot mood={agent.mood} size={34} float={!open} />
        <span className="text-[12.5px] group-hover:text-[var(--accent)]">{open ? "بستن" : "لیری"}</span>
        {!open && state === "failed" && <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" aria-hidden />}
      </button>
    </div>
  );
}
