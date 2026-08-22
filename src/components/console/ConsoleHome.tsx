"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import ConnectPanel from "@/components/ConnectPanel";
import { LiaWidget } from "@/components/lia/LiaWidget";
import type { LiaResourceState } from "@/components/lia/types";
import { AppDetail } from "./AppDetail";
import { AppsList } from "./AppsList";
import { sortedReleases, type AppDetailData, type LiaraProject, type LiaraReleases } from "./types";

/**
 * Light console theme: re-scopes the app-wide dark CSS variables for this
 * subtree so the floating LiaWidget (a DOM descendant) renders light too.
 */
const LIGHT_THEME = {
  "--bg": "#f4f5f7",
  "--bg-raised": "#ffffff",
  "--bg-bubble-user": "#eef2ff",
  "--bg-bubble-agent": "#ffffff",
  "--border": "#e4e4e7",
  "--text": "#18181b",
  "--text-dim": "#71717a",
  "--accent": "#00d4ff",
  "--accent-soft": "#00d4ff1f",
  "--ok": "#059669",
  "--warn": "#d97706",
  "--err": "#dc2626",
} as CSSProperties;

/** Demo card data — prototype/src/pages/Dashboard.tsx:8-19 mock, spec field names. */
const DEMO_APP: LiaraProject = {
  _id: "demo-my-api",
  project_id: "my-api",
  type: "node",
  status: "running",
  planID: "standard",
  scale: 1,
  isDeployed: true,
  created_at: "2026-08-01T10:12:00.000Z",
};
const DEMO_RELEASES: LiaraReleases = {
  total: 3,
  readyReleasesCount: 2,
  platform: "node",
  releases: [
    {
      _id: "demo-184",
      state: "failed",
      createdAt: "2026-08-22T09:38:00.000Z",
      gitInfo: { commit: "8f21c0a", message: "add rate limiter" },
    },
    {
      _id: "demo-183",
      state: "ready",
      createdAt: "2026-08-21T18:20:00.000Z",
      gitInfo: { commit: "2b7de41", message: "update deps" },
    },
    {
      _id: "demo-182",
      state: "ready",
      createdAt: "2026-08-21T16:05:00.000Z",
      gitInfo: { commit: "a91f0c5", message: "fix cors" },
    },
  ],
};
const DEMO_BUILD_LOG = [
  "npm ERR! code EBADENGINE",
  "npm ERR! notsup Unsupported engine for my-api@1.4.0",
  'npm ERR! current:  { node: "v18.20.4" }',
  "build failed with exit code 1",
];

type Phase = "loading" | "demo" | "connected";

interface Selection {
  name: string;
  app: LiaraProject | null;
  releases: LiaraReleases | null;
}

/**
 * /console host: session-aware shell around the Liara apps data. Not
 * connected → connect hero + labeled demo card; connected → real apps list
 * → detail. The LiaWidget gets a memoized proactive nudge when the open
 * app's latest release failed.
 */
