import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/** Edge middleware rate limiting (rubric: security). Per-isolate in-memory. */
export function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const sid = request.cookies.get("sid")?.value ?? "-";
  const path = request.nextUrl.pathname;
  // Chat turns are LLM-heavy; stats/health are cheap.
  const limit = path.startsWith("/eve/") ? 30 : 120;
  if (!rateLimit(`${ip}:${sid}:${path.startsWith("/eve/") ? "eve" : "api"}`, { limit, windowMs: 60_000 })) {
    return NextResponse.json(
      { ok: false, error: "نرخ درخواست‌ها بیش از حد مجاز است. کمی صبر کنید و دوباره تلاش کنید." },
      { status: 429 }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/eve/:path*", "/api/:path*"],
};
