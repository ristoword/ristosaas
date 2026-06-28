import type { FolioChargeSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { emitFolioEvent } from "@/lib/hotel/folio-event-bus";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";

export type FolioActor = {
  userId?: string;
  userName?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  device?: string;
};

export type PostFolioChargeInput = {
  tenantId: string;
  folioId: string;
  source: FolioChargeSource;
  description: string;
  amount: number;
  sourceId?: string | null;
  department?: string;
  operator?: string;
  quantity?: number;
  unitPrice?: number;
  vatPct?: number;
  section?: string;
  splitCode?: string;
  actor?: FolioActor;
};

type ChargeRow = {
  id: string;
  folioId: string;
  source: FolioCharge["source"];
  sourceId: string | null;
  description: string;
  amount: { toNumber: () => number };
  postedAt: Date;
  department: string | null;
  operator: string | null;
  quantity: { toNumber: () => number };
  unitPrice: { toNumber: () => number } | null;
  vatPct: { toNumber: () => number };
  section: string | null;
  splitCode: string;
  lineStatus: string;
  createdByUserId: string | null;
  createdByName: string | null;
};

export function mapChargeRow(row: ChargeRow): FolioCharge {
  return {
    id: row.id,
    folioId: row.folioId,
    source: row.source,
    sourceId: row.sourceId,
    description: row.description,
    amount: row.amount.toNumber(),
    postedAt: row.postedAt.toISOString(),
    department: row.department,
    operator: row.operator,
    quantity: row.quantity.toNumber(),
    unitPrice: row.unitPrice?.toNumber() ?? null,
    vatPct: row.vatPct.toNumber(),
    section: row.section,
    splitCode: row.splitCode,
    lineStatus: row.lineStatus,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
  };
}

export async function folioChargeSum(folioId: string, tx: Prisma.TransactionClient = prisma): Promise<number> {
  const rows = await tx.folioCharge.findMany({
    where: { folioId, lineStatus: { not: "void" } },
    select: { amount: true },
  });
  return rows.reduce((sum, row) => sum + row.amount.toNumber(), 0);
}

export async function recalculateFolioBalance(
  folioId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<number> {
  const balance = await folioChargeSum(folioId, tx);
  await tx.guestFolio.update({
    where: { id: folioId },
    data: { balance, updatedAt: new Date() },
  });
  return balance;
}

export async function writeFolioAudit(
  params: {
    tenantId: string;
    folioId: string;
    chargeId?: string;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    actor?: FolioActor;
  },
  tx: Prisma.TransactionClient = prisma,
) {
  await tx.folioAuditLog.create({
    data: {
      tenantId: params.tenantId,
      folioId: params.folioId,
      chargeId: params.chargeId ?? null,
      userId: params.actor?.userId ?? null,
      userName: params.actor?.userName ?? null,
      userRole: params.actor?.userRole ?? null,
      action: params.action,
      field: params.field ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      ip: params.actor?.ip ?? null,
      userAgent: params.actor?.userAgent ?? null,
      device: params.actor?.device ?? null,
    },
  });
}

export async function assertFolioWritable(tenantId: string, folioId: string) {
  const folio = await prisma.guestFolio.findFirst({
    where: { id: folioId, tenantId },
    select: { id: true, status: true, locked: true },
  });
  if (!folio) throw new Error("Folio not found");
  if (folio.status === "closed") throw new Error("Folio chiuso");
  if (folio.locked) throw new Error("Folio bloccato");
  return folio;
}

export async function postFolioCharge(input: PostFolioChargeInput): Promise<FolioCharge> {
  await assertFolioWritable(input.tenantId, input.folioId);
  const qty = input.quantity ?? 1;
  const unit = input.unitPrice ?? input.amount / qty;

  const charge = await prisma.$transaction(async (tx) => {
    if (input.sourceId) {
      const dup = await tx.folioCharge.findFirst({
        where: {
          folioId: input.folioId,
          sourceId: input.sourceId,
          lineStatus: { not: "void" },
        },
      });
      if (dup) return dup;
    }

    const row = await tx.folioCharge.create({
      data: {
        folioId: input.folioId,
        source: input.source,
        sourceId: input.sourceId ?? null,
        description: input.description,
        amount: input.amount,
        department: input.department ?? null,
        operator: input.operator ?? input.actor?.userName ?? null,
        quantity: qty,
        unitPrice: unit,
        vatPct: input.vatPct ?? 10,
        section: input.section ?? null,
        splitCode: input.splitCode ?? "A",
        lineStatus: "posted",
        createdByUserId: input.actor?.userId ?? null,
        createdByName: input.actor?.userName ?? null,
      },
    });
    await recalculateFolioBalance(input.folioId, tx);
    await writeFolioAudit(
      {
        tenantId: input.tenantId,
        folioId: input.folioId,
        chargeId: row.id,
        action: "charge_posted",
        newValue: `${input.source}:${input.amount}`,
        actor: input.actor,
      },
      tx,
    );
    return row;
  });

  emitFolioEvent(input.tenantId, { folioId: input.folioId, reason: "charge_posted" });
  return mapChargeRow(charge as ChargeRow);
}

export async function postRoomChargesOnCheckIn(params: {
  tenantId: string;
  folioId: string;
  nights: number;
  rate: number;
  roomCode?: string;
  actor?: FolioActor;
}) {
  const existing = await prisma.folioCharge.findFirst({
    where: { folioId: params.folioId, source: "hotel" },
  });
  if (existing) return null;

  const nights = Math.max(1, params.nights);
  const total = +(params.rate * nights).toFixed(2);
  if (total <= 0) return null;

  return postFolioCharge({
    tenantId: params.tenantId,
    folioId: params.folioId,
    source: "hotel",
    description: `Soggiorno camera${params.roomCode ? ` ${params.roomCode}` : ""} — ${nights} notti`,
    amount: total,
    department: "Front Office",
    section: "CAMERA",
    quantity: nights,
    unitPrice: params.rate,
    vatPct: 10,
    actor: params.actor,
  });
}

export async function transferFolioCharge(params: {
  tenantId: string;
  chargeId: string;
  targetFolioId: string;
  actor?: FolioActor;
}) {
  const charge = await prisma.folioCharge.findFirst({
    where: { id: params.chargeId, folio: { tenantId: params.tenantId } },
  });
  if (!charge) throw new Error("Addebito non trovato");
  await assertFolioWritable(params.tenantId, charge.folioId);
  await assertFolioWritable(params.tenantId, params.targetFolioId);

  await prisma.$transaction(async (tx) => {
    await tx.folioCharge.update({
      where: { id: charge.id },
      data: { folioId: params.targetFolioId },
    });
    await recalculateFolioBalance(charge.folioId, tx);
    await recalculateFolioBalance(params.targetFolioId, tx);
    await writeFolioAudit(
      {
        tenantId: params.tenantId,
        folioId: charge.folioId,
        chargeId: charge.id,
        action: "charge_transferred",
        oldValue: charge.folioId,
        newValue: params.targetFolioId,
        actor: params.actor,
      },
      tx,
    );
    await writeFolioAudit(
      {
        tenantId: params.tenantId,
        folioId: params.targetFolioId,
        chargeId: charge.id,
        action: "charge_received",
        newValue: charge.id,
        actor: params.actor,
      },
      tx,
    );
  });

  emitFolioEvent(params.tenantId, { folioId: charge.folioId, reason: "charge_transferred" });
}

export async function updateChargeSplit(params: {
  tenantId: string;
  chargeId: string;
  splitCode: string;
  actor?: FolioActor;
}) {
  const charge = await prisma.folioCharge.findFirst({
    where: { id: params.chargeId, folio: { tenantId: params.tenantId } },
  });
  if (!charge) throw new Error("Addebito non trovato");
  await assertFolioWritable(params.tenantId, charge.folioId);

  await prisma.$transaction(async (tx) => {
    await tx.folioCharge.update({
      where: { id: charge.id },
      data: { splitCode: params.splitCode },
    });
    await writeFolioAudit(
      {
        tenantId: params.tenantId,
        folioId: charge.folioId,
        chargeId: charge.id,
        action: "split_updated",
        field: "splitCode",
        oldValue: charge.splitCode,
        newValue: params.splitCode,
        actor: params.actor,
      },
      tx,
    );
  });
}

export async function voidFolioCharge(params: {
  tenantId: string;
  chargeId: string;
  actor?: FolioActor;
}) {
  const charge = await prisma.folioCharge.findFirst({
    where: { id: params.chargeId, folio: { tenantId: params.tenantId } },
  });
  if (!charge) throw new Error("Addebito non trovato");
  await assertFolioWritable(params.tenantId, charge.folioId);

  await prisma.$transaction(async (tx) => {
    await tx.folioCharge.update({
      where: { id: charge.id },
      data: { lineStatus: "void" },
    });
    await recalculateFolioBalance(charge.folioId, tx);
    await writeFolioAudit(
      {
        tenantId: params.tenantId,
        folioId: charge.folioId,
        chargeId: charge.id,
        action: "charge_voided",
        actor: params.actor,
      },
      tx,
    );
  });

  emitFolioEvent(params.tenantId, { folioId: charge.folioId, reason: "charge_voided" });
}

export async function setFolioLocked(params: {
  tenantId: string;
  folioId: string;
  locked: boolean;
  actor?: FolioActor;
}) {
  const folio = await prisma.guestFolio.findFirst({
    where: { id: params.folioId, tenantId: params.tenantId },
  });
  if (!folio) throw new Error("Folio not found");

  await prisma.$transaction(async (tx) => {
    await tx.guestFolio.update({
      where: { id: params.folioId },
      data: { locked: params.locked, updatedAt: new Date() },
    });
    await writeFolioAudit(
      {
        tenantId: params.tenantId,
        folioId: params.folioId,
        action: params.locked ? "folio_locked" : "folio_unlocked",
        actor: params.actor,
      },
      tx,
    );
  });

  emitFolioEvent(params.tenantId, { folioId: params.folioId, reason: params.locked ? "folio_locked" : "folio_unlocked" });
}

export function actorFromRequest(
  user: { id?: string; username?: string; name?: string; role?: string } | null | undefined,
  headers: Headers,
): FolioActor {
  return {
    userId: user?.id,
    userName: user?.username || user?.name || "operator",
    userRole: user?.role,
    ip: headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || undefined,
    userAgent: headers.get("user-agent") || undefined,
    device: headers.get("sec-ch-ua-platform") || undefined,
  };
}

export async function mergeFolios(params: {
  tenantId: string;
  sourceFolioId: string;
  targetFolioId: string;
  actor?: FolioActor;
}) {
  if (params.sourceFolioId === params.targetFolioId) throw new Error("Source e target devono essere diversi");
  await assertFolioWritable(params.tenantId, params.targetFolioId);
  const source = await prisma.guestFolio.findFirst({
    where: { id: params.sourceFolioId, tenantId: params.tenantId },
  });
  if (!source) throw new Error("Folio sorgente non trovato");

  await prisma.$transaction(async (tx) => {
    const charges = await tx.folioCharge.findMany({
      where: { folioId: params.sourceFolioId, lineStatus: { not: "void" } },
      select: { id: true },
    });
    const chargeIds = charges.map((c) => c.id);
    if (chargeIds.length > 0) {
      await tx.folioCharge.updateMany({
        where: { id: { in: chargeIds } },
        data: { folioId: params.targetFolioId },
      });
    }
    await recalculateFolioBalance(params.targetFolioId, tx);
    await tx.guestFolio.update({
      where: { id: params.sourceFolioId },
      data: { status: "closed", balance: 0, updatedAt: new Date() },
    });
    await tx.folioMergeLog.create({
      data: {
        tenantId: params.tenantId,
        sourceFolioId: params.sourceFolioId,
        targetFolioId: params.targetFolioId,
        chargeIds,
        userId: params.actor?.userId ?? null,
        userName: params.actor?.userName ?? null,
      },
    });
    await writeFolioAudit(
      {
        tenantId: params.tenantId,
        folioId: params.targetFolioId,
        action: "folio_merged",
        oldValue: params.sourceFolioId,
        newValue: params.targetFolioId,
        actor: params.actor,
      },
      tx,
    );
  });

  emitFolioEvent(params.tenantId, { folioId: params.targetFolioId, reason: "folio_merged" });
}

export async function transferChargesBatch(params: {
  tenantId: string;
  chargeIds: string[];
  targetFolioId: string;
  actor?: FolioActor;
}) {
  if (params.chargeIds.length === 0) throw new Error("Nessun addebito selezionato");
  await assertFolioWritable(params.tenantId, params.targetFolioId);

  await prisma.$transaction(async (tx) => {
    const charges = await tx.folioCharge.findMany({
      where: { id: { in: params.chargeIds }, folio: { tenantId: params.tenantId } },
    });
    if (charges.length !== params.chargeIds.length) throw new Error("Addebiti non trovati");
    const sourceFolios = new Set(charges.map((c) => c.folioId));
    for (const sourceId of sourceFolios) {
      await assertFolioWritable(params.tenantId, sourceId);
    }
    await tx.folioCharge.updateMany({
      where: { id: { in: params.chargeIds } },
      data: { folioId: params.targetFolioId },
    });
    for (const sourceId of sourceFolios) {
      await recalculateFolioBalance(sourceId, tx);
    }
    await recalculateFolioBalance(params.targetFolioId, tx);
    await writeFolioAudit(
      {
        tenantId: params.tenantId,
        folioId: params.targetFolioId,
        action: "charges_transferred_batch",
        newValue: params.chargeIds.join(","),
        actor: params.actor,
      },
      tx,
    );
  });

  emitFolioEvent(params.tenantId, { folioId: params.targetFolioId, reason: "charges_transferred" });
}

export async function upsertSplitDefinition(params: {
  tenantId: string;
  folioId: string;
  code: string;
  label: string;
  sortOrder?: number;
  actor?: FolioActor;
}) {
  await assertFolioWritable(params.tenantId, params.folioId);
  const row = await prisma.folioSplitDefinition.upsert({
    where: { folioId_code: { folioId: params.folioId, code: params.code } },
    update: { label: params.label, sortOrder: params.sortOrder ?? 0 },
    create: {
      tenantId: params.tenantId,
      folioId: params.folioId,
      code: params.code,
      label: params.label,
      sortOrder: params.sortOrder ?? 0,
    },
  });
  await writeFolioAudit({
    tenantId: params.tenantId,
    folioId: params.folioId,
    action: "split_definition_upserted",
    newValue: `${params.code}:${params.label}`,
    actor: params.actor,
  });
  return row;
}
