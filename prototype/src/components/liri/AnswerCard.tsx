import React from 'react';
import { ArrowUpLeft, BookOpen } from 'lucide-react';
import type { AnswerBlock } from '../../types/agent';
import { CodeBlock } from '../CodeBlock';

interface AnswerCardProps {
  answer: AnswerBlock;
  onOpenDoc?: (path: string) => void;
}

export function AnswerCard({ answer, onOpenDoc }: AnswerCardProps) {
  return (
    <article className="space-y-3 text-[13.5px] leading-7 text-zinc-200">
      {answer.headline && <h3 className="text-[14px] font-semibold text-white">{answer.headline}</h3>}

      {answer.paragraphs.map((p, i) =>
      <p key={i}>{p}</p>
      )}

      {answer.bullets &&
      <ul className="space-y-1.5">
          {answer.bullets.map((b, i) =>
        <li key={i} className="flex gap-2">
              <span className="mt-[10px] h-1 w-1 shrink-0 rounded-full bg-violet-400" aria-hidden />
              <span className="text-[13px] text-zinc-300">{b}</span>
            </li>
        )}
        </ul>
      }

      {answer.code &&
      <CodeBlock tone="dark" lang={answer.code.lang} caption={answer.code.caption} code={answer.code.code} />
      }

      {answer.citations.length > 0 &&
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <BookOpen className="h-3 w-3" />
            منابع از مستندات لیارا
          </p>
          <ul className="space-y-1">
            {answer.citations.map((c) =>
          <li key={c.path}>
                <button
              type="button"
              onClick={() => onOpenDoc?.(c.path)}
              className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-right transition hover:bg-white/5">
              
                  <ArrowUpLeft className="h-3 w-3 shrink-0 text-violet-300" />
                  <span className="text-[12.5px] text-zinc-200 group-hover:text-white">
                    {c.title}
                    {c.section && <span className="text-zinc-500"> › {c.section}</span>}
                  </span>
                  <code className="ltr ms-auto hidden truncate font-mono text-[10.5px] text-zinc-500 sm:block">
                    /{c.path}
                  </code>
                </button>
              </li>
          )}
          </ul>
        </div>
      }
    </article>);

}