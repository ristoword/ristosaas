import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { closeTableOrders } from "@/lib/cassa/close-table.service";

const CASSA_ROLES = ["cassa", "sala", "supervisor", "owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, CASSA_ROLES);
  if (guard.error) return guard.error;

  const data = await body<{
    orderIds?: unknown;
    paymentMethod?: unknown;
    counterparty?: unknown;
    discount?: unknown;
    vatRate?: unknown;
  }>(req);

  const orderIds = Array.isArray(data.orderIds)
    ? data.orderIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  if (!orderIds.length) return err('Campo "orderIds" richiesto (array di ID ordine).', 400);

  const discount = typeof data.discount === "number" ? data.discount : Number(data.discount) || 0;
  const vatRate = typeof data.vatRate === "number" ? data.vatRate : Number(data.vatRate) || 10;

  try {
    const result = await closeTableOrders(getTenantId(), {
      orderIds,
      paymentMethod: typeof data.paymentMethod === "string" ? data.paymentMethod : "contanti",
      counterparty: typeof data.counterparty === "string" ? data.counterparty : "",
      discount,
      vatRate,
    });
    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(message, 400);
  }
}
