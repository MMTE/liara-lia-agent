"use client";
import { ArrowUpLeft, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import CodeBlock from "../CodeBlock";
import type { LiriCitation } from "./types";

const DOCS_SITE_ORIGIN = (process.env.NEXT_PUBLIC_DOCS_SITE_ORIGIN || "").replace(/\/+$/, "");

/** Keep docs.liara.ir citations inside the vendored docs fork when its origin is configured. */
function citationHref(c: LiriCitation): string {
  return DOCS_SITE_ORIGIN && c.route ? `${DOCS_SITE_ORIGIN}/${c.route}` : c.url;
}

interface AnswerCardProps {
  text: string;
  citations: LiriCitation[];
  streaming?: boolean;
}

export function AnswerCard({ text, citations, streaming = false }: AnswerCardProps) {
  return (
    <article className="md space-y-3 text-[13.5px] leading-7 text-[var(--text)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ pre: CodeBlock as never }}
      >
        {text || ""}
      </ReactMarkdown>
      {streaming && (
        <span
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[var(--accent)]"
          aria-hidden
        />
      )}

      {citations.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
            <BookOpen className="h-3 w-3" />
            منابع از مستندات لیارا
          </p>
          <ul className="space-y-1">
            {citations.map((c) => (
              <li key={c.url}>
                <a
                  href={citationHref(c)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-right transition hover:bg-[var(--bg-raised)]"
                >
                  <ArrowUpLeft className="h-3 w-3 shrink-0 text-[var(--accent)]" />
                  <span className="text-[12.5px] text-[var(--text)] group-hover:text-[var(--accent)]">
                    {c.title}
                  </span>
                  <code className="ms-auto hidden max-w-[9rem] truncate font-mono text-[10.5px] text-[var(--text-dim)] sm:block">
                    {c.route ? `/${c.route}` : c.url}
                  </code>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
