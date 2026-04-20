import { NextRequest, NextResponse } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";
import { verifyTableToken } from "@/lib/security/table-token";

export const dynamic = "force-dynamic";

/**
 * Public, read-only lookup for a restaurant table from a signed token.
 *
 * Intentionally narrow: only returns public-facing labels (tenant name, room
 * name, table label and seats). No prices, no orders, no guest data.
 * Rate-limited by IP to prevent scraping.
 */
export async function GET(req: NextRequest) {
  const rl = await applyRateLimit(clientIpFromRequest(req), {
    bucket: "public:table",
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429 },
    );
    for (const [k, v] of Object.entries(rateLimitHeaders(rl))) res.headers.set(k, v);
    return res;
  }

  const token = req.nextUrl.searchParams.get("token") || "";
  const parsed = verifyTableToken(token);
  if (!parsed) return err("Token tavolo non valido.", 400);

  const table = await prisma.restaurantTable.findFirst({
    where: { id: parsed.tableId, tenantId: parsed.tenantId },
    include: {
      room: { select: { name: true } },
      tenant: { select: { name: true, accessStatus: true } },
    },
  });
  if (!table) return err("Tavolo non trovato.", 404);
  if (table.tenant.accessStatus !== "active") return err("Struttura non attiva.", 403);

  return ok({
    tenantName: table.tenant.name,
    roomName: table.room?.name ?? null,
    tableName: table.nome,
    seats: table.posti,
  });
}
