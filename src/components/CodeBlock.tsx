"use client";

import { isValidElement, useState, type ReactNode } from "react";

export function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

export default function CodeBlock(props: { children?: ReactNode }) {
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
