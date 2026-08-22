"use client";

import { useEffect, useState } from "react";
import { Plug, PlugZap } from "lucide-react";

interface Health {
  mode: "connected" | "demo" | "docs";
  corpus: { chunks: number; semantic: boolean };
  chatProvider: string;
}

/**
 * Liara account connection. `variant="full"` renders the labeled button row
 * (console pages); `variant="compact"` renders the small icon button used in
 * the Lia widget's top bar. Both share the token modal — in connected mode
 * the modal shows status + disconnect instead of the token form, so the
 * compact icon can't disconnect by accident.
 */
export default function ConnectPanel({
  onChanged,
  variant = "full",
}: {
  onChanged?: (m: Health["mode"]) => void;
  variant?: "full" | "compact";
}) {
  const [health, setHealth] = useState<Health | null>(null);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<number | null>(null);

  const refresh = () =>
    fetch("/api/health")
      .then((r) => r.json())
      .then((h: Health) => {
        setHealth(h);
        onChanged?.(h.mode);
      })
      .catch(() => null);

  useEffect(() => {
    void refresh();
  }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; apps?: number };
      if (!data.ok) {
        setError(data.error ?? "خطا در اتصال");
        return;
      }
      setApps(data.apps ?? null);
      setOpen(false);
      setToken("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await fetch("/api/connect", { method: "DELETE" });
    setApps(null);
    setOpen(false);
    await refresh();
  }

  const connected = health?.mode === "connected";

  return (
    <div className="flex items-center gap-2">
      {variant === "compact" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={connected ? "حساب لیارا متصل است — مدیریت اتصال" : "اتصال حساب لیارا"}
          title={connected ? "حساب لیارا متصل است — مدیریت اتصال" : "اتصال حساب لیارا"}
          className="relative rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
        >
          {connected ? (
            <PlugZap className="h-4 w-4 text-[var(--ok)]" />
          ) : (
            <Plug className="h-4 w-4" />
          )}
          <span
            className={[
              "absolute right-1 top-1 h-1.5 w-1.5 rounded-full",
              connected ? "bg-[var(--ok)]" : "bg-[var(--text-dim)]/50",
            ].join(" ")}
            aria-hidden
          />
        </button>
      ) : health?.mode === "connected" ? (
        <button
          type="button"
          onClick={() => void disconnect()}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]"
        >
          قطع اتصال
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] text-[var(--accent)]"
        >
          اتصال حساب لیارا
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 font-bold">اتصال حساب لیارا</h3>
            {connected ? (
              <>
                <p className="mb-3 text-[12.5px] leading-6 text-[var(--ok)]">
                  حساب شما متصل است{apps !== null ? ` — ${apps} برنامه` : ""}. لیا می‌تواند
                  منابع واقعی شما را بخواند و با تأیید شما تغییرشان دهد.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--text-dim)]"
                  >
                    بستن
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void disconnect()}
                    className="rounded-lg border border-[var(--err)] px-4 py-1.5 text-[13px] text-[var(--err)] disabled:opacity-40"
                  >
                    قطع اتصال
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-[12.5px] leading-6 text-[var(--text-dim)]">
                  توکن API حساب خود را از تنظیمات پنل لیارا بسازید و اینجا بچسبانید. توکن فقط در حافظه‌ی
                  سرور نگه داشته می‌شود، لاگ نمی‌شود و با قطع اتصال پاک می‌شود. بدون اتصال هم لیا به
                  سوالات مستندات پاسخ می‌دهد.
                </p>
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  rows={3}
                  dir="ltr"
                  placeholder="eyJhbGciOi…"
                  className="mb-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-[12px] outline-none focus:border-[var(--accent)]"
                />
                {error && <p className="mb-2 text-[12px] text-[var(--err)]">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--text-dim)]"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    disabled={busy || token.trim().length < 16}
                    onClick={() => void connect()}
                    className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[13px] font-bold text-[#0c1214] disabled:opacity-40"
                  >
                    {busy ? "در حال اتصال…" : "اتصال"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
