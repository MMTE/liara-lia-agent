import { NextResponse } from "next/server";
import { liaraGet, sessionFromRequest } from "@/lib/liara-bff";
import { unauthorized, upstreamFailure } from "../../../respond";

export const dynamic = "force-dynamic";

/** GET /api/liara/apps/[name]/logs?since= → {logs} — spec getAppLogs, last 200 lines. */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await sessionFromRequest(request);
  if (!session) return unauthorized();
  const { name } = await params;
  const since = new URL(request.url).searchParams.get("since");
  if (!name || !since) {
    return NextResponse.json({ error: "نام برنامه و پارامتر since الزامی است." }, { status: 400 });
  }
  try {
    const logs = (await liaraGet(
      session.token,
      `/v1/projects/${encodeURIComponent(name)}/logs?since=${encodeURIComponent(since)}`
    )) as unknown[] | null;
    return NextResponse.json({ logs: Array.isArray(logs) ? logs.slice(-200) : [] });
  } catch (error) {
    return upstreamFailure(error);
  }
}
