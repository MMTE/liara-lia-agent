"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEveAgent, type UseEveAgentStatus } from "eve/react";
import { mapConversation } from "@/lib/lia-events";
import { meterTurn, STORAGE_KEY } from "@/lib/turn-meter";
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
}

/**
 * Thin adapter over `useEveAgent` mirroring Chat.tsx: persists the stream
 * snapshot under STORAGE_KEY on finish and meters each turn identically.
 */
export function useLiaAgent(): LiaAgentHandle {
  const [saved] = useState<SavedChat>(loadSaved);
  // hydration guard: localStorage-restored messages must not leak into SSR output
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const agent = useEveAgent({
    initialEvents: (saved.events ?? []) as never[],
    initialSession: saved.session as never,
    onFinish(snapshot) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: snapshot.events, session: snapshot.session }));
      } catch {
        /* storage full — non-fatal */
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
  // clears events/data — pair it with dropping the persisted snapshot.
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing persisted — non-fatal */
    }
    agent.reset();
  }, [agent]);

  return { messages, status: agent.status, isBusy, error: agent.error, mood, ask, respond, cancel, reset };
}
