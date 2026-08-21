"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import DocsSidebar, { type NavGroup } from "./DocsSidebar";
import ArticleView, { type DocsPage } from "./ArticleView";

interface DocsShellProps {
  nav: NavGroup[];
  page: DocsPage;
  /** Task 4 mounts the SearchDialog here. */
  searchSlot?: ReactNode;
}

export default function DocsShell({ nav, page, searchSlot }: DocsShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const groupTop = (id: string) => nav.find((g) => g.id === id)?.pages[0]?.route;
  const topLinks = [
    { label: "راهنما", route: groupTop("overview") },
    { label: "پلتفرم برنامه", route: groupTop("paas") },
    { label: "پایگاه داده", route: groupTop("dbaas") },
    { label: "مرجع API", route: groupTop("api-ref") },
  ].filter((l): l is { label: string; route: string } => Boolean(l.route));

  const navigate = (route: string) => {
    setSidebarOpen(false);
    router.push(`/docs/${route}`);
  };

  // Placeholder until Task 4 wires the SearchDialog; the header button and ⌘K both land here.
  const openSearch = () => {};

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div dir="rtl" style={{ colorScheme: "light" }} className="min-h-screen bg-[#f8f9fb] text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="باز کردن فهرست مستندات"
            aria-expanded={sidebarOpen}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <button type="button" onClick={() => navigate(page.route)} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-[13px] font-bold text-white">
              L
            </span>
            <span className="text-[14px] font-semibold text-zinc-900">مستندات لیارا</span>
          </button>

          <nav aria-label="بخش‌های اصلی" className="hidden items-center gap-1 text-[13px] text-zinc-600 md:flex">
            {topLinks.map((l) => (
              <button
                key={l.label}
                type="button"
                onClick={() => navigate(l.route)}
                className="rounded-lg px-2.5 py-1.5 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-zinc-500 transition hover:border-zinc-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <span className="hidden sm:inline">جست‌وجو یا پرسش از لیری…</span>
              <kbd className="hidden rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[10.5px] text-zinc-400 sm:inline">
                ⌘K
              </kbd>
            </button>
            <a
              href="https://github.com/liara-cloud/docs"
              target="_blank"
              rel="noreferrer"
              aria-label="مخزن گیت‌هاب"
              className="hidden rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:text-zinc-900 sm:block"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
              </svg>
            </a>
          </div>
        </div>
        {searchSlot}
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-8 px-4 lg:px-8">
        <div className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-s border-zinc-200 lg:block">
          <DocsSidebar nav={nav} currentRoute={page.route} onNavigate={navigate} />
        </div>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl">
            <ArticleView page={page} />
          </div>
        </main>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="فهرست مستندات">
          <div className="absolute inset-0 bg-zinc-950/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-white shadow-2xl">
            <DocsSidebar nav={nav} currentRoute={page.route} onNavigate={navigate} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
