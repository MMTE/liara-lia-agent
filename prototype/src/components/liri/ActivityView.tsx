import React from 'react';
import { FileText, PenLine, Search } from 'lucide-react';
import type { ActivityEntry, ToolKind } from '../../types/agent';

const icons: Record<ToolKind, React.ComponentType<{className?: string;}>> = {
  read: Search,
  docs: FileText,
  write: PenLine
};

const tone: Record<ToolKind, string> = {
  read: 'text-zinc-400 bg-white/5',
  docs: 'text-violet-300 bg-violet-500/10',
  write: 'text-amber-300 bg-amber-500/10'
};

export function ActivityView({ entries }: {entries: ActivityEntry[];}) {
  if (entries.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[12.5px] text-zinc-500">
        هنوز عملیاتی ثبت نشده است. هر خواندن، جست‌وجو یا تغییری که لیری انجام دهد اینجا ثبت می‌شود.
      </div>);

  }

  return (
    <div className="p-3">
      <p className="mb-2 px-1 text-[11px] text-zinc-500">امروز</p>
      <ol className="space-y-1">
        {entries.map((e) => {
          const Icon = icons[e.kind];
          return (
            <li key={e.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md ${tone[e.kind]}`}>
                <Icon className="h-3 w-3" />
              </span>
              <span className="text-[12.5px] text-zinc-200">{e.title}</span>
              <span className="num ms-auto text-[11px] text-zinc-500">{e.time}</span>
            </li>);

        })}
      </ol>
    </div>);

}