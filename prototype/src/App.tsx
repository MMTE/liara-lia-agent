import React, { useMemo, useState } from 'react';
import { BookOpen, Bug, Database, FileQuestion, LayoutDashboard, Server, ShieldQuestion, Terminal } from 'lucide-react';
import { Docs } from './pages/Docs';
import { Dashboard } from './pages/Dashboard';
import { Liri, type LiriRequest, type ProactiveNudge } from './components/liri/Liri';
import { articles } from './data/docs';
import type { LiriContext } from './types/context';
import type { Surface } from './types/agent';

export function App() {
  const [surface, setSurface] = useState<Surface>('docs');
  const [slug, setSlug] = useState('nodejs');
  const [request, setRequest] = useState<LiriRequest>({ text: '', nonce: 0 });

  const ask = (text: string, scenarioId?: string) =>
  setRequest((r) => ({ text, scenarioId, nonce: r.nonce + 1 }));

  const openDoc = (path: string) => {
    const match = Object.values(articles).find((a) => a.path === path);
    setSurface('docs');
    if (match) setSlug(match.slug);
  };

  const article = articles[slug] ?? articles.nodejs;

  const context: LiriContext = useMemo(() => {
    if (surface === 'docs') {
      return {
        surface,
        scopeLabel: 'مستندات',
        resource: article.path,
        headline: 'درباره مستندات لیارا چه بپرسم؟',
        actions: [
        {
          id: 'a1',
          label: 'استقرار Node.js را توضیح بده',
          prompt: 'چطور یک برنامه Node.js را روی لیارا مستقر کنم؟',
          scenarioId: 'deploy-node',
          icon: Server
        },
        {
          id: 'a2',
          label: 'چرا برنامه‌ام خطای ۵۰۲ می‌دهد؟',
          prompt: 'بعد از دیپلوی، برنامه‌ام خطای ۵۰۲ می‌دهد. چرا؟',
          scenarioId: 'why-502',
          icon: Bug
        },
        {
          id: 'a3',
          label: 'خلاصه همین صفحه',
          prompt: `این صفحه را خلاصه کن: ${article.title}`,
          icon: BookOpen
        },
        {
          id: 'a4',
          label: 'دیتابیس PostgreSQL چطور بسازم؟',
          prompt: 'یک دیتابیس PostgreSQL بساز و به my-api وصلش کن.',
          scenarioId: 'provision-db',
          icon: Database
        }]

      };
    }
    return {
      surface,
      scopeLabel: 'کنسول لیارا',
      resource: 'production / my-api',
      state: 'failed',
      headline: 'استقرار ‎#۱۸۴ ناموفق بوده است',
      actions: [
      {
        id: 'b1',
        label: 'عیب‌یابی این استقرار',
        prompt: 'چرا؟',
        scenarioId: 'diagnose-deploy',
        icon: Bug,
        tone: 'alert'
      },
      {
        id: 'b2',
        label: 'توضیح این پیکربندی',
        prompt: 'این پیکربندی را برایم توضیح بده.',
        scenarioId: 'explain-config',
        icon: Terminal
      },
      {
        id: 'b3',
        label: 'ساخت دیتابیس و اتصال آن',
        prompt: 'یک دیتابیس PostgreSQL بساز و به my-api وصلش کن.',
        scenarioId: 'provision-db',
        icon: Database
      },
      {
        id: 'b4',
        label: 'مستندات مرتبط را نشان بده',
        prompt: 'بعد از دیپلوی، برنامه‌ام خطای ۵۰۲ می‌دهد. چرا؟',
        scenarioId: 'why-502',
        icon: FileQuestion
      }]

    };
  }, [surface, article]);

  const nudge: ProactiveNudge | undefined =
  surface === 'dashboard' ?
  {
    text: 'لیری دید که استقرار ‎#۱۸۴ در مرحله ساخت شکست خورده است. بررسی کنم؟',
    cta: 'بررسی کن',
    prompt: 'چرا؟',
    scenarioId: 'diagnose-deploy'
  } :
  undefined;

  return (
    <div dir="rtl" className="min-h-screen w-full bg-white text-zinc-900">
      {surface === 'docs' ?
      <Docs slug={slug} onSelect={setSlug} onAsk={ask} /> :

      <Dashboard onAsk={ask} />
      }

      <div className="pointer-events-none fixed bottom-5 left-0 right-0 z-40 flex justify-center">
        <div
          role="tablist"
          aria-label="سطح نمایش نمونه"
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-zinc-200 bg-white/90 p-1 shadow-lg shadow-black/5 backdrop-blur">
          
          {(
          [
          { id: 'docs', label: 'مستندات لیارا', icon: BookOpen },
          { id: 'dashboard', label: 'کنسول (افزونه کروم)', icon: LayoutDashboard }] as
          const).
          map((s) => {
            const Icon = s.icon;
            const active = surface === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSurface(s.id);
                  setRequest({ text: '', nonce: 0 });
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition ${
                active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`
                }>
                
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>);

          })}
          <span className="hidden items-center gap-1 px-2 text-[11px] text-zinc-400 sm:flex">
            <ShieldQuestion className="h-3.5 w-3.5" />
            نمونه تعاملی
          </span>
        </div>
      </div>

      <Liri key={surface} context={context} nudge={nudge} request={request} onOpenDoc={openDoc} />
    </div>);

}