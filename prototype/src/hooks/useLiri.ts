import { useCallback, useRef, useState } from 'react';
import type { ActivityEntry, Message, Mood, Scenario, Surface } from '../types/agent';
import { matchScenario, scenarioById } from '../data/scenarios';

let seq = 0;
const uid = (p: string) => `${p}-${++seq}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function useLiri(surface: Surface) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<Mood>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const pending = useRef<Scenario | null>(null);

  const push = useCallback((m: Message) => setMessages((prev) => [...prev, m]), []);

  const patch = useCallback((id: string, updater: (m: Message) => Message) => {
    setMessages((prev) => prev.map((m) => m.id === id ? updater(m) : m));
  }, []);

  const logActivity = useCallback((entry: Omit<ActivityEntry, 'id' | 'time'>) => {
    setActivity((prev) => [{ id: uid('act'), time: now(), ...entry }, ...prev]);
  }, []);

  const runSteps = useCallback(
    async (sc: Scenario) => {
      const traceId = uid('trace');
      push({
        id: traceId,
        role: 'agent',
        kind: 'trace',
        intent: sc.intent,
        steps: sc.steps,
        activeIndex: 0,
        done: false
      });
      for (let i = 0; i < sc.steps.length; i++) {
        await sleep(sc.steps[i].durationMs);
        patch(traceId, (m) => m.kind === 'trace' ? { ...m, activeIndex: i + 1 } : m);
      }
      patch(traceId, (m) => m.kind === 'trace' ? { ...m, done: true } : m);
      logActivity({ title: sc.intent, kind: 'read' });
    },
    [push, patch, logActivity]
  );

  const continueScenario = useCallback(
    async (sc: Scenario) => {
      setBusy(true);
      setMood('thinking');
      setSuggestions([]);
      await runSteps(sc);
      push({ id: uid('ans'), role: 'agent', kind: 'answer', answer: sc.answer });

      if (sc.plan) {
        setMood('warning');
        push({
          id: uid('plan'),
          role: 'agent',
          kind: 'plan',
          scenarioId: sc.id,
          plan: sc.plan,
          status: 'pending'
        });
      } else {
        setMood('idle');
        if (sc.proactive) {
          push({ id: uid('pro'), role: 'agent', kind: 'proactive', text: sc.proactive.text, cta: sc.proactive.cta });
        }
        setSuggestions(sc.suggestions);
      }
      setBusy(false);
    },
    [push, runSteps]
  );

  const ask = useCallback(
    async (text: string, scenarioId?: string) => {
      if (busy) return;
      const sc = scenarioId ? scenarioById(scenarioId) ?? matchScenario(text, surface) : matchScenario(text, surface);
      push({ id: uid('u'), role: 'user', text });

      if (sc.clarify) {
        setBusy(true);
        setMood('thinking');
        await sleep(700);
        pending.current = sc;
        push({ id: uid('cl'), role: 'agent', kind: 'clarify', clarify: sc.clarify });
        setBusy(false);
        setMood('idle');
        return;
      }
      await continueScenario(sc);
    },
    [busy, surface, push, continueScenario]
  );

  const answerClarify = useCallback(
    async (messageId: string, label: string) => {
      const sc = pending.current;
      pending.current = null;
      patch(messageId, (m) => m.kind === 'clarify' ? { ...m, answered: label } : m);
      push({ id: uid('u'), role: 'user', text: label });
      if (sc) await continueScenario({ ...sc, clarify: undefined });
    },
    [patch, push, continueScenario]
  );

  const rejectPlan = useCallback(
    (messageId: string) => {
      patch(messageId, (m) => m.kind === 'plan' ? { ...m, status: 'rejected' } : m);
      push({
        id: uid('t'),
        role: 'agent',
        kind: 'text',
        text: 'باشد، هیچ تغییری اعمال نشد. اگر خواستید می‌توانم فقط دستورهای معادل CLI را برایتان بنویسم.'
      });
      setMood('idle');
    },
    [patch, push]
  );

  const approvePlan = useCallback(
    async (messageId: string, scenarioId: string) => {
      const sc = scenarioById(scenarioId);
      if (!sc || !sc.verify) return;
      patch(messageId, (m) => m.kind === 'plan' ? { ...m, status: 'approved' } : m);
      setBusy(true);
      setMood('thinking');

      const runId = uid('run');
      push({ id: runId, role: 'agent', kind: 'run', steps: sc.verify, activeIndex: 0, done: false });
      for (let i = 0; i < sc.verify.length; i++) {
        await sleep(sc.verify[i].durationMs);
        patch(runId, (m) => m.kind === 'run' ? { ...m, activeIndex: i + 1 } : m);
        logActivity({ title: sc.verify[i].label, kind: sc.verify[i].kind });
      }
      patch(runId, (m) => m.kind === 'run' ? { ...m, done: true, summary: sc.verifiedMessage } : m);
      setMood('success');

      if (sc.proactive) {
        await sleep(600);
        push({ id: uid('pro'), role: 'agent', kind: 'proactive', text: sc.proactive.text, cta: sc.proactive.cta });
      }
      setSuggestions(sc.suggestions);
      setBusy(false);
    },
    [patch, push, logActivity]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setMood('idle');
    pending.current = null;
  }, []);

  return {
    messages,
    activity,
    busy,
    mood,
    suggestions,
    ask,
    answerClarify,
    approvePlan,
    rejectPlan,
    reset,
    setMood
  };
}