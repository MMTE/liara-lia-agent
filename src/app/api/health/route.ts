import { NextResponse, type NextRequest } from "next/server";
import { corpusStats } from "@/lib/docs-index";
import { get as getSession } from "@/lib/session-store";

export async function GET(request: NextRequest) {
  const sid = request.cookies.get("sid")?.value;
  const session = sid ? getSession(sid) : null;
  return NextResponse.json({
    ok: true,
    mode: session?.mode ?? (process.env.DEMO_LIARA_TOKEN ? "demo" : "docs"),
    chatProvider: process.env.CHAT_PROVIDER ?? "vercel",
    corpus: (() => {
      try {
        return corpusStats();
      } catch {
        return { chunks: 0, semantic: false };
      }
    })(),
    time: new Date().toISOString(),
  });
}
