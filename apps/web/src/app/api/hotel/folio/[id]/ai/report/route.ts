import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, writeFolioAudit } from "@/lib/hotel/folio-service";
import { analyzeFolio } from "@/lib/hotel/folio-ai-service";
import { buildEnterpriseFolioPdf } from "@/lib/hotel/folio-pdf";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor", "cassa"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;

  const { id: folioId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const format = req.nextUrl.searchParams.get("format") ?? "json";

  const detail = await guestFolioRepository.getDetail(tenantId, folioId);
  if (!detail) return err("Folio not found", 404);

  const analysis = analyzeFolio({ detail, reservation: null, customer: null });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

  await writeFolioAudit({
    tenantId,
    folioId,
    action: "ai_report",
    newValue: format,
    actor: actorFromRequest(guard.user, req.headers),
  });

  if (format === "pdf") {
    const pdfBuffer = await buildEnterpriseFolioPdf({
      tenantName: tenant?.name ?? "Hotel",
      folio: detail.folio,
      charges: detail.charges,
      folioId: detail.folio.id,
    });
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="folio-ai-report-${folioId}.pdf"`,
      },
    });
  }

  return ok({
    reportType: "folio_ai_summary",
    generatedAt: analysis.generatedAt,
    folio: {
      id: detail.folio.id,
      guestName: detail.folio.guestName,
      roomCode: detail.folio.roomCode,
      balance: detail.folio.balance,
      status: detail.folio.status,
    },
    executiveSummary: analysis.guestSummary.stayOverview,
    economics: analysis.guestSummary.spending,
    anomalies: analysis.anomalies,
    revenueSuggestions: analysis.revenueSuggestions,
    checkoutChecklist: analysis.checkoutChecklist,
    fraudAlerts: analysis.fraudAlerts,
    customerInsights: analysis.customerInsights,
    forecast: analysis.forecast,
    timeline: analysis.timeline,
    checkoutBlocked: analysis.checkoutBlocked,
  });
}
