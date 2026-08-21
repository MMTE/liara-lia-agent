import { NextResponse, type NextRequest } from "next/server";
import { searchDocs } from "@/lib/docs-index";
import { urlToRoute } from "@/lib/docs-pages.js";
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const hits = await searchDocs(q, 8);
  return NextResponse.json({
    results: hits.map((h) => ({ ...h, route: urlToRoute(h.url) })),
  });
}
