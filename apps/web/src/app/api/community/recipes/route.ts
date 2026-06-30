import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const recipes = await communityRepository.listRecipes(
    {
      search: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      ingredient: url.searchParams.get("ingredient") ?? undefined,
      chef: url.searchParams.get("chef") ?? undefined,
      restaurant: url.searchParams.get("restaurant") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      country: url.searchParams.get("country") ?? undefined,
      sort: (url.searchParams.get("sort") as "recent" | "views" | "likes" | "comments" | "imports") ?? "recent",
      limit: Number(url.searchParams.get("limit") ?? 48),
    },
    guard.user!.id,
  );
  return ok(recipes);
}
