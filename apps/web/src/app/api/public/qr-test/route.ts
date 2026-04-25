import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { verifyTableToken } from "@/lib/security/table-token";
import { verifyRoomToken } from "@/lib/security/room-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/qr-test?token=xxx&type=table|room
 * Debug endpoint to test if a QR token is valid (no auth required).
 * Remove in production once QR is confirmed working.
 */
export async function GET(req: NextRequest) {
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
