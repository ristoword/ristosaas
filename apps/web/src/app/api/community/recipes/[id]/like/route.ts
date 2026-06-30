import { NextRequest } from "next/server";
import { ok, fireAndForget } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const result = await communityRepository.toggleLike(id, guard.user!.id);
  if (result.liked && result.recipe && result.recipe.authorUserId !== guard.user!.id) {
    const author = await prisma.user.findUnique({
      where: { id: result.recipe.authorUserId },
      select: { tenantId: true },
    });
    if (author) {
      fireAndForget(
        prisma.notification.create({
          data: {
            tenantId: author.tenantId,
            userId: result.recipe.authorUserId,
            type: "community_like",
            title: "Nuovo like sulla tua ricetta",
            message: `${guard.user!.name} ha messo like a "${result.recipe.title}"`,
            href: `/risto-community/recipe/${id}`,
          },
        }),
        "community:like-notification",
      );
    }
  }
  return ok(result);
}
