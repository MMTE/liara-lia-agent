import { NextResponse } from "next/server";
import { liaraGet, sessionFromRequest } from "@/lib/liara-bff";
import { unauthorized, upstreamFailure } from "../../respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/liara/apps/[name] → {app, releases, events} — spec getAppByName,
 * getAppReleases (page 1 × 10) and getAppEvents fetched in parallel; each
 * source degrades to null on its own failure, but an upstream 401 (revoked
 * token) gates the whole response.
 */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await sessionFromRequest(request);
  if (!session) return unauthorized();
  const { name } = await params;
  if (!name) return NextResponse.json({ error: "نام برنامه الزامی است." }, { status: 400 });

  const base = `/v1/projects/${encodeURIComponent(name)}`;
  try {
    const settled = await Promise.allSettled([
      liaraGet(session.token, base),
      liaraGet(session.token, `${base}/releases?page=1&count=10`),
      liaraGet(session.token, `${base}/events`),
    ]);
    const sources = settled.map((r) => {
      if (r.status === "fulfilled") return r.value;
      if ((r.reason as { status?: number } | null)?.status === 401) throw r.reason;
      return null;
    });
    return NextResponse.json({ app: sources[0] ?? null, releases: sources[1] ?? null, events: sources[2] ?? null });
  } catch (error) {
    return upstreamFailure(error);
  }
}
