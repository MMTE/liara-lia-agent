import { NextResponse, type NextRequest } from "next/server";
import { record, snapshot } from "@/lib/usage";

export async function GET() {
  return NextResponse.json(snapshot());
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    tokensIn?: number;
    tokensOut?: number;
    cacheReadTokens?: number;
    tools?: string[];
    error?: boolean;
    ms?: number;
  };
  const tools = Array.isArray(body.tools) ? body.tools : [];
  record({
    tokensIn: body.tokensIn ?? 0,
    tokensOut: body.tokensOut ?? 0,
    cacheReadTokens: body.cacheReadTokens ?? 0,
    tool: tools[0],
    error: body.error === true,
    ms: typeof body.ms === "number" ? body.ms : undefined,
  });
  for (const t of tools.slice(1)) record({ tool: t });
  return NextResponse.json({ ok: true });
}
