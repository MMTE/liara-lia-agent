"use client";

import { ArrowUpLeft, BookOpen } from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import type { LiaCitation } from "./types";

const DOCS_SITE_ORIGIN = (process.env.NEXT_PUBLIC_DOCS_SITE_ORIGIN || "").replace(/\/+$/, "");
/** «مستندات X - لیارا» → «X» — the chip already lives in a منابع row. */
function shortTitle(t: string): string {
  return t
    .replace(/^مستندات\s+/, "")
    .replace(/\s*[-–—]\s*لیارا\s*$/, "")
    .trim() || t;
}

/** Keep docs.liara.ir citations inside the vendored docs fork when its origin is configured. */
function citationHref(c: LiaCitation): string {
  if (DOCS_SITE_ORIGIN && c.route) {
    return `${DOCS_SITE_ORIGIN}/${c.route}${c.anchor ? `/#${c.anchor}` : ""}`;
  }
  return c.url;
}
interface AnswerCardProps {
  text: string;
  citations: LiaCitation[];
  streaming?: boolean;
}

// Streamdown (vercel/streamdown) is built for streaming markdown: blocks are
// memoized so partial documents re-render without the full-document flash
// react-markdown had, and it renders its own caret while `isAnimating`.
export function AnswerCard({ text, citations, streaming = false }: AnswerCardProps) {
  return (
    <article className="md text-[13.5px] leading-7 text-[var(--text)]">
      <Streamdown animated isAnimating={streaming}>
        {text || ""}
      </Streamdown>

      {citations.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-[var(--border)]/60 pt-2 text-[11px] leading-5">
          <span className="flex shrink-0 items-center gap-1 text-[var(--text-dim)]/80">
            <BookOpen className="h-3 w-3" />
            منابع:
          </span>
          {citations.slice(0, 4).map((c) => (
            <a
              key={c.url}
              href={citationHref(c)}
              target="_blank"
              rel="noopener noreferrer"
              title={c.title}
              className="inline-flex max-w-[15rem] items-center gap-1 truncate rounded-md bg-[var(--bg)]/70 px-1.5 py-0.5 text-[var(--text-dim)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            >
              {shortTitle(c.title)}
              <ArrowUpLeft className="h-2.5 w-2.5 shrink-0 opacity-60" />
            </a>
          ))}
          {citations.length > 4 && (
            <span className="text-[var(--text-dim)]/60">
              +{(citations.length - 4).toLocaleString("fa-IR")}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
