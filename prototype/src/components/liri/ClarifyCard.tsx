import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { Clarify } from '../../types/agent';

interface ClarifyCardProps {
  clarify: Clarify;
  answered?: string;
  onSelect: (label: string) => void;
}

export function ClarifyCard({ clarify, answered, onSelect }: ClarifyCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2.5 flex items-start gap-2 text-[13px] text-zinc-200">
        <HelpCircle className="mt-1 h-3.5 w-3.5 shrink-0 text-violet-300" />
        {clarify.question}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {clarify.options.map((o) => {
          const selected = answered === o.label;
          return (
            <button
              key={o.id}
              type="button"
              disabled={!!answered}
              onClick={() => onSelect(o.label)}
              className={[
              'rounded-xl border p-2.5 text-right transition',
              selected ?
              'border-violet-400/60 bg-violet-500/10' :
              answered ?
              'border-white/5 opacity-40' :
              'border-white/10 hover:border-violet-400/50 hover:bg-white/5'].
              join(' ')}>
              
              <span className="ltr block text-[12.5px] font-medium text-zinc-100">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-[11.5px] text-zinc-500">{o.hint}</span>}
            </button>);

        })}
      </div>
    </section>);

}