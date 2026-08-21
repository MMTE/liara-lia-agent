import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { validateToken } from "@/lib/liara-client";
import * as sessionStore from "@/lib/session-store";
import { logEvent } from "@/lib/logger";

export async function POST(request: NextRequest) {
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    if (typeof body.token === "string") token = body.token.trim();
  } catch {
    /* fallthrough */
  }
  if (token.length < 16 || token.length > 512) {
    return NextResponse.json({ ok: false, error: "توکن ارسالی معتبر نیست." }, { status: 400 });
  }

  const verdict = await validateToken(token);
  logEvent({ kind: "connect", ok: verdict.ok, status: (verdict as { status?: number }).status });
  if (!verdict.ok) {
    return NextResponse.json(
      { ok: false, error: "توکن لیارا پذیرفته نشد. از توکن تولیدشده در تنظیمات حساب لیارا استفاده کنید." },
      { status: 401 }
    );
  }

  const sid = randomBytes(24).toString("base64url");
  sessionStore.set(sid, { token, mode: "connected" });
  const res = NextResponse.json({ ok: true, apps: verdict.apps, mode: "connected" });
  res.cookies.set("sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, mode: "demo" });
  res.cookies.delete("sid");
  return res;
}
