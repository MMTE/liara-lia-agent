import { NextResponse, type NextRequest } from "next/server";
import { corpusStats } from "@/lib/docs-index";
import { get as getSession } from "@/lib/session-store";

export async function GET(request: NextRequest) {
  const sid = request.cookies.get("sid")?.value;
  const session = sid ? getSession(sid) : null;

  // scripts/start.mjs owns the Eve sidecar lifecycle. Best-effort with a
  // short timeout so the app health endpoint stays responsive.
  const port = Number.parseInt(process.env.EVE_NEXT_PRODUCTION_PORT || "4274", 10);
  let sidecar: unknown = { ok: false };
  try {
    const res = await fetch(`http://127.0.0.1:${port}/eve/v1/health`, { signal: AbortSignal.timeout(2000) });
    sidecar = { ok: res.ok, status: res.status };
  } catch (error) {
    sidecar = { ok: false, error: error instanceof Error ? error.message : "unreachable" };
  }

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
    eve: {
      port,
      sidecar,
    },
    time: new Date().toISOString(),
  });
}
