import React from 'react';
import { docSections } from '../../data/docs';

interface DocsSidebarProps {
  active: string;
  onSelect: (slug: string) => void;
}

export function DocsSidebar({ active, onSelect }: DocsSidebarProps) {
  return (
    <nav aria-label="فهرست مستندات" className="docs-scroll sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-s border-zinc-200 py-6 pe-6 lg:block">
      <ul className="space-y-6">
        {docSections.map((section) =>
        <li key={section.title}>
            <p className="mb-2 text-[11.5px] font-semibold text-zinc-400">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
              const isActive = item.slug === active;
              return (
                <li key={item.slug}>
                    <button
                    type="button"
                    onClick={() => onSelect(item.slug)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                    'w-full rounded-lg px-2.5 py-1.5 text-right text-[13px] transition',
                    isActive ?
                    'bg-zinc-900 text-white' :
                    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'].
                    join(' ')}>
                    
                      {item.title}
                    </button>
                  </li>);

            })}
            </ul>
          </li>
        )}
      </ul>
    </nav>);

}