"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { LiaPanel } from "./LiaPanel";
import { Mascot } from "./Mascot";
import { useLiaAgent } from "./useLiaAgent";
import { installChat } from "@/lib/chat-history";
import type { LiaResourceState, LiaSurface } from "./types";


export interface LiaRequest {
  text: string;
  /** increment to trigger a new request from outside the widget */
  nonce: number;
}

export interface LiaNudge {
  text: string;
  cta: string;
}

interface LiaWidgetProps {
  surface: LiaSurface;
  scopeLabel: string;
  resource?: string;
  detail?: string;
  state?: LiaResourceState;
  request?: LiaRequest;
  nudge?: LiaNudge;
  /** standalone /chat mount: render the panel inline filling the viewport, no floating bubble */
  fullPage?: boolean;
}

/**
 * Floating Lia launcher: collapsed bubble (bottom-left, physical `left` for
 * RTL), proactive nudge after 4s, and a nonce-triggered ask from the host page.
 * The panel expands into a full-height sidebar (variant toggle); when embedded
 * (docs fork / extension iframe), variant flips notify the host via
 * postMessage {type:"lia-size"} so the iframe container resizes too.
 */
export function LiaWidget({ surface, scopeLabel, resource, detail, state, request, nudge, fullPage }: LiaWidgetProps) {
  const [open, setOpen] = useState(false);
  // Panel ⇄ sidebar preference, persisted so the embed reopens as the user
  // left it (the embed iframe remounts on every open).
  const [variant, setVariant] = useState<"panel" | "sidebar">("panel");
  // Remount key: switching conversations (history picker) reinstalls the
  // stored snapshot under STORAGE_KEY, then remounts the hook to rehydrate.
  const [chatKey, setChatKey] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const handledNonce = useRef(request?.nonce ?? 0);
  // Cleared on remount: the agent hook re-reads STORAGE_KEY on init.
  const agentKey = `lia-${chatKey}`;

  const openChat = useCallback((id: string) => {
    if (installChat(id)) setChatKey((k) => k + 1);
  }, []);

  const toggleVariant = useCallback(() => {
    setVariant((v) => {
      const next = v === "panel" ? "sidebar" : "panel";
      try {
        localStorage.setItem("lia-variant", next);
      } catch {
        /* non-fatal */
      }
      // Tell the embedding host (docs fork / extension) to resize the iframe
      // container — same-origin /chat visits have no listener and ignore it.
      if (window.top !== window.self) {
        window.parent.postMessage({ type: "lia-size", size: next }, "*");
      }
      return next;
    });
  }, []);
  // Restore the persisted variant once on mount. Client-only persisted UI
  // preference: reading it during render would SSR-hydrate mismatched, so
  // the canonical effect+setState pattern is used deliberately.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe client-only pref restore
      if (localStorage.getItem("lia-variant") === "sidebar") setVariant("sidebar");
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    if (!request || request.nonce === 0 || request.nonce === handledNonce.current) return;
    handledNonce.current = request.nonce;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external host-page event (ask nonce) opens the panel
    setOpen(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- same external event dismisses the nudge
    setShowNudge(false);
  }, [request?.nonce]);

  useEffect(() => {
    if (!nudge) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs UI to an external prop (nudge removed)
      setShowNudge(false);
      return;
    }
    const t = setTimeout(() => setShowNudge(true), 4000);
    return () => clearTimeout(t);
  }, [nudge]);

  // Standalone /chat mount: panel inline at full viewport height — the
  // bubble/nudge machinery only makes sense floating over a host page.
  // The sidebar toggle still applies: embedded hosts resize their iframe
  // container via the lia-size message; direct visits just widen the panel.
  if (fullPage) {
    return (
      <div className="flex h-[100dvh] w-full justify-center">
        <LiaChatMount
          key={agentKey}
          surface={surface}
          scopeLabel={scopeLabel}
          resource={resource}
          detail={detail}
          state={state}
          request={request}
          variant={variant}
          fullPage
          onToggleVariant={toggleVariant}
          onOpenChat={openChat}
        />
      </div>
    );
  }

  // Sidebar mode: the panel pins flush to the left edge at full height.
  if (open && variant === "sidebar") {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/35"
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div className="fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(100vw,30rem)] flex-col">
          <LiaChatMount
            key={agentKey}
            surface={surface}
            scopeLabel={scopeLabel}
            resource={resource}
            detail={detail}
            state={state}
            request={request}
            variant="sidebar"
            onToggleVariant={toggleVariant}
            onOpenChat={openChat}
            onClose={() => setOpen(false)}
          />
        </div>
      </>
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
            <LiaChatMount
              key={agentKey}
              surface={surface}
              scopeLabel={scopeLabel}
              resource={resource}
              detail={detail}
              state={state}
              request={request}
              variant="panel"
              onToggleVariant={toggleVariant}
              onOpenChat={openChat}
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
              className="mt-2.5 w-full rounded-xl bg-[var(--accent)] py-1.5 text-[12.5px] font-medium text-[#10141f] transition hover:opacity-90"
            >
              {nudge.cta}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "بستن لیا" : "گفت‌وگو با لیا"}
        aria-expanded={open}
        className="pointer-events-auto group flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-raised)] py-1.5 pe-3 ps-1.5 text-[var(--text)] shadow-xl shadow-black/30 transition hover:border-[var(--accent)]"
      >
        <Mascot mood="idle" size={34} float={!open} />
        <span className="text-[12.5px] group-hover:text-[var(--accent)]">{open ? "بستن" : "لیا"}</span>
        {!open && state === "failed" && <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" aria-hidden />}
      </button>
    </div>
  );
}

/**
 * Panel + agent hook pair. One component so the `key` remount from the
 * history picker cleanly recreates both (hook re-reads STORAGE_KEY).
 */
function LiaChatMount(props: {
  surface: LiaSurface;
  scopeLabel: string;
  resource?: string;
  detail?: string;
  state?: LiaResourceState;
  request?: LiaRequest;
  fullPage?: boolean;
  variant: "panel" | "sidebar";
  onToggleVariant?: () => void;
  onOpenChat?: (id: string) => void;
  onClose?: () => void;
}) {
  const agent = useLiaAgent();
  // Host-page ask (AskLia pill / console nudge): send each new nonce once.
  // Initialized with the current nonce so a history-picker remount (new key)
  // never replays an old ask into the restored conversation.
  const askedNonce = useRef(props.request?.nonce ?? 0);
  useEffect(() => {
    const req = props.request;
    if (!req || req.nonce === 0 || req.nonce === askedNonce.current) return;
    askedNonce.current = req.nonce;
    if (!agent.isBusy) agent.ask(req.text);
  }, [props.request?.nonce, agent]);

  return (
    <LiaPanel
      surface={props.surface}
      scopeLabel={props.scopeLabel}
      resource={props.resource}
      detail={props.detail}
      state={props.state}
      agent={agent}
      fullPage={props.fullPage}
      variant={props.variant}
      onToggleVariant={props.onToggleVariant}
      onOpenChat={props.onOpenChat}
      onClose={props.onClose}
    />
  );
}
