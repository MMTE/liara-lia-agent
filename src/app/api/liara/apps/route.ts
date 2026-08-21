import { NextResponse } from "next/server";
import { liaraGet, sessionFromRequest } from "@/lib/liara-bff";
import { unauthorized, upstreamFailure } from "../respond";

// Read-only passthrough of the user's own Liara data — never cached.
export const dynamic = "force-dynamic";

/** GET /api/liara/apps → {connected, apps} — spec getApps: GET /v1/projects. */
export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return unauthorized();
  try {
    const body = (await liaraGet(session.token, "/v1/projects")) as { projects?: unknown } | null;
    return NextResponse.json({
      connected: true,
      apps: Array.isArray(body?.projects) ? body.projects : [],
    });
  } catch (error) {
    return upstreamFailure(error);
  }
}
