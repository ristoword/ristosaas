import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { fiscalInvoiceRepository } from "@/lib/db/repositories/fiscal-invoice.repository";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const kind = new URL(req.url).searchParams.get("kind") ?? undefined;
  const rows = await fiscalInvoiceRepository.list(getTenantId(), kind || undefined);
  return ok(
    rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      progressiveNumber: r.progressiveNumber,
      issueDate: r.issueDate.toISOString(),
      counterparty: r.counterparty,
      counterpartyVat: r.counterpartyVat,
      amount: r.amount.toNumber(),
      vatAmount: r.vatAmount.toNumber(),
      total: r.total.toNumber(),
      sdiStatus: r.sdiStatus,
      sdiMessageId: r.sdiMessageId,
      orderId: r.orderId,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    })),
  );
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }

  const data = await body<{
    kind?: unknown;
    counterparty?: unknown;
    counterpartyVat?: unknown;
    lines?: unknown;
    orderId?: unknown;
    notes?: unknown;
  }>(req);

  const kind = typeof data.kind === "string" ? data.kind.trim() : "";
  if (!kind) return err('Campo "kind" richiesto.', 400);

  if (!Array.isArray(data.lines) || !data.lines.length) {
    return err('Campo "lines" richiesto (array con description, quantity, unitPrice, vatRate).', 400);
  }

  const lines = data.lines.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Riga fattura non valida");
    }
    const l = row as Record<string, unknown>;
    return {
      description: typeof l.description === "string" ? l.description : "Voce",
      quantity: typeof l.quantity === "number" ? l.quantity : Number(l.quantity) || 1,
      unitPrice: typeof l.unitPrice === "number" ? l.unitPrice : Number(l.unitPrice) || 0,
      vatRate: typeof l.vatRate === "number" ? l.vatRate : Number(l.vatRate) || 10,
    };
  });

  try {
    const invoice = await fiscalInvoiceRepository.createAndTransmit(getTenantId(), {
      kind,
      counterparty: typeof data.counterparty === "string" ? data.counterparty : "Cliente",
      counterpartyVat: typeof data.counterpartyVat === "string" ? data.counterpartyVat : "",
      lines,
      orderId: typeof data.orderId === "string" ? data.orderId : undefined,
      notes: typeof data.notes === "string" ? data.notes : "",
    });
    return ok(
      {
        id: invoice.id,
        kind: invoice.kind,
        progressiveNumber: invoice.progressiveNumber,
        sdiStatus: invoice.sdiStatus,
        sdiMessageId: invoice.sdiMessageId,
        total: invoice.total.toNumber(),
      },
      201,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(message, 400);
  }
}
