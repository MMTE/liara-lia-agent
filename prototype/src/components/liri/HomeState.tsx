import React from 'react';
import type { LiriContext } from '../../types/context';
import { Mascot } from './Mascot';

interface HomeStateProps {
  context: LiriContext;
  onAction: (prompt: string, scenarioId?: string) => void;
}

export function HomeState({ context, onAction }: HomeStateProps) {
  return (
    <div className="px-4 pb-2 pt-6">
      <div className="flex flex-col items-center text-center">
        <Mascot size={64} float mood={context.state === 'failed' ? 'warning' : 'idle'} />
        <h2 className="mt-3 text-[15px] font-semibold text-white">{context.headline}</h2>
        <p className="mt-1 max-w-[19rem] text-[12.5px] leading-6 text-zinc-400">
          می‌توانم مستندات لیارا را بخوانم، منابع شما را بررسی کنم و با تأیید شما تغییرشان بدهم.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {context.actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onAction(a.prompt, a.scenarioId)}
              className={[
              'group flex flex-col items-start gap-2 rounded-xl border p-3 text-right transition',
              a.tone === 'alert' ?
              'border-amber-400/30 bg-amber-400/[0.06] hover:bg-amber-400/[0.1]' :
              'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'].
              join(' ')}>
              
              <Icon className={`h-4 w-4 ${a.tone === 'alert' ? 'text-amber-300' : 'text-violet-300'}`} />
              <span className="text-[12.5px] leading-5 text-zinc-100">{a.label}</span>
            </button>);

        })}
      </div>
    </div>);

}