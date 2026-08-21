import React from 'react';
import { articles } from '../data/docs';
import { DocsHeader } from '../components/docs/DocsHeader';
import { DocsSidebar } from '../components/docs/DocsSidebar';
import { ArticleView } from '../components/docs/ArticleView';

interface DocsProps {
  slug: string;
  onSelect: (slug: string) => void;
  onAsk: (text: string, scenarioId?: string) => void;
}

export function Docs({ slug, onSelect, onAsk }: DocsProps) {
  const article = articles[slug] ?? articles.nodejs;

  return (
    <div className="min-h-screen w-full bg-white">
      <DocsHeader onAskLiri={() => onAsk('چطور یک برنامه Node.js را روی لیارا مستقر کنم؟', 'deploy-node')} />

      <div className="mx-auto flex max-w-[1400px] gap-8 px-4 lg:px-8">
        <DocsSidebar active={article.slug} onSelect={onSelect} />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl">
            <ArticleView article={article} onAskAbout={onAsk} />
          </div>
        </main>

        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 py-8 xl:block">
          <p className="mb-3 text-[11.5px] font-semibold text-zinc-400">در این صفحه</p>
          <ul className="space-y-1.5 border-e border-zinc-200 pe-3 text-[12.5px] text-zinc-500">
            {article.blocks.
            filter((b) => b.type === 'h2').
            map((b, i) =>
            <li key={i}>
                  <a href="#" className="block rounded px-1 py-0.5 hover:text-zinc-900">
                    {(b as {text: string;}).text}
                  </a>
                </li>
            )}
          </ul>
        </aside>
      </div>
    </div>);

}