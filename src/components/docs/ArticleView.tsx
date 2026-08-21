"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import CodeBlock from "../CodeBlock";

export interface DocsPage {
  route: string;
  slug: string;
  url: string;
  title: string;
  product: string;
  source: string;
  text: string;
}

interface ArticleViewProps {
  page: DocsPage;
  onAsk?: (prompt: string) => void;
}

const PROSE_CLASS = [
  "mt-6 text-[14px] leading-8 text-zinc-700",
  "[&_a]:text-violet-700 [&_a]:underline [&_a]:decoration-violet-300 [&_a]:underline-offset-[3px]",
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-bold [&_h2]:text-zinc-900",
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[15.5px] [&_h3]:font-bold [&_h3]:text-zinc-900",
  "[&_h4]:mt-4 [&_h4]:font-semibold [&_h4]:text-zinc-900",
  "[&_p]:my-3",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6",
  "[&_li]:my-1",
  "[&_table]:my-4 [&_table]:block [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-[13px]",
  "[&_:is(th,td)]:border [&_:is(th,td)]:border-zinc-200",
  "[&_th]:bg-zinc-50 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:font-semibold [&_th]:text-zinc-900",
  "[&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top",
  "[&_blockquote]:my-4 [&_blockquote]:rounded-lg [&_blockquote]:border-s-2 [&_blockquote]:border-violet-200 [&_blockquote]:bg-violet-50/60 [&_blockquote]:px-4 [&_blockquote]:py-1 [&_blockquote]:text-zinc-600",
  "[&_hr]:my-8 [&_hr]:border-zinc-200",
  "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:border [&_:not(pre)>code]:border-zinc-200 [&_:not(pre)>code]:bg-zinc-100 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-px [&_:not(pre)>code]:text-[12.5px] [&_:not(pre)>code]:text-zinc-800",
  "[&_img]:my-4 [&_img]:inline-block [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-zinc-200",
].join(" ");

export default function ArticleView({ page, onAsk }: ArticleViewProps) {
  return (
    <article className="min-w-0 flex-1 py-8">
      <nav aria-label="مسیر" className="mb-3 flex items-center gap-1.5 text-[12px] text-zinc-400">
        <span>مستندات</span>
        <span aria-hidden>/</span>
        <span dir="ltr" className="font-mono text-[11.5px]">
          {page.route}
        </span>
      </nav>

      <h1 className="text-[26px] font-bold leading-relaxed text-zinc-900">{page.title}</h1>

      {page.source === "api-ref" ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] leading-6 text-amber-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          این صفحه از مرجع API انگلیسی است
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-5 text-[12px] text-zinc-500">
        <button
          type="button"
          onClick={() => onAsk?.(`درباره «${page.title}» توضیح بده`)}
          className="ms-auto flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-700 transition hover:border-violet-300 hover:text-violet-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-violet-500" aria-hidden>
            <path d="M12 4l1.9 4.6L18.5 10.5l-4.6 1.9L12 17l-1.9-4.6L5.5 10.5l4.6-1.9L12 4z" />
            <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
          </svg>
          پرسیدن از لیری درباره این صفحه
        </button>
      </div>

      <div className={PROSE_CLASS}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{ pre: CodeBlock as never }}
        >
          {page.text}
        </ReactMarkdown>
      </div>

      <footer className="mt-10 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4 text-[12.5px] text-zinc-500">
        <a
          href={page.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-violet-700 underline decoration-violet-300 underline-offset-[3px] transition hover:text-violet-800"
        >
          مشاهده صفحه اصلی این سند در docs.liara.ir
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
            <path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />
          </svg>
        </a>
      </footer>
    </article>
  );
}
