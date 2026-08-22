"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";
import UsageMeter from "../UsageMeter";
import AboutModal from "../AboutModal";
import ConnectPanel from "../ConnectPanel";
import { ActivityView } from "./ActivityView";
import { AnswerCard } from "./AnswerCard";
import { ClarifyCard } from "./ClarifyCard";
import { HomeState } from "./HomeState";
import { Mascot } from "./Mascot";
import { PlanCard } from "./PlanCard";
import { ToolTrace } from "./ToolTrace";
import type { LiaAgentHandle } from "./useLiaAgent";
import type { LiaMessage, LiaResourceState, LiaSurface } from "./types";

interface LiaPanelProps {
  surface: LiaSurface;
  scopeLabel: string;
  resource?: string;
  detail?: string;
  state?: LiaResourceState;
  agent: LiaAgentHandle;
  /** standalone /chat mount: panel fills the viewport, no floating chrome, no close button */
  fullPage?: boolean;
  onClose?: () => void;
}

export function LiaPanel({ surface, scopeLabel, resource, detail, state, agent, fullPage, onClose }: LiaPanelProps) {
  const [view, setView] = useState<"chat" | "activity">("chat");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"connected" | "demo" | "docs" | null>(null);

  // Lia embed (docs-site): the host page prefills the composer via
  // postMessage { type: "lia-prefill", text } — never auto-sends.
  // Origin allowlist: this app's own origin plus the docs fork when
  // NEXT_PUBLIC_DOCS_SITE_ORIGIN is configured. When that env is unset, only
  // non-production builds additionally accept the embedding host's origin
  // from document.referrer, so the docs-site on another port works in local
  // dev without env config. Foreign origins are ignored.
  useEffect(() => {
    const selfOrigin = window.location.origin;
    // Docs fork origin when configured; otherwise (env unset, non-production
    // only) the embedding host from document.referrer. Malformed → reject.
    let trustedOrigin: string | null = null;
    try {
      trustedOrigin = process.env.NEXT_PUBLIC_DOCS_SITE_ORIGIN
        ? new URL(process.env.NEXT_PUBLIC_DOCS_SITE_ORIGIN).origin
        : process.env.NODE_ENV !== "production" && document.referrer
          ? new URL(document.referrer).origin
          : null;
    } catch {
      trustedOrigin = null;
    }
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== selfOrigin && e.origin !== trustedOrigin) return;
      const data = e.data as { type?: unknown; text?: unknown } | null;
      if (!data || data.type !== "lia-prefill" || typeof data.text !== "string") return;
      const text = data.text.trim();
      if (text) {
        setDraft(text);
        (e.source as Window | null)?.postMessage({ type: "lia-prefill-ack" }, e.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [agent.messages, agent.status, view]);

  // auto-grow composer
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const submit = () => {
    if (draft.trim().length === 0 || agent.isBusy) return;
    agent.ask(draft);
    setDraft("");
  };

  // Console mode sync: connect/disconnect inside the widget panel also
  // notifies the /console host (ConsoleHome listens for "liara-mode") so its
  // apps list/phase don't go stale. Other surfaces have no listener.
  const handleModeChange = (m: "connected" | "demo" | "docs") => {
    setMode(m);
    window.dispatchEvent(new CustomEvent("liara-mode", { detail: m }));
  };

  const renderMessage = (m: LiaMessage, i: number) => {
    switch (m.kind) {
      case "user":
        return (
          <div key={m.id} className="flex justify-start">
            <p className="max-w-[85%] rounded-2xl rounded-ss-md bg-[var(--accent-soft)] px-3 py-2 text-[13px] leading-6 text-[var(--text)]">
              {m.text}
            </p>
          </div>
        );
      case "trace":
        return <ToolTrace key={m.id} steps={m.steps} variant={m.variant} />;
      case "answer":
        return (
          <AnswerCard
            key={m.id}
            text={m.text}
            citations={m.citations}
            streaming={agent.isBusy && i === agent.messages.length - 1}
          />
        );
      case "clarify":
        return (
          <ClarifyCard
            key={m.id}
            question={m.question}
            options={m.options}
            answered={m.answered}
            onAnswer={(optionId) => agent.respond(m.requestId, optionId)}
          />
        );
      case "plan":
        return (
          <PlanCard
            key={m.id}
            summary={m.summary}
            changes={m.changes}
            options={m.options}
            status={m.status}
            onAnswer={(optionId) => agent.respond(m.requestId, optionId)}
          />
        );
    }
  };

  return (
    <div
      role={fullPage ? undefined : "dialog"}
      aria-label="لیا، دستیار عملیاتی لیارا"
      dir="rtl"
      className={
        fullPage
          ? "pointer-events-auto flex h-full w-full max-w-4xl flex-col overflow-hidden bg-[var(--bg-raised)] text-[var(--text)]"
          : "pointer-events-auto flex max-h-[min(78vh,660px)] w-[min(100vw-1.5rem,27.5rem)] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text)] shadow-2xl shadow-black/40"
      }
    >
      <header className="flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-2.5">
        <Mascot mood={agent.mood} size={32} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-[var(--text)]">لیا</p>
          <p className="text-[11px] leading-tight text-[var(--text-dim)]">
            {mode === "connected"
              ? "متصل به حساب شما"
              : mode === "demo"
                ? "حالت دمو"
                : surface === "docs"
                  ? "دستیار مستندات لیارا"
                  : "اپراتور عملیاتی لیارا"}
          </p>
        </div>

        <div className="ms-auto flex items-center gap-1">
          <div className="flex rounded-lg bg-[var(--bg)] p-0.5" role="tablist" aria-label="نمای پنل">
            {(["chat", "activity"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={[
                  "rounded-md px-2.5 py-1 text-[11.5px] transition",
                  view === v ? "bg-[var(--bg-raised)] text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {v === "chat" ? "گفت‌وگو" : "فعالیت"}
              </button>
            ))}
          </div>
          <AboutModal />
          <button
            type="button"
            onClick={agent.reset}
            aria-label="گفت‌وگوی جدید"
            className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/50 px-3 py-2 text-[11.5px]">
        <span className="shrink-0 rounded-md bg-[var(--bg-raised)] px-1.5 py-0.5 text-[var(--text-dim)]">{scopeLabel}</span>
        {resource && (
          <span dir="ltr" className="truncate font-mono text-[var(--text-dim)]">
            {resource}
          </span>
        )}
        {detail && <span className="truncate text-[var(--text-dim)]">{detail}</span>}
        {state === "failed" && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--err)]/15 px-1.5 py-0.5 text-[var(--err)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--err)]" aria-hidden />
            ناموفق
          </span>
        )}
        {state === "ok" && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--ok)]/15 px-1.5 py-0.5 text-[var(--ok)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" aria-hidden />
            سالم
          </span>
        )}
        <div className="ms-auto shrink-0">
          <ConnectPanel onChanged={handleModeChange} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === "activity" ? (
          <ActivityView messages={agent.messages} />
        ) : agent.messages.length === 0 ? (
          <HomeState scopeLabel={scopeLabel} resource={resource} detail={detail} state={state} onAsk={agent.ask} />
        ) : (
          <div className="space-y-3.5 p-3">
            {agent.messages.map(renderMessage)}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {view === "chat" && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-raised)] p-2.5">
          {agent.status === "error" && (
            <div className="mb-2 rounded-xl border border-[var(--err)] bg-[var(--err)]/10 px-3 py-2 text-center text-[12px] text-[var(--err)]">
              خطا در ارتباط با ایجنت: {agent.error?.message ?? "نامشخص"} — دوباره تلاش کنید
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1.5 focus-within:border-[var(--accent)]"
          >
            <textarea
              ref={taRef}
              value={draft}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={agent.isBusy ? "لیا در حال کار است…" : "از لیا بپرسید…"}
              aria-label="پیام به لیا"
              className="max-h-[120px] min-h-[38px] flex-1 resize-none bg-transparent py-1.5 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
            />
            {agent.isBusy ? (
              <button
                type="button"
                onClick={agent.cancel}
                className="flex h-7 shrink-0 items-center gap-1 rounded-full border border-[var(--err)] px-2.5 text-[11.5px] text-[var(--err)] transition hover:bg-[var(--err)]/10"
              >
                <Square className="h-3 w-3" />
                توقف
              </button>
            ) : (
              <button
                type="submit"
                disabled={draft.trim().length === 0}
                aria-label="ارسال"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[#0c1214] transition disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </form>
          <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
            <UsageMeter />
            <p className="text-[10.5px] leading-4 text-[var(--text-dim)]">
              پاسخ‌ها از مستندات رسمی لیارا ساخته می‌شوند. تغییرات فقط با تأیید شما اجرا می‌شوند.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
