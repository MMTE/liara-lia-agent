import React from 'react';
import { AlertTriangle, Clock, Info, Sparkles } from 'lucide-react';
import type { DocArticle } from '../../data/docs';
import { CodeBlock } from '../CodeBlock';

interface ArticleViewProps {
  article: DocArticle;
  onAskAbout: (prompt: string, scenarioId?: string) => void;
}

export function ArticleView({ article, onAskAbout }: ArticleViewProps) {
  return (
    <article className="min-w-0 flex-1 py-8">
      <nav aria-label="مسیر" className="mb-3 flex items-center gap-1.5 text-[12px] text-zinc-400">
        <span>مستندات</span>
        <span aria-hidden>/</span>
        <span className="ltr font-mono text-[11.5px]">{article.path}</span>
      </nav>

      <h1 className="text-[26px] font-bold leading-relaxed text-zinc-900">{article.title}</h1>
      <p className="mt-2 text-[14px] leading-8 text-zinc-600">{article.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-5 text-[12px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {article.readTime} مطالعه
        </span>
        <span>آخرین به‌روزرسانی: {article.updated}</span>
        <button
          type="button"
          onClick={() => onAskAbout(`این صفحه را خلاصه کن: ${article.title}`)}
          className="ms-auto flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-700 transition hover:border-violet-300 hover:text-violet-700">
          
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          پرسیدن درباره این صفحه
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {article.blocks.map((block, i) => {
          switch (block.type) {
            case 'h2':
              return (
                <h2 key={i} className="pt-2 text-[18px] font-semibold text-zinc-900">
                  {block.text}
                </h2>);

            case 'p':
              return (
                <p key={i} className="text-[14px] leading-9 text-zinc-700">
                  {block.text}
                </p>);

            case 'list':
              return (
                <ul key={i} className="space-y-2">
                  {block.items.map((it, j) =>
                  <li key={j} className="flex gap-2.5 text-[14px] leading-8 text-zinc-700">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" aria-hidden />
                      <span>{it}</span>
                    </li>
                  )}
                </ul>);

            case 'code':
              return <CodeBlock key={i} lang={block.lang} caption={block.caption} code={block.code} />;
            case 'callout':
              return (
                <aside
                  key={i}
                  className={[
                  'rounded-xl border p-3.5',
                  block.tone === 'warn' ?
                  'border-amber-200 bg-amber-50' :
                  'border-sky-200 bg-sky-50'].
                  join(' ')}>
                  
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
                    {block.tone === 'warn' ?
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> :

                    <Info className="h-4 w-4 text-sky-600" />
                    }
                    {block.title}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-7 text-zinc-700">{block.text}</p>
                </aside>);

            default:
              return null;
          }
        })}
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-[13.5px] font-semibold text-zinc-900">هنوز به جواب نرسیدید؟</p>
        <p className="mt-1 text-[12.5px] leading-7 text-zinc-600">
          لیری می‌تواند همین سند را با شرایط پروژه شما تطبیق دهد و در صورت اتصال حساب، مستقیماً برنامه‌تان را بررسی کند.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
          { label: 'برنامه‌ام خطای ۵۰۲ می‌دهد', id: 'why-502' },
          { label: 'یک liara.json برایم بساز', id: 'deploy-node' },
          { label: 'حساب لیارا را وصل کن', id: undefined }].
          map((s) =>
          <button
            key={s.label}
            type="button"
            onClick={() => onAskAbout(s.label, s.id)}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-zinc-700 transition hover:border-violet-300 hover:text-violet-700">
            
              {s.label}
            </button>
          )}
        </div>
      </section>
    </article>);

}