export function ConsoleHome() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [apps, setApps] = useState<LiaraProject[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [request, setRequest] = useState<{ text: string; nonce: number }>({ text: "", nonce: 0 });
  const modeRef = useRef<"connected" | "demo" | "docs" | null>(null);

  const ask = useCallback((text: string) => setRequest((r) => ({ text, nonce: r.nonce + 1 })), []);

  const loadApps = useCallback(async () => {
    setListError(null);
    try {
      const res = await fetch("/api/liara/apps");
      if (res.status === 401) {
        setPhase("demo");
        return;
      }
      setPhase("connected");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setListError(body?.error ?? "دریافت فهرست برنامه‌ها ناموفق بود.");
        return;
      }
      const body = (await res.json()) as { apps?: LiaraProject[] };
      setApps(Array.isArray(body?.apps) ? body.apps : []);
    } catch {
      setPhase("demo");
      setListError("ارتباط با سرور برقرار نشد.");
    }
  }, []);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  // Latest detail fetch wins: a new selection (or going back) aborts the
  // previous request so a slow stale response can't overwrite the view.
  const detailAbort = useRef<AbortController | null>(null);
  const selectApp = useCallback(async (name: string) => {
    setDetailError(null);
    detailAbort.current?.abort();
    const ctrl = new AbortController();
    detailAbort.current = ctrl;
    try {
      const res = await fetch(`/api/liara/apps/${encodeURIComponent(name)}`, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      if (res.status === 401) {
        setPhase("demo");
        setSelection(null);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!ctrl.signal.aborted) setDetailError(body?.error ?? "دریافت جزئیات برنامه ناموفق بود.");
        return;
      }
      const data = (await res.json()) as AppDetailData;
      if (ctrl.signal.aborted) return;
      // spec getAppByName body is ProjectAllDetails — project fields live under .project
      setSelection({ name, app: data.app?.project ?? null, releases: data.releases ?? null });
    } catch {
      if (!ctrl.signal.aborted) setDetailError("ارتباط با سرور برقرار نشد.");
    }
  }, []);

  /** ConnectPanel mode flips: connect → reload the real list, disconnect → demo. */
  const onModeChange = useCallback(
    (mode: "connected" | "demo" | "docs") => {
      // ConnectPanel echoes the current mode on mount; /console boots its
      // own loadApps. Only act on real transitions away from a known mode:
      // connect → reload the list, disconnect → back to the demo view.
      const prev = modeRef.current;
      modeRef.current = mode;
      if (prev === mode) return;
      if (mode === "connected") {
        void loadApps();
      } else if (prev !== null) {
        setPhase("demo");
        setSelection(null);
        setApps([]);
      }
    },
    [loadApps]
  );

  // Widget-panel sync: connect/disconnect inside the Lia widget (its own
  // ConnectPanel) dispatches "liara-mode" — mirror it here so the apps
  // list/phase follow without a reload.
  useEffect(() => {
    const onLiaMode = (e: Event) => {
      const mode = (e as CustomEvent<"connected" | "demo" | "docs">).detail;
      if (mode === "connected" || mode === "demo" || mode === "docs") onModeChange(mode);
    };
    window.addEventListener("liara-mode", onLiaMode);
    return () => window.removeEventListener("liara-mode", onLiaMode);
  }, [onModeChange]);

  // The open app — real selection in connected mode, the demo card otherwise.
  const active = useMemo<Selection | null>(
    () =>
      selection ??
      (phase === "demo" ? { name: DEMO_APP.project_id ?? "my-api", app: DEMO_APP, releases: DEMO_RELEASES } : null),
    [selection, phase]
  );
  const latestFailed = sortedReleases(active?.releases)[0]?.state === "failed";
  const widgetState: LiaResourceState = latestFailed ? "failed" : "ok";

  // CRITICAL (Task 7 review): memoize on the underlying primitives so the
  // nudge object identity is stable and the widget's 4s timer isn't reset
  // on every render.
  const nudge = useMemo(
    () =>
      active && latestFailed
        ? { text: `لیا دید آخرین استقرار «${active.name}» ناموفق بوده. بررسی کنم؟`, cta: "بررسی کن" }
        : undefined,
    [active, latestFailed]
  );

  return (
    <div dir="rtl" style={LIGHT_THEME} className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 lg:px-8">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-[13px] font-bold text-white">
            L
          </span>
          <span className="text-[14px] font-semibold text-zinc-900">کنسول لیارا</span>
          {phase === "connected" && (
            <span className="ms-auto">
              <ConnectPanel onChanged={onModeChange} />
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
        {phase === "loading" && <p className="text-[13px] text-zinc-500">در حال بررسی وضعیت اتصال…</p>}

        {phase === "demo" && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1">
                  <h1 className="text-[19px] font-bold text-zinc-900">کنسول ابری‌ات را وصل کن</h1>
                  <p className="mt-1.5 max-w-xl text-[13px] leading-7 text-zinc-500">
                    با وصل کردن توکن API لیارا، همین کنسول برنامه‌های واقعی‌ات را نشان می‌دهد؛ لیا هم کنارش می‌نشیند و
                    مشکلات استقرار را قبل از تو می‌بیند.
                  </p>
                </div>
                <ConnectPanel onChanged={onModeChange} />
              </div>
              <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-700">
                <Sparkles className="h-3.5 w-3.5" />
                نمونه — داده واقعی نیست
              </p>
            </section>

            {listError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{listError}</p>
            )}

            <AppDetail
              name={DEMO_APP.project_id!}
              app={DEMO_APP}
              releases={DEMO_RELEASES}
              buildLog={DEMO_BUILD_LOG}
              onAsk={ask}
            />
          </div>
        )}

        {phase === "connected" && (
          selection ? (
            <AppDetail
              name={selection.name}
              app={selection.app}
              releases={selection.releases}
              onAsk={ask}
              onBack={() => {
                detailAbort.current?.abort();
                setSelection(null);
                setDetailError(null);
              }}
            />
          ) : (
            <div className="space-y-4">
              {listError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {listError}{" "}
                  <button type="button" onClick={() => void loadApps()} className="underline">
                    تلاش دوباره
                  </button>
                </p>
              )}
              {detailError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{detailError}</p>
              )}
              <AppsList
                apps={apps}
                onSelect={(name) => {
                  setSelection({ name, app: null, releases: null });
                  void selectApp(name);
                }}
              />
            </div>
          )
        )}
      </main>

      <LiaWidget
        surface="console"
        scopeLabel="کنسول لیارا"
        resource={active?.name}
        state={widgetState}
        request={request}
        nudge={nudge}
      />
    </div>
  );
}
