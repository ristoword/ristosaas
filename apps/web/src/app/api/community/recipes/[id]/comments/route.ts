import { NextRequest } from "next/server";
import { ok, err, body, fireAndForget } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(_req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  return ok(await communityRepository.listComments(id));
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const data = await body<{ body: string; parentId?: string }>(req);
  if (!data.body?.trim()) return err("Commento vuoto");
  const { comment, recipe } = await communityRepository.addComment(
    id,
    guard.user!.id,
    guard.user!.name,
    getTenantId(),
    data.body.trim(),
    data.parentId,
  );
  if (recipe && recipe.authorUserId !== guard.user!.id) {
    const author = await prisma.user.findUnique({
      where: { id: recipe.authorUserId },
      select: { tenantId: true },
    });
    if (author) {
      fireAndForget(
        prisma.notification.create({
          data: {
            tenantId: author.tenantId,
            userId: recipe.authorUserId,
            type: "community_comment",
            title: "Nuovo commento sulla tua ricetta",
            message: `${guard.user!.name}: ${data.body.trim().slice(0, 120)}`,
            href: `/risto-community/recipe/${id}`,
          },
        }),
        "community:comment-notification",
      );
    }
  }
  return ok(comment, 201);
}
