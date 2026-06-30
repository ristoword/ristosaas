import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { normalizeProductKey } from "@/lib/warehouse/bolla-import/categories";

export async function getLearnedWineId(tenantId: string, description: string): Promise<string | null> {
  const productKey = normalizeProductKey(description);
  if (!productKey) return null;
  const row = await prisma.wineImportAlias.findUnique({
    where: { tenantId_productKey: { tenantId, productKey } },
    select: { wineCellarItemId: true },
  });
  return row?.wineCellarItemId ?? null;
}

export async function learnWineAlias(
  tenantId: string,
  description: string,
  wineCellarItemId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const productKey = normalizeProductKey(description);
  if (!productKey || !wineCellarItemId) return;
  const db = tx ?? prisma;
  await db.wineImportAlias.upsert({
    where: { tenantId_productKey: { tenantId, productKey } },
    create: { tenantId, productKey, wineCellarItemId },
    update: { wineCellarItemId, hitCount: { increment: 1 }, updatedAt: new Date() },
  });
}
