import { NextResponse, type NextRequest } from "next/server";
import { resolvePage } from "@/lib/docs-pages.js";
export function GET(request: NextRequest) {
  const route = request.nextUrl.searchParams.get("route") ?? "";
  const page = resolvePage(route);
  if (!page) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(page);
}
