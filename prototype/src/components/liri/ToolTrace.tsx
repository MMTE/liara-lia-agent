import React, { useState } from 'react';
import { Check, ChevronDown, FileText, Loader2, PenLine, Search } from 'lucide-react';
import type { ToolKind, ToolStep } from '../../types/agent';

const kindIcon: Record<ToolKind, React.ComponentType<{className?: string;}>> = {
  read: Search,
  docs: FileText,
  write: PenLine
};

const kindLabel: Record<ToolKind, string> = {
  read: 'خواندن',
  docs: 'مستندات',
  write: 'نوشتن'
};

interface ToolTraceProps {
  title: string;
  steps: ToolStep[];
  activeIndex: number;
  done: boolean;
}

export function ToolTrace({ title, steps, activeIndex, done }: ToolTraceProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
      aria-label={`مراحل اجرای ابزار: ${title}`}>
      
      <header className="mb-2.5 flex items-center gap-2">
        {done ?
        <Check className="h-3.5 w-3.5 text-emerald-400" /> :

        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
        }
        <h3 className="text-[12.5px] font-medium text-zinc-200">{title}</h3>
        <span className="ms-auto num text-[11px] text-zinc-500">
          {Math.min(activeIndex, steps.length)}/{steps.length}
        </span>
      </header>

      <ol className="space-y-1.5">
        {steps.map((step, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex && !done ? 'active' : 'idle';
          const Icon = kindIcon[step.kind];
          const open = expanded === step.id;
          return (
            <li key={step.id}>
              <div
                className={[
                'flex items-start gap-2 rounded-lg px-2 py-1.5 transition',
                state === 'idle' ? 'opacity-40' : '',
                state === 'active' ? 'bg-violet-500/10' : ''].
                join(' ')}>
                
                <span className="mt-[3px]">
                  {state === 'done' ?
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> :
                  state === 'active' ?
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" /> :

                  <Icon className="h-3.5 w-3.5 text-zinc-500" />
                  }
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12.5px] text-zinc-200">{step.label}</p>
                    <code className="ltr rounded bg-white/5 px-1.5 py-px font-mono text-[10.5px] text-zinc-400">
                      {step.tool}
                    </code>
                    <span className="rounded bg-white/5 px-1.5 py-px text-[10px] text-zinc-500">
                      {kindLabel[step.kind]}
                    </span>
                  </div>
                  {state === 'done' && step.result &&
                  <p className="mt-0.5 text-[11.5px] text-zinc-500">{step.result}</p>
                  }
                  {state === 'done' && step.output &&
                  <>
                      <button
                      type="button"
                      onClick={() => setExpanded(open ? null : step.id)}
                      className="mt-1 flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"
                      aria-expanded={open}>
                      
                        <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
                        {open ? 'بستن خروجی' : 'نمایش خروجی خام'}
                      </button>
                      {open &&
                    <pre className="ltr mt-1.5 overflow-x-auto rounded-lg bg-black/50 p-2 text-left font-mono text-[11px] leading-5 text-zinc-400">
                          {step.output.join('\n')}
                        </pre>
                    }
                    </>
                  }
                </div>
              </div>
            </li>);

        })}
      </ol>
    </section>);

}