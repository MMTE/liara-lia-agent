import React from "react";

// Lia ask button (ADR-0008 patch): fixed RTL pill rendered by _app on every
// docs page. Opens the embedded Lia panel (embed.js) with a per-page prompt.
// Renders nothing unless NEXT_PUBLIC_AGENT_ORIGIN was set at build time.
export default function AskLia() {
  if (!process.env.NEXT_PUBLIC_AGENT_ORIGIN) return null;

  const ask = () => {
    const raw = typeof document !== "undefined" ? document.title : "";
    const topic =
      raw
        .replace(/\s*[-|]\s*مستندات لیارا.*$/, "")
        .replace(/\s*[-|–]\s*لیارا.*$/, "")
        .replace(/^مستندات\s+/, "")
        .trim() || raw.trim() || "این صفحه";
    if (window.Lia) {
      window.Lia.open(
        `درباره «${topic}» توضیح بده — نکات مهم و خطاهای رایج را بگو`
      );
    }
  };

  return (
    <button
      type="button"
      dir="rtl"
      onClick={ask}
      title="پرسیدن از لیا درباره این صفحه"
      className="fixed bottom-5 right-5 z-[60] rounded-full bg-[#00d4ff] px-4 py-2.5 text-sm font-bold text-[#0c1214] shadow-lg transition-colors hover:bg-[#00b8dd]"
    >
      ✦{" "}
      <span className="hidden sm:inline">پرسیدن از لیا درباره این صفحه</span>
      <span className="sm:hidden">لیا</span>
    </button>
  );
}
