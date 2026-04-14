import { NextResponse } from "next/server";
import { clearRefreshCookie, clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  clearRefreshCookie(res);
  return res;
}
