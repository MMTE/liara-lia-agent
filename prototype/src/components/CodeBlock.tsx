import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  lang: string;
  caption?: string;
  tone?: 'light' | 'dark';
}

export function CodeBlock({ code, lang, caption, tone = 'light' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const dark = tone === 'dark';

  return (
    <figure
      className={[
      'overflow-hidden rounded-xl border',
      dark ? 'border-white/10 bg-black/40' : 'border-zinc-200 bg-zinc-950'].
      join(' ')}>
      
      <figcaption
        className={[
        'flex items-center justify-between border-b px-3 py-1.5 text-[11px]',
        dark ? 'border-white/10 text-zinc-400' : 'border-white/10 text-zinc-400'].
        join(' ')}>
        
        <span className="font-mono ltr">{caption ?? lang}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
          aria-label="کپی کد">
          
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'کپی شد' : 'کپی'}</span>
        </button>
      </figcaption>
      <pre className="ltr overflow-x-auto p-3 text-left font-mono text-[12.5px] leading-6 text-zinc-100">
        <code>{code}</code>
      </pre>
    </figure>);

}