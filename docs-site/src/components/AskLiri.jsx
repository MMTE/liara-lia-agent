import React from "react";

// Liri ask button (ADR-0008 patch): fixed RTL pill rendered by _app on every
// docs page. Opens the embedded Liri panel (embed.js) with a per-page prompt.
// Renders nothing unless NEXT_PUBLIC_AGENT_ORIGIN was set at build time.
export default function AskLiri() {
  if (!process.env.NEXT_PUBLIC_AGENT_ORIGIN) return null;

  const ask = () => {
    const raw = typeof document !== "undefined" ? document.title : "";
    const topic =
      raw
        .replace(/\s*[-|]\s*مستندات لیارا.*$/, "")
        .replace(/\s*[-|–]\s*لیارا.*$/, "")
        .replace(/^مستندات\s+/, "")
        .trim() || raw.trim() || "این صفحه";
    if (window.Liri) {
      window.Liri.open(
        `درباره «${topic}» توضیح بده — نکات مهم و خطاهای رایج را بگو`
      );
    }
  };

  return (
    <button
      type="button"
      dir="rtl"
      onClick={ask}
      title="پرسیدن از لیری درباره این صفحه"
      className="fixed bottom-5 right-5 z-[60] rounded-full bg-[#6d5df0] px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#5a4bd8]"
    >
      ✦{" "}
      <span className="hidden sm:inline">پرسیدن از لیری درباره این صفحه</span>
      <span className="sm:hidden">لیری</span>
    </button>
  );
}
