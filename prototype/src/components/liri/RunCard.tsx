import React from 'react';
import { Check, Loader2, PartyPopper } from 'lucide-react';
import type { ToolStep } from '../../types/agent';

interface RunCardProps {
  steps: ToolStep[];
  activeIndex: number;
  done: boolean;
  summary?: string;
}

export function RunCard({ steps, activeIndex, done, summary }: RunCardProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04]"
      aria-label="اجرای تغییرات"
      aria-live="polite">
      
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        {done ?
        <Check className="h-4 w-4 text-emerald-400" /> :

        <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
        }
        <h3 className="text-[13px] font-semibold text-white">{done ? 'اجرا کامل شد' : 'در حال اجرا…'}</h3>
      </header>

      <ol className="space-y-1 p-3">
        {steps.map((s, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex && !done ? 'active' : 'idle';
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 rounded-lg px-1.5 py-1.5 ${state === 'idle' ? 'opacity-40' : ''}`}>
              
              {state === 'done' ?
              <Check className="h-3.5 w-3.5 text-emerald-400" /> :
              state === 'active' ?
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" /> :

              <span className="h-3.5 w-3.5 rounded-full border border-zinc-600" aria-hidden />
              }
              <span className="text-[12.5px] text-zinc-200">{s.label}</span>
              {state === 'done' && s.result &&
              <span className="ms-auto text-[11.5px] text-zinc-500">{s.result}</span>
              }
            </li>);

        })}
      </ol>

      {done && summary &&
      <p className="flex items-center gap-2 border-t border-white/10 px-3 py-2.5 text-[12.5px] text-emerald-200">
          <PartyPopper className="h-3.5 w-3.5" />
          {summary}
        </p>
      }
    </section>);

}