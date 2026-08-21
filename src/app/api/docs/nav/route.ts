import { NextResponse } from "next/server";
import { getNav } from "@/lib/docs-pages.js";
export function GET() {
  return NextResponse.json(getNav());
}
