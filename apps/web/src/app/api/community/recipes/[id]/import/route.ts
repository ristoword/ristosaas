import { NextRequest } from "next/server";
import { ok, err, fireAndForget } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ["owner", "cucina", "supervisor", "super_admin"]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const result = await communityRepository.importToRicettario(
    id,
    getTenantId(),
    guard.user!.id,
    guard.user!.name,
  );
  if (!result) return err("Ricetta non trovata", 404);

  if (result.authorUserId !== guard.user!.id) {
    const author = await prisma.user.findUnique({
      where: { id: result.authorUserId },
      select: { tenantId: true },
    });
    if (author) {
      fireAndForget(
        prisma.notification.create({
          data: {
            tenantId: author.tenantId,
            userId: result.authorUserId,
            type: "community_import",
            title: "La tua ricetta è stata importata",
            message: `${result.importerName} ha importato "${result.recipeTitle}" nel ricettario`,
            href: `/risto-community/recipe/${id}`,
          },
        }),
        "community:import-notification",
      );
    }
  }

  return ok({
    localRecipeId: result.localRecipeId,
    localRecipeName: result.localRecipeName,
    communityRecipeId: id,
  }, 201);
}
