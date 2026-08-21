import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, Sparkles, X } from 'lucide-react';
import type { LiriContext } from '../../types/context';
import type { Message } from '../../types/agent';
import { useLiri } from '../../hooks/useLiri';
import { Mascot } from './Mascot';
import { HomeState } from './HomeState';
import { ToolTrace } from './ToolTrace';
import { AnswerCard } from './AnswerCard';
import { PlanCard } from './PlanCard';
import { RunCard } from './RunCard';
import { ClarifyCard } from './ClarifyCard';
import { ActivityView } from './ActivityView';

interface LiriPanelProps {
  context: LiriContext;
  liri: ReturnType<typeof useLiri>;
  onClose: () => void;
  onOpenDoc?: (path: string) => void;
}

export function LiriPanel({ context, liri, onClose, onOpenDoc }: LiriPanelProps) {
  const [view, setView] = useState<'chat' | 'activity'>('chat');
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [liri.messages, view]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || liri.busy) return;
    setDraft('');
    liri.ask(text);
  };

  const renderMessage = (m: Message) => {
    switch (m.role === 'user' ? 'user' : m.kind) {
      case 'user':
        return (
          <div key={m.id} className="flex justify-start">
            <p className="max-w-[85%] rounded-2xl rounded-ss-md bg-violet-500/15 px-3 py-2 text-[13px] leading-6 text-violet-50">
              {(m as Extract<Message, {role: 'user';}>).text}
            </p>
          </div>);

      case 'text':
        return (
          <p key={m.id} className="text-[13.5px] leading-7 text-zinc-200">
            {(m as Extract<Message, {kind: 'text';}>).text}
          </p>);

      case 'trace':{
          const t = m as Extract<Message, {kind: 'trace';}>;
          return <ToolTrace key={m.id} title={t.intent} steps={t.steps} activeIndex={t.activeIndex} done={t.done} />;
        }
      case 'answer':
        return (
          <AnswerCard
            key={m.id}
            answer={(m as Extract<Message, {kind: 'answer';}>).answer}
            onOpenDoc={onOpenDoc} />);


      case 'plan':{
          const p = m as Extract<Message, {kind: 'plan';}>;
          return (
            <PlanCard
              key={m.id}
              plan={p.plan}
              status={p.status}
              onApprove={() => liri.approvePlan(p.id, p.scenarioId)}
              onReject={() => liri.rejectPlan(p.id)} />);


        }
      case 'run':{
          const r = m as Extract<Message, {kind: 'run';}>;
          return <RunCard key={m.id} steps={r.steps} activeIndex={r.activeIndex} done={r.done} summary={r.summary} />;
        }
      case 'clarify':{
          const c = m as Extract<Message, {kind: 'clarify';}>;
          return (
            <ClarifyCard
              key={m.id}
              clarify={c.clarify}
              answered={c.answered}
              onSelect={(label) => liri.answerClarify(c.id, label)} />);


        }
      case 'proactive':{
          const p = m as Extract<Message, {kind: 'proactive';}>;
          return (
            <div key={m.id} className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.07] p-3">
            <p className="flex items-start gap-2 text-[13px] leading-7 text-zinc-100">
              <Sparkles className="mt-1.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
              {p.text}
            </p>
            <button
                type="button"
                onClick={() => liri.ask(p.cta)}
                className="mt-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] text-white transition hover:bg-white/20">
                
              {p.cta}
            </button>
          </div>);

        }
      default:
        return null;
    }
  };

  return (
    <div
      role="dialog"
      aria-label="لیری، دستیار عملیاتی لیارا"
      className="pointer-events-auto flex max-h-[min(78vh,660px)] w-[min(100vw-1.5rem,27.5rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/40">
      
      <header className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2.5">
        <Mascot mood={liri.mood} size={32} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-white">لیری</p>
          <p className="text-[11px] leading-tight text-zinc-500">دستیار عملیاتی لیارا</p>
        </div>

        <div className="ms-auto flex items-center gap-1">
          <div className="flex rounded-lg bg-white/5 p-0.5" role="tablist" aria-label="نمای پنل">
            {(['chat', 'activity'] as const).map((v) =>
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-md px-2.5 py-1 text-[11.5px] transition ${
              view === v ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'}`
              }>
              
                {v === 'chat' ? 'گفت‌وگو' : 'فعالیت'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={liri.reset}
            aria-label="گفت‌وگوی جدید"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200">
            
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200">
            
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-3 py-2 text-[11.5px]">
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-zinc-400">{context.scopeLabel}</span>
        <span className="ltr truncate font-mono text-zinc-300">{context.resource}</span>
        {context.state === 'failed' &&
        <span className="ms-auto shrink-0 rounded-md bg-red-500/15 px-1.5 py-0.5 text-red-300">ناموفق</span>
        }
        {context.state === 'ok' &&
        <span className="ms-auto shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">سالم</span>
        }
      </div>

      <div className="liri-scroll flex-1 overflow-y-auto">
        {view === 'activity' ?
        <ActivityView entries={liri.activity} /> :
        liri.messages.length === 0 ?
        <HomeState context={context} onAction={(prompt, id) => liri.ask(prompt, id)} /> :

        <div className="space-y-3.5 p-3">
            {liri.messages.map(renderMessage)}
            <div ref={bottomRef} />
          </div>
        }
      </div>

      {view === 'chat' &&
      <div className="border-t border-white/10 bg-zinc-950 p-2.5">
          {liri.suggestions.length > 0 && !liri.busy &&
        <div className="mb-2 flex flex-wrap gap-1.5">
              {liri.suggestions.map((s) =>
          <button
            key={s}
            type="button"
            onClick={() => liri.ask(s)}
            className="rounded-full border border-white/10 px-2.5 py-1 text-[11.5px] text-zinc-300 transition hover:border-violet-400/50 hover:text-white">
            
                  {s}
                </button>
          )}
            </div>
        }
          <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-1.5 focus-within:border-violet-400/50">
            <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={liri.busy ? 'لیری در حال کار است…' : 'از لیری بپرسید…'}
            aria-label="پیام به لیری"
            disabled={liri.busy}
            className="flex-1 bg-transparent py-1.5 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500 disabled:opacity-60" />
          
            <button
            type="submit"
            disabled={liri.busy || !draft.trim()}
            aria-label="ارسال"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-900 transition disabled:opacity-30">
            
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-1.5 px-1 text-[10.5px] text-zinc-600">
            پاسخ‌ها از مستندات رسمی لیارا ساخته می‌شوند. تغییرات فقط با تأیید شما اجرا می‌شوند.
          </p>
        </div>
      }
    </div>);

}