import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api/helpers";
import { verifyTableToken } from "@/lib/security/table-token";
import { verifyRoomToken } from "@/lib/security/room-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/qr-test?token=xxx&type=table|room
 * Debug-only endpoint to verify QR tokens without authentication.
 * Disabled in production to avoid exposing token structure details.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "table";

  if (!token) {
    return ok({ ok: false, error: "missing token parameter", usage: "?token=xxx&type=table|room" });
  }

  try {
    if (type === "room") {
      const parsed = verifyRoomToken(token);
      return ok({ ok: !!parsed, type: "room", parsed: parsed ?? null });
    } else {
      const parsed = verifyTableToken(token);
      return ok({ ok: !!parsed, type: "table", parsed: parsed ?? null });
    }
  } catch (e) {
    return ok({ ok: false, error: e instanceof Error ? e.message : "unknown error" });
  }
}
