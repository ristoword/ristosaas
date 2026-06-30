import { NextRequest } from "next/server";
import { ok, err, body, fireAndForget } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const chef = await communityRepository.getChefById(id, guard.user!.id);
  if (!chef) return err("Chef non trovato", 404);
  const recipes = await communityRepository.listRecipes({ chefId: id, limit: 48 }, guard.user!.id);
  return ok({ chef, recipes });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const result = await communityRepository.toggleFollow(id, guard.user!.id);
  if (result.following && result.chef && result.chef.userId !== guard.user!.id) {
    const chefUser = await prisma.user.findUnique({ where: { id: result.chef.userId }, select: { tenantId: true } });
    if (chefUser) {
      fireAndForget(
        prisma.notification.create({
          data: {
            tenantId: chefUser.tenantId,
            userId: result.chef.userId,
            type: "community_follow",
            title: "Nuovo follower",
            message: `${guard.user!.name} ha iniziato a seguirti su Risto Community`,
            href: `/risto-community/chef/${id}`,
          },
        }),
        "community:follow-notification",
      );
    }
  }
  return ok(result);
}
