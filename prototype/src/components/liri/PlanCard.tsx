import React from 'react';
import { AlertTriangle, ArrowLeft, ShieldCheck, X } from 'lucide-react';
import type { AgentPlan, ChangeRisk } from '../../types/agent';
import { Button } from '../ui/Button';

const riskStyles: Record<ChangeRisk, {label: string;className: string;}> = {
  safe: { label: 'بی‌خطر', className: 'bg-emerald-500/10 text-emerald-300' },
  caution: { label: 'نیازمند تأیید', className: 'bg-amber-500/10 text-amber-300' },
  danger: { label: 'مخرب', className: 'bg-red-500/10 text-red-300' }
};

interface PlanCardProps {
  plan: AgentPlan;
  status: 'pending' | 'approved' | 'rejected';
  onApprove: () => void;
  onReject: () => void;
}

export function PlanCard({ plan, status, onApprove, onReject }: PlanCardProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-400/[0.04]"
      aria-label="بازبینی تغییرات پیشنهادی">
      
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <ShieldCheck className="h-4 w-4 text-amber-300" />
        <h3 className="text-[13px] font-semibold text-white">بازبینی تغییرات</h3>
        <span className="num ms-auto rounded-full bg-white/5 px-2 py-0.5 text-[10.5px] text-zinc-400">
          {plan.changes.length} تغییر
        </span>
      </header>

      <div className="space-y-3 p-3">
        <div>
          <p className="text-[13px] font-medium text-zinc-100">{plan.title}</p>
          <p className="mt-0.5 text-[12px] text-zinc-400">{plan.summary}</p>
        </div>

        <ol className="space-y-2">
          {plan.changes.map((c, i) =>
          <li key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <div className="flex items-center gap-2">
                <span className="num flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[11px] text-zinc-400">
                  {i + 1}
                </span>
                <p className="text-[12.5px] text-zinc-100">{c.title}</p>
                <span className={`ms-auto rounded px-1.5 py-0.5 text-[10px] ${riskStyles[c.risk].className}`}>
                  {riskStyles[c.risk].label}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 ps-7">
                <code className="ltr rounded bg-white/5 px-1.5 py-px font-mono text-[10.5px] text-zinc-400">
                  {c.tool}
                </code>
                {(c.before || c.after) &&
              <span className="flex items-center gap-1.5 text-[11.5px]">
                    {c.before && <span className="text-zinc-500 line-through">{c.before}</span>}
                    {c.before && <ArrowLeft className="h-3 w-3 text-zinc-600" />}
                    {c.after && <span className="text-emerald-300">{c.after}</span>}
                  </span>
              }
              </div>
            </li>
          )}
        </ol>

        <p className="flex items-start gap-1.5 text-[11.5px] text-zinc-400">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
          {plan.note}
        </p>

        {status === 'pending' ?
        <div className="flex gap-2 pt-0.5">
            <Button size="sm" className="flex-1 bg-white text-zinc-900 hover:bg-zinc-200" onClick={onApprove}>
              تأیید و اجرا
            </Button>
            <Button
            size="sm"
            variant="ghost"
            className="text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            onClick={onReject}>
            
              <X className="me-1 h-3.5 w-3.5" />
              انصراف
            </Button>
          </div> :

        <p
          className={`rounded-lg px-2.5 py-1.5 text-[12px] ${
          status === 'approved' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-zinc-400'}`
          }>
          
            {status === 'approved' ? 'تغییرات تأیید شد و اجرا گردید.' : 'اجرای تغییرات لغو شد.'}
          </p>
        }
      </div>
    </section>);

}