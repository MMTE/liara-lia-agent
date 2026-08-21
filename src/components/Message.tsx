"use client";

import { isValidElement, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import Citations, { type Citation } from "./Citations";
import ActivityTimeline from "./ActivityTimeline";

export interface ToolPartInfo {
  id: string;
  toolName: string;
  state: string;
  input?: unknown;
  output?: unknown;
}

interface SearchResult {
  title?: string;
  url?: string;
  source?: string;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readToolResults(part: Record<string, unknown>): SearchResult[] {
  const carrier = isObj(part.output) ? part.output : isObj(part.result) ? part.result : null;
  if (!carrier || !Array.isArray(carrier.results)) return [];
  return carrier.results.filter(isObj) as SearchResult[];
}

function extractCitations(parts: unknown[]): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (!isObj(p) || p.type !== "dynamic-tool") continue;
    const toolName = typeof p.toolName === "string" ? p.toolName : "";
    if (!toolName.includes("search_docs")) continue;
    for (const r of readToolResults(p)) {
      if (typeof r.url !== "string" || seen.has(r.url)) continue;
      seen.add(r.url);
      out.push({
        title: typeof r.title === "string" ? r.title : r.url,
        url: r.url,
        source: typeof r.source === "string" ? r.source : undefined,
      });
    }
  }
  return out.slice(0, 8);
}

function extractTools(parts: unknown[]): ToolPartInfo[] {
  return parts.filter(isObj)
    .filter((p) => p.type === "dynamic-tool")
    .map((p, i) => ({
      id: `${typeof p.toolName === "string" ? p.toolName : "tool"}-${i}`,
      toolName: typeof p.toolName === "string" ? p.toolName : "tool",
      state: typeof p.state === "string" ? p.state : "",
      input: p.input,
      output: isObj(p.output) ? p.output : isObj(p.result) ? p.result : undefined,
    }));
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

function CodeBlock(props: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = extractText(props.children);
  return (
    <div className="group/code relative my-3">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }}
        className="absolute top-2 left-2 z-10 rounded-md border border-[var(--border)] bg-[#171b28] px-2 py-0.5 text-[11px] text-[var(--text-dim)] opacity-0 transition group-hover/code:opacity-100"
      >
        {copied ? "✓ کپی شد" : "کپی"}
      </button>
      <pre>{props.children}</pre>
    </div>
  );
}

export interface ChatMessage {
  id: string;
  role: string;
  parts: unknown[];
}

export default function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const tools = extractTools(message.parts);
  const citations = isUser ? [] : extractCitations(message.parts);
  const reasoningPart = message.parts.find((p) => isObj(p) && p.type === "reasoning");
  const reasoningText =
    isObj(reasoningPart) && typeof reasoningPart.text === "string" ? reasoningPart.text : null;
  const text = message.parts
    .filter(isObj)
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n\n");

  return (
    <div className={`flex w-full flex-col gap-2 ${isUser ? "items-start" : "items-end"}`}>
      {!isUser && tools.length > 0 && <ActivityTimeline tools={tools} />}

      <div
        className={`max-w-[92%] rounded-2xl border px-4 py-3 md:max-w-[78%] ${
          isUser
            ? "rounded-tr-sm border-[var(--border)] bg-[var(--bg-bubble-user)]"
            : "rounded-tl-sm border-[var(--border)] bg-[var(--bg-bubble-agent)]"
        }`}
      >
        {reasoningText ? (
          <details className="mb-2 text-[12.5px] text-[var(--text-dim)]">
            <summary className="cursor-pointer select-none hover:text-[var(--text)]">🧠 استدلال مدل</summary>
            <div className="mt-1 whitespace-pre-wrap border-r-2 border-[var(--border)] pr-3">
              {reasoningText}
            </div>
          </details>
        ) : null}

        <div className="md">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{ pre: CodeBlock as never }}
          >
            {text || ""}
          </ReactMarkdown>
        </div>

        {citations.length > 0 && <Citations items={citations} />}
      </div>
    </div>
  );
}
