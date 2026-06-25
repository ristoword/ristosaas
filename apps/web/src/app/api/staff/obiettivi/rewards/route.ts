import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const MANAGER_ROLES = ["supervisor", "owner", "super_admin"] as const;

const REWARD_TYPES = [
  "bonus_cash",
  "salary_increase",
  "meal_voucher",
  "gift_voucher",
  "role_promotion",
  "recognition",
  "extra_day_off",
  "other",
] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, MANAGER_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{
    staffName: string;
    type: string;
    description: string;
    value?: number | null;
    period: string;
  }>(req);

  if (!data.staffName || !data.type || !data.description || !data.period) {
    return err("Campi obbligatori mancanti: staffName, type, description, period");
  }

  if (!REWARD_TYPES.includes(data.type as (typeof REWARD_TYPES)[number])) {
    return err(`Tipo premio non valido. Valori ammessi: ${REWARD_TYPES.join(", ")}`);
  }

  const reward = await prisma.staffReward.create({
    data: {
      tenantId,
      staffName: data.staffName,
      type: data.type,
      description: data.description,
      value: data.value ?? null,
      period: data.period,
      awardedBy: guard.user.id,
      awardedByName: guard.user.name,
    },
  });

  return ok(reward, 201);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireApiUser(req, MANAGER_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const url = new URL(req.url);
  const rewardId = url.searchParams.get("id");
  if (!rewardId) return err("Parametro 'id' mancante");

  const existing = await prisma.staffReward.findFirst({
    where: { id: rewardId, tenantId },
  });
  if (!existing) return err("Premio non trovato", 404);

  await prisma.staffReward.delete({ where: { id: rewardId } });
  return ok({ deleted: true });
}
