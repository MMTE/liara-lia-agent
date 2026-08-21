import React from 'react';
import { Github, Search, Sparkles } from 'lucide-react';

interface DocsHeaderProps {
  onAskLiri: () => void;
}

export function DocsHeader({ onAskLiri }: DocsHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 lg:px-8">
        <a href="#" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-[13px] font-bold text-white">
            L
          </span>
          <span className="text-[14px] font-semibold text-zinc-900">مستندات لیارا</span>
        </a>

        <nav aria-label="بخش‌های اصلی" className="hidden items-center gap-1 text-[13px] text-zinc-600 md:flex">
          {['راهنما', 'پلتفرم برنامه', 'پایگاه داده', 'ذخیره‌سازی ابری', 'API'].map((n, i) =>
          <a
            key={n}
            href="#"
            className={`rounded-lg px-2.5 py-1.5 transition hover:bg-zinc-100 ${i === 1 ? 'text-zinc-900' : ''}`}>
            
              {n}
            </a>
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onAskLiri}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-zinc-500 transition hover:border-zinc-300">
            
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">جست‌وجو یا پرسش از لیری…</span>
            <kbd className="num hidden rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[10.5px] text-zinc-400 sm:inline">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={onAskLiri}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-[12.5px] text-white transition hover:bg-zinc-800">
            
            <Sparkles className="h-3.5 w-3.5" />
            پرسیدن از لیری
          </button>
          <a
            href="#"
            aria-label="مخزن گیت‌هاب"
            className="hidden rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:text-zinc-900 sm:block">
            
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>);

}