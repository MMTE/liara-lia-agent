import React from 'react';
import { Activity, AlertOctagon, Boxes, Database, GitBranch, Globe, Puzzle, Settings } from 'lucide-react';

interface DashboardProps {
  onAsk: (text: string, scenarioId?: string) => void;
}

const deployments = [
{ id: '#۱۸۴', commit: '8f21c0a', message: 'add rate limiter', status: 'failed', time: '۹:۳۸' },
{ id: '#۱۸۳', commit: '2b7de41', message: 'update deps', status: 'success', time: 'دیروز' },
{ id: '#۱۸۲', commit: 'a91f0c5', message: 'fix cors', status: 'success', time: 'دیروز' }];


const buildLog = [
'npm ERR! code EBADENGINE',
'npm ERR! notsup Unsupported engine for my-api@1.4.0',
'npm ERR! required: { node: ">=20.0.0" }',
'npm ERR! current:  { node: "v18.20.4" }',
'build failed with exit code 1'];


export function Dashboard({ onAsk }: DashboardProps) {
  return (
    <div className="min-h-screen w-full bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 lg:px-8">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-[13px] font-bold text-white">
            L
          </span>
          <span className="text-[14px] font-semibold text-zinc-900">کنسول لیارا</span>
          <nav className="hidden items-center gap-1 text-[13px] text-zinc-600 md:flex">
            {['برنامه‌ها', 'پایگاه داده', 'ذخیره‌سازی', 'دامنه‌ها'].map((n, i) =>
            <a key={n} href="#" className={`rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 ${i === 0 ? 'text-zinc-900' : ''}`}>
                {n}
              </a>
            )}
          </nav>
          <span className="ms-auto flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11.5px] text-violet-700">
            <Puzzle className="h-3.5 w-3.5" />
            افزونه لیری فعال است
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="ltr text-[20px] font-bold text-zinc-900">my-api</h1>
          <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[11.5px] text-white">production</span>
          <span className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-0.5 text-[11.5px] text-red-600">
            <AlertOctagon className="h-3.5 w-3.5" />
            آخرین استقرار ناموفق
          </span>
          <button
            type="button"
            onClick={() => onAsk('چرا؟', 'diagnose-deploy')}
            className="ms-auto rounded-xl bg-zinc-900 px-3 py-1.5 text-[12.5px] text-white transition hover:bg-zinc-800">
            
            عیب‌یابی با لیری
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-zinc-900">
              <GitBranch className="h-4 w-4 text-zinc-400" />
              استقرارها
            </h2>
            <ul className="divide-y divide-zinc-100">
              {deployments.map((d) =>
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <span className="num text-[12.5px] text-zinc-500">{d.id}</span>
                  <code className="ltr rounded bg-zinc-100 px-1.5 py-px font-mono text-[11px] text-zinc-600">
                    {d.commit}
                  </code>
                  <span className="ltr truncate text-[12.5px] text-zinc-700">{d.message}</span>
                  <span
                  className={`ms-auto rounded-md px-2 py-0.5 text-[11px] ${
                  d.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`
                  }>
                  
                    {d.status === 'failed' ? 'ناموفق' : 'موفق'}
                  </span>
                  <span className="w-12 text-left text-[11px] text-zinc-400">{d.time}</span>
                </li>
              )}
            </ul>

            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
              <p className="border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11.5px] text-zinc-500">
                لاگ ساخت استقرار ‎#۱۸۴
              </p>
              <pre className="ltr overflow-x-auto bg-zinc-950 p-3 text-left font-mono text-[11.5px] leading-6 text-red-300">
                {buildLog.join('\n')}
              </pre>
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-zinc-900">
                <Settings className="h-4 w-4 text-zinc-400" />
                پیکربندی
              </h2>
              <dl className="space-y-2 text-[12.5px]">
                {[
                ['پلتفرم', 'Node.js 18'],
                ['پورت', '3000'],
                ['دستور ساخت', 'npm ci && npm run build'],
                ['منطقه', 'ایران'],
                ['پلن', 'standard']].
                map(([k, v]) =>
                <div key={k} className="flex items-start gap-3">
                    <dt className="w-20 shrink-0 text-zinc-500">{k}</dt>
                    <dd className="ltr font-mono text-[11.5px] text-zinc-800">{v}</dd>
                  </div>
                )}
              </dl>
              <button
                type="button"
                onClick={() => onAsk('این پیکربندی را برایم توضیح بده.', 'explain-config')}
                className="mt-3 w-full rounded-xl border border-zinc-200 py-1.5 text-[12px] text-zinc-700 transition hover:border-violet-300 hover:text-violet-700">
                
                توضیح این پیکربندی با لیری
              </button>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-zinc-900">
                <Boxes className="h-4 w-4 text-zinc-400" />
                منابع متصل
              </h2>
              <ul className="space-y-2 text-[12.5px] text-zinc-700">
                <li className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-zinc-400" />
                  دیتابیسی متصل نیست
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="ltr">my-api.liara.run</span>
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-zinc-400" />
                  بدون health check
                </li>
              </ul>
              <button
                type="button"
                onClick={() => onAsk('یک دیتابیس PostgreSQL بساز و به my-api وصلش کن.', 'provision-db')}
                className="mt-3 w-full rounded-xl border border-zinc-200 py-1.5 text-[12px] text-zinc-700 transition hover:border-violet-300 hover:text-violet-700">
                
                ساخت دیتابیس با لیری
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>);

}