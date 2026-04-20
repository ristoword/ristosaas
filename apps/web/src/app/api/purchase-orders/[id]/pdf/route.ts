import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { purchaseOrdersRepository } from "@/lib/db/repositories/purchase-orders.repository";
import { renderPurchaseOrderPdf } from "@/lib/pdf/purchase-order-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["owner", "supervisor", "magazzino", "cassa", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = getTenantId();
  const order = await purchaseOrdersRepository.get(tenantId, id);
  if (!order) return new NextResponse("Not Found", { status: 404 });

  const [tenant, emailConfig] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.tenantEmailConfig.findUnique({
      where: { tenantId },
      select: { fromAddress: true },
    }),
  ]);

  const pdf = await renderPurchaseOrderPdf({
    order,
    tenantName: tenant?.name ?? "RistoSaaS",
    fromAddress: emailConfig?.fromAddress ?? null,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ordine-${order.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
