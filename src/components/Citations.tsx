export interface Citation {
  title: string;
  url: string;
  source?: string;
}

const DOCS_SITE_ORIGIN = (process.env.NEXT_PUBLIC_DOCS_SITE_ORIGIN || "").replace(/\/+$/, "");
const DOCS_URL_RE = /^https:\/\/docs\.liara\.ir\//;

/** Keep docs.liara.ir citations inside the vendored docs fork when its origin is configured. */
function citationHref(url: string): string {
  return DOCS_SITE_ORIGIN && DOCS_URL_RE.test(url)
    ? `${DOCS_SITE_ORIGIN}/${url.replace(DOCS_URL_RE, "")}`
    : url;
}

export default function Citations({ items }: { items: Citation[] }) {
  return (
    <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
      <div className="text-[11.5px] text-[var(--text-dim)] mb-1.5">منابع</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((c) => (
          <a
            key={c.url}
            href={citationHref(c.url)}
            target="_blank"
            rel="noopener noreferrer"
            title={c.title}
            className="inline-flex max-w-[260px] items-center gap-1 rounded-full border border-[var(--accent-soft)] border-solid px-2.5 py-0.5 text-[12px] text-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[#8b7cf633] transition truncate"
          >
            <span className="shrink-0">{c.source === "api-ref" ? "⚙️" : "📄"}</span>
            <span className="truncate">{c.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
