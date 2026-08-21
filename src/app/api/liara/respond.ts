import { NextResponse } from "next/server";

/** Unauthenticated / revoked-token shape shared by every liara BFF route. */
export function unauthorized() {
  return NextResponse.json({ connected: false }, { status: 401 });
}

/**
 * Map a liara-bff error to a response: 401 (token revoked) stays the
 * `{connected:false}` gate, everything else → 502 with a Persian message.
 * The thrown errors never carry the token, so nothing can leak here.
 */
export function upstreamFailure(error: unknown) {
  if ((error as { status?: number } | null)?.status === 401) return unauthorized();
  return NextResponse.json(
    { error: "دریافت اطلاعات از لیارا ناموفق بود. کمی بعد دوباره تلاش کنید." },
    { status: 502 }
  );
}
