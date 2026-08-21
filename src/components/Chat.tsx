"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import { SCENARIOS } from "@/lib/scenarios";
import Message, { type ChatMessage } from "./Message";
import ConnectPanel from "./ConnectPanel";
import UsageMeter from "./UsageMeter";
import AboutModal from "./AboutModal";

interface HitlOption {
  id: string;
  label: string;
}

interface HitlRequest {
  requestId: string;
  kind: string;
  prompt: string;
  options: HitlOption[];
}

interface SavedChat {
  events?: unknown[];
  session?: { sessionId: string; streamIndex: number };
}

const STORAGE_KEY = "liara-agent-chat";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pendingHitl(messages: ChatMessage[]): HitlRequest[] {
  const requests: HitlRequest[] = [];
  for (const m of messages) {
    for (const p of m.parts) {
      if (!isObj(p) || p.type !== "dynamic-tool" || p.state !== "approval-requested") continue;
      const meta = isObj(p.toolMetadata) ? (isObj(p.toolMetadata.eve) ? p.toolMetadata.eve : null) : null;
      const req = meta ? (isObj(meta.inputRequest) ? meta.inputRequest : null) : null;
      if (!req || typeof req.requestId !== "string") continue;
      requests.push({
        requestId: req.requestId,
        kind: typeof req.kind === "string" ? req.kind : "tool-approval",
        prompt: typeof req.prompt === "string" ? req.prompt : "تأیید لازم است",
        options: Array.isArray(req.options)
          ? req.options
              .filter(isObj)
              .filter((o) => typeof o.id === "string")
              .map((o) => ({
                id: o.id as string,
                label: typeof o.label === "string" ? o.label : (o.id as string),
              }))
          : [],
      });
    }
  }
  return requests;
}

