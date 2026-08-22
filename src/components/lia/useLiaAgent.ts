"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEveAgent, type UseEveAgentStatus } from "eve/react";
import { mapConversation } from "@/lib/lia-events";
import { meterTurn, STORAGE_KEY } from "@/lib/turn-meter";
import { listChats, upsertChat, deleteChat as deleteStoredChat, migrateLegacyChat, type ChatHistoryEntry } from "@/lib/chat-history";
import type { LiaMessage, LiaMood } from "./types";

interface SavedChat {
  events?: unknown[];
  session?: { sessionId: string; streamIndex: number };
}

function loadSaved(): SavedChat {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedChat) : {};
  } catch {
    return {};
  }
}

/** First user message of a conversation — the history-list title. Takes the
 *  reducer's message projection (role/parts), NOT raw stream events. */
function deriveTitle(messages: unknown[]): string {
  const mapped = mapConversation(messages as never[]) as LiaMessage[];
  const first = mapped.find((m): m is Extract<LiaMessage, { kind: "user" }> => m.kind === "user");
  return first?.text.slice(0, 80) ?? "گفت‌وگو با لیا";
}

/** stream error → error · busy → thinking · pending plan → warning · finished verify trace → success · else idle */
function deriveMood(messages: LiaMessage[], isBusy: boolean, isError: boolean): LiaMood {
  if (isError) return "error";
  if (isBusy) return "thinking";
  if (messages.some((m) => m.kind === "plan" && m.status === "pending")) return "warning";
  const lastTrace = [...messages].reverse().find((m): m is Extract<LiaMessage, { kind: "trace" }> => m.kind === "trace");
  if (lastTrace && lastTrace.variant === "verify" && lastTrace.steps.every((s) => s.state === "done")) return "success";
  return "idle";
}

export interface LiaAgentHandle {
  messages: LiaMessage[];
  status: UseEveAgentStatus;
  isBusy: boolean;
  error: Error | undefined;
  mood: LiaMood;
  ask: (text: string) => void;
  respond: (requestId: string, optionId: string) => void;
  cancel: () => void;
  reset: () => void;
  /** persisted past conversations, newest-first (refreshed after each turn) */
  history: ChatHistoryEntry[];
  /** drop a stored conversation from the picker (never the active stream) */
  forgetChat: (id: string) => void;
}

/**
 * Thin adapter over `useEveAgent` mirroring Chat.tsx: persists the stream
 * snapshot under STORAGE_KEY on finish, meters each turn identically and
 * upserts the conversation into the shared history list (chat-history.js).
 */
export function useLiaAgent(): LiaAgentHandle {
  const [saved] = useState<SavedChat>(loadSaved);
  const [history, setHistory] = useState<ChatHistoryEntry[]>(() => listChats());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration guard for client-only state
    setMounted(true);
  }, []);
  // Pre-history conversations were never listed: resurrect the legacy
  // STORAGE_KEY snapshot once so it appears in گفت‌وگوهای قبلی.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time storage migration on mount
    if (migrateLegacyChat()) setHistory(listChats());
  }, []);

  const agent = useEveAgent({
    initialEvents: (saved.events ?? []) as never[],
    initialSession: saved.session as never,
    onFinish(snapshot) {
      const payload: SavedChat = {
        events: snapshot.events as unknown[],
        session: snapshot.session as SavedChat["session"],
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        /* storage full — non-fatal */
      }
      const id = payload.session?.sessionId;
      if (id && Array.isArray(payload.events) && payload.events.length > 0) {
        upsertChat({
          id,
          title: deriveTitle((snapshot.data.messages as unknown[]) ?? []),
          updatedAt: Date.now(),
          snapshot: payload,
        });
        setHistory(listChats());
      }
      meterTurn(snapshot.events as unknown[], snapshot.status);
    },
  });

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const messages = useMemo(
    () => mapConversation(agent.data.messages as never[]) as LiaMessage[],
    [agent.data.messages]
  );
  const mood = useMemo(
    () => (mounted ? deriveMood(messages, isBusy, agent.status === "error") : "idle"),
    [mounted, messages, isBusy, agent.status]
  );

  const ask = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || isBusy) return;
      void agent.send(trimmed);
    },
    [agent, isBusy]
  );

  const respond = useCallback(
    (requestId: string, optionId: string) => {
      void agent.respond([{ requestId, optionId } as never]);
    },
    [agent]
  );

  const cancel = useCallback(() => {
    void agent.cancel();
  }, [agent]);

  // eve/react exposes reset(): detaches the stream, recreates the session and
  // clears events/data — pair it with dropping the persisted snapshot. The
  // finished conversation stays in the history list (upserted on finish).
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing persisted — non-fatal */
    }
    agent.reset();
  }, [agent]);

  const forgetChat = useCallback((id: string) => {
    deleteStoredChat(id);
    setHistory(listChats());
  }, []);

  return { messages, status: agent.status, isBusy, error: agent.error, mood, ask, respond, cancel, reset, history, forgetChat };
}