function HitlCard({ request, onAnswer }: { request: HitlRequest; onAnswer: (optionId: string) => void }) {
  const isApproval = request.kind === "tool-approval";
  return (
    <div className="mr-auto w-full rounded-2xl border border-[var(--warn)] bg-[#fbbf2412] px-4 py-3 md:w-[78%]">
      <div className="mb-1 flex items-center gap-2 text-[13px] font-bold text-[var(--warn)]">
        {isApproval ? "⚠️ نیاز به تأیید شما" : "❓ سوال ایجنت"}
      </div>
      <p className="mb-3 whitespace-pre-wrap text-[14px]">{request.prompt}</p>
      <div className="flex flex-wrap gap-2">
        {request.options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onAnswer(o.id)}
            className={`rounded-lg border px-3.5 py-1.5 text-[13px] transition ${
              /approve|تأیید|بله|yes/i.test(o.label)
                ? "border-[var(--ok)] bg-[#4ade8018] text-[var(--ok)] hover:bg-[#4ade8030]"
                : "border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-1.5 self-end rounded-2xl border border-[var(--border)] bg-[var(--bg-bubble-agent)] px-4 py-3">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-dim)]" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-dim)]" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-dim)]" />
    </div>
  );
}

/** Post per-turn usage (parsed from stream events) to the stats endpoint. */
function meterTurn(events: unknown[], status: string): void {
  try {
    let tokensIn = 0;
    let tokensOut = 0;
    let cacheRead = 0;
    const tools: string[] = [];
    for (const raw of events) {
      if (!isObj(raw) || typeof raw.type !== "string" || !isObj(raw.data)) continue;
      if (raw.type === "step.completed" && isObj(raw.data.usage)) {
        const u = raw.data.usage as Record<string, unknown>;
        tokensIn += typeof u.inputTokens === "number" ? u.inputTokens : 0;
        tokensOut += typeof u.outputTokens === "number" ? u.outputTokens : 0;
        cacheRead += typeof u.cacheReadTokens === "number" ? u.cacheReadTokens : 0;
      }
      if (raw.type === "actions.requested" && Array.isArray(raw.data.actions)) {
        for (const a of raw.data.actions as unknown[]) {
          if (isObj(a) && typeof a.toolName === "string") tools.push(a.toolName);
        }
      }
    }
    void fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokensIn,
        tokensOut,
        cacheReadTokens: cacheRead,
        tools,
        error: status === "error",
      }),
    });
  } catch {
    /* metering best-effort */
  }
}

export default function Chat() {
  const [saved] = useState<SavedChat>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedChat) : {};
    } catch {
      return {};
    }
  });

  // Hydration guard: localStorage-restored events differ from SSR output.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // ?embed=1 (Chrome extension iframe): compact chrome-less mode
  const [embed] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "1"
  );

  // Liri embed (docs-site): the host page prefills the composer via
  // postMessage { type: "liri-prefill", text } — never auto-sends.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: unknown; text?: unknown } | null;
      if (!data || data.type !== "liri-prefill" || typeof data.text !== "string") return;
      const text = data.text.trim();
      if (text) {
        setDraft(text);
        (e.source as Window | null)?.postMessage({ type: "liri-prefill-ack" }, e.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const agent = useEveAgent({
    initialEvents: (saved.events ?? []) as never[],
    initialSession: saved.session as never,
    onFinish(snapshot) {
      (window as unknown as Record<string, unknown>).__dbgFinish = JSON.stringify({
        status: snapshot.status,
        dataMessages: snapshot.data?.messages?.length ?? -1,
        events: (snapshot.events as unknown[])?.length ?? -1,
      });
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ events: snapshot.events, session: snapshot.session })
        );
      } catch {
        /* storage full — non-fatal */
      }
      meterTurn(snapshot.events as unknown[], snapshot.status);
    },
  });

  const [draft, setDraft] = useState("");
  const [hasSent, setHasSent] = useState(false);
  const [mode, setMode] = useState<string>("docs");
  const scroller = useRef<HTMLDivElement>(null);
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const messages = useMemo(() => agent.data.messages as ChatMessage[], [agent.data.messages]);
  const hitlRequests = useMemo(() => pendingHitl(messages), [messages]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, agent.status, hitlRequests.length]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || isBusy) return;
      setHasSent(true);
      setDraft("");
      void agent.send(trimmed);
    },
    [agent, isBusy]
  );

  const answer = useCallback(
    (requestId: string, optionId: string) => {
      void agent.respond([{ requestId, optionId } as never]);
    },
    [agent]
  );

  return (
    <div className="mx-auto flex h-[100dvh] max-w-4xl flex-col">
      {!embed && (
        <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">✦ ایجنت لیارا</span>
            <span className="hidden text-[11px] text-[var(--text-dim)] sm:inline">
              {mode === "connected" ? "اپراتور حساب شما" : mode === "demo" ? "اپراتور (دمو)" : "دستیار مستندات"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectPanel onChanged={(m) => setMode(m)} />
            <AboutModal />
          </div>
        </header>
      )}

      <div ref={scroller} className="flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-4 md:px-6">
        {!mounted ? null : !hasSent && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-2 text-center">
            <div>
              <h1 className="mb-2 text-2xl font-bold md:text-3xl">✦ ایجنت لیارا</h1>
              <p className="max-w-lg text-[14px] leading-8 text-[var(--text-dim)]">
                اپراتور هوشمند ابر لیارا — مستندات را می‌خواند، به حساب شما وصل می‌شود،
                لاگ و دیپلوی را بررسی می‌کند و تا رفع مشکل همراه‌تان است.
              </p>
            </div>
            <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
              {SCENARIOS.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => send(s.promptFa)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] px-3.5 py-3 text-right text-[13px] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                >
                  <span className="mb-0.5 block text-[12px] text-[var(--accent)]">{s.titleFa}</span>
                  <span className="line-clamp-2 text-[var(--text-dim)]">{s.promptFa}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {agent.status === "submitted" && <Typing />}
            {hitlRequests.map((r) => (
              <HitlCard key={r.requestId} request={r} onAnswer={(oid) => answer(r.requestId, oid)} />
            ))}
          </>
        )}

        {agent.status === "error" && (
          <div className="mx-auto rounded-xl border border-[var(--err)] bg-[#f8717112] px-4 py-2.5 text-center text-[13px] text-[var(--err)]">
            خطا در ارتباط با ایجنت: {agent.error?.message ?? "نامشخص"} — دوباره تلاش کنید
          </div>
        )}
      </div>

      {hasSent && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 md:px-6 [scrollbar-width:none]">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={isBusy}
              onClick={() => send(s.promptFa)}
              className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[12px] text-[var(--text-dim)] transition hover:border-[var(--accent)] hover:text-[var(--text)] disabled:opacity-40"
            >
              {s.titleFa}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3 md:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            placeholder="سوال خود را بپرسید… (Shift+Enter برای خط جدید)"
            className="max-h-40 min-h-[46px] flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--accent)]"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => void agent.cancel()}
              className="h-[46px] shrink-0 rounded-2xl border border-[var(--err)] px-4 text-[13px] text-[var(--err)] transition hover:bg-[#f8717118]"
            >
              توقف
            </button>
          ) : (
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              className="h-[46px] shrink-0 rounded-2xl bg-[var(--accent)] px-5 text-[14px] font-bold text-[#0b0d14] transition hover:opacity-90 disabled:opacity-40"
            >
              ارسال
            </button>
          )}
        </form>
        <div className="mt-2 flex items-center justify-between">
          <UsageMeter />
          <a
            href="https://docs.liara.ir"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-dim)] hover:text-[var(--accent)]"
          >
            docs.liara.ir
          </a>
        </div>
      </div>
    </div>
  );
}
