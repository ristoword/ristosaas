import { prisma } from "@/lib/db/prisma";
import { kitchenMenuRepository } from "@/lib/db/repositories/kitchen-menu.repository";
import type {
  CommunityChefProfileInput,
  CommunityChefSummary,
  CommunityComment,
  CommunityRecipeDetail,
  CommunityRecipeInput,
  CommunityRecipeSummary,
  CommunityRankings,
} from "@/lib/community/types";
import type { CommunityDifficulty } from "@/lib/community/constants";

type ChefRow = {
  id: string;
  userId: string;
  displayName: string;
  signature: string;
  bio: string;
  photoUrl: string | null;
  restaurantName: string;
  city: string;
  country: string;
  followerCount: number;
  likeCount: number;
  importCount: number;
  recipeCount: number;
};

type RecipeRow = {
  id: string;
  title: string;
  category: string;
  photoUrl: string | null;
  prepTimeMin: number;
  cookTimeMin: number;
  difficulty: string;
  portions: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  importCount: number;
  publishedAt: Date;
  featured: boolean;
  description: string;
  allergens: string;
  chefTips: string;
  techniques: string;
  plating: string;
  variants: string;
  temperatures: string;
  theoreticalCost: { toNumber: () => number } | null;
  authorUserId: string;
  updatedAt: Date;
  chef: ChefRow;
  ingredients?: Array<{ id: string; name: string; qty: { toNumber: () => number }; unit: string; sortOrder: number }>;
  steps?: Array<{ id: string; stepOrder: number; text: string }>;
};

function mapChef(row: ChefRow, extras?: { isFollowing?: boolean }): CommunityChefSummary {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    signature: row.signature,
    photoUrl: row.photoUrl,
    restaurantName: row.restaurantName,
    city: row.city,
    country: row.country,
    followerCount: row.followerCount,
    likeCount: row.likeCount,
    importCount: row.importCount,
    recipeCount: row.recipeCount,
    bio: row.bio,
    isFollowing: extras?.isFollowing,
  };
}

function mapRecipeSummary(row: RecipeRow, likedByMe = false): CommunityRecipeSummary {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    photoUrl: row.photoUrl,
    prepTimeMin: row.prepTimeMin,
    cookTimeMin: row.cookTimeMin,
    difficulty: row.difficulty as CommunityDifficulty,
    portions: row.portions,
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    importCount: row.importCount,
    publishedAt: row.publishedAt.toISOString(),
    featured: row.featured,
    chef: mapChef(row.chef),
    likedByMe,
  };
}

function mapRecipeDetail(row: RecipeRow, likedByMe = false): CommunityRecipeDetail {
  return {
    ...mapRecipeSummary(row, likedByMe),
    description: row.description,
    allergens: row.allergens,
    chefTips: row.chefTips,
    techniques: row.techniques,
    plating: row.plating,
    variants: row.variants,
    temperatures: row.temperatures,
    theoreticalCost: row.theoreticalCost ? row.theoreticalCost.toNumber() : null,
    authorUserId: row.authorUserId,
    updatedAt: row.updatedAt.toISOString(),
    ingredients: (row.ingredients ?? []).map((ing) => ({
      id: ing.id,
      name: ing.name,
      qty: ing.qty.toNumber(),
      unit: ing.unit,
      sortOrder: ing.sortOrder,
    })),
    steps: (row.steps ?? [])
      .slice()
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s) => ({ id: s.id, order: s.stepOrder, text: s.text })),
  };
}

function buildSearchWhere(q: {
  search?: string;
  category?: string;
  ingredient?: string;
  chef?: string;
  restaurant?: string;
  city?: string;
  country?: string;
}) {
  const and: Record<string, unknown>[] = [{ moderated: true }];
  if (q.category) and.push({ category: q.category });
  if (q.search?.trim()) {
    const s = q.search.trim();
    and.push({
      OR: [
        { title: { contains: s, mode: "insensitive" } },
        { description: { contains: s, mode: "insensitive" } },
        { chef: { displayName: { contains: s, mode: "insensitive" } } },
        { chef: { restaurantName: { contains: s, mode: "insensitive" } } },
        { chef: { city: { contains: s, mode: "insensitive" } } },
        { chef: { country: { contains: s, mode: "insensitive" } } },
        { ingredients: { some: { name: { contains: s, mode: "insensitive" } } } },
      ],
    });
  }
  if (q.ingredient?.trim()) {
    and.push({ ingredients: { some: { name: { contains: q.ingredient.trim(), mode: "insensitive" } } } });
  }
  if (q.chef?.trim()) {
    and.push({ chef: { displayName: { contains: q.chef.trim(), mode: "insensitive" } } });
  }
  if (q.restaurant?.trim()) {
    and.push({ chef: { restaurantName: { contains: q.restaurant.trim(), mode: "insensitive" } } });
  }
  if (q.city?.trim()) {
    and.push({ chef: { city: { contains: q.city.trim(), mode: "insensitive" } } });
  }
  if (q.country?.trim()) {
    and.push({ chef: { country: { contains: q.country.trim(), mode: "insensitive" } } });
  }
  return { AND: and };
}

async function likedRecipeIds(userId: string, recipeIds: string[]) {
  if (!recipeIds.length) return new Set<string>();
  const likes = await prisma.communityRecipeLike.findMany({
    where: { userId, recipeId: { in: recipeIds } },
    select: { recipeId: true },
  });
  return new Set(likes.map((l) => l.recipeId));
}

export const communityRepository = {
  async ensureChefProfile(userId: string, tenantId: string, tenantName: string, userName: string) {
    const existing = await prisma.communityChefProfile.findUnique({ where: { userId } });
    if (existing) return mapChef(existing);
    const created = await prisma.communityChefProfile.create({
      data: {
        userId,
        tenantId,
        displayName: userName,
        restaurantName: tenantName,
      },
    });
    return mapChef(created);
  },

  async updateChefProfile(userId: string, data: CommunityChefProfileInput) {
    const row = await prisma.communityChefProfile.update({
      where: { userId },
      data: {
        displayName: data.displayName,
        signature: data.signature ?? "",
        bio: data.bio ?? "",
        photoUrl: data.photoUrl ?? null,
        restaurantName: data.restaurantName,
        city: data.city ?? "",
        country: data.country ?? "Italia",
      },
    });
    return mapChef(row);
  },

  async getChefById(chefId: string, viewerUserId?: string) {
    const row = await prisma.communityChefProfile.findUnique({ where: { id: chefId } });
    if (!row) return null;
    let isFollowing = false;
    if (viewerUserId) {
      const follow = await prisma.communityChefFollow.findUnique({
        where: { chefId_userId: { chefId, userId: viewerUserId } },
      });
      isFollowing = Boolean(follow);
    }
    return mapChef(row, { isFollowing });
  },

  async getChefByUserId(userId: string) {
    const row = await prisma.communityChefProfile.findUnique({ where: { userId } });
    return row ? mapChef(row) : null;
  },

  async listRecipes(
    filters: {
      search?: string;
      category?: string;
      ingredient?: string;
      chef?: string;
      restaurant?: string;
      city?: string;
      country?: string;
      chefId?: string;
      sort?: "recent" | "views" | "likes" | "comments" | "imports";
      limit?: number;
    },
    viewerUserId?: string,
  ) {
    const where = buildSearchWhere(filters);
    if (filters.chefId) {
      (where.AND as Record<string, unknown>[]).push({ chefId: filters.chefId });
    }
    const orderBy =
      filters.sort === "views"
        ? { viewCount: "desc" as const }
        : filters.sort === "likes"
          ? { likeCount: "desc" as const }
          : filters.sort === "comments"
            ? { commentCount: "desc" as const }
            : filters.sort === "imports"
              ? { importCount: "desc" as const }
              : { publishedAt: "desc" as const };

    const rows = await prisma.communityRecipe.findMany({
      where,
      include: { chef: true },
      orderBy,
      take: filters.limit ?? 48,
    });
    const liked = await likedRecipeIds(viewerUserId ?? "", rows.map((r) => r.id));
    return rows.map((r) => mapRecipeSummary(r as RecipeRow, liked.has(r.id)));
  },

  async getRecipe(id: string, viewerUserId?: string, incrementView = false) {
    if (incrementView) {
      await prisma.communityRecipe.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }
    const row = await prisma.communityRecipe.findFirst({
      where: { id, moderated: true },
      include: { chef: true, ingredients: true, steps: true },
    });
    if (!row) return null;
    const liked = viewerUserId
      ? await prisma.communityRecipeLike.findUnique({
          where: { recipeId_userId: { recipeId: id, userId: viewerUserId } },
        })
      : null;
    return mapRecipeDetail(row as RecipeRow, Boolean(liked));
  },

  async createRecipe(
    chefId: string,
    authorUserId: string,
    authorTenantId: string,
    data: CommunityRecipeInput,
  ) {
    const row = await prisma.communityRecipe.create({
      data: {
        chefId,
        authorUserId,
        authorTenantId,
        title: data.title.trim(),
        category: data.category,
        description: data.description ?? "",
        photoUrl: data.photoUrl ?? null,
        prepTimeMin: data.prepTimeMin ?? 0,
        cookTimeMin: data.cookTimeMin ?? 0,
        difficulty: data.difficulty ?? "medium",
        portions: data.portions ?? 4,
        allergens: data.allergens ?? "",
        chefTips: data.chefTips ?? "",
        techniques: data.techniques ?? "",
        plating: data.plating ?? "",
        variants: data.variants ?? "",
        temperatures: data.temperatures ?? "",
        theoreticalCost: data.theoreticalCost ?? null,
        ingredients: {
          create: data.ingredients.map((ing, idx) => ({
            name: ing.name,
            qty: ing.qty,
            unit: ing.unit,
            sortOrder: ing.sortOrder ?? idx,
          })),
        },
        steps: {
          create: data.steps.map((step) => ({
            stepOrder: step.order,
            text: step.text,
          })),
        },
      },
      include: { chef: true, ingredients: true, steps: true },
    });
    await prisma.communityChefProfile.update({
      where: { id: chefId },
      data: { recipeCount: { increment: 1 } },
    });
    return mapRecipeDetail(row as RecipeRow);
  },

  async updateRecipe(recipeId: string, authorUserId: string, isSuperAdmin: boolean, data: Partial<CommunityRecipeInput>) {
    const existing = await prisma.communityRecipe.findUnique({ where: { id: recipeId } });
    if (!existing) return null;
    if (!isSuperAdmin && existing.authorUserId !== authorUserId) return null;

    await prisma.communityRecipeIngredient.deleteMany({ where: { recipeId } });
    await prisma.communityRecipeStep.deleteMany({ where: { recipeId } });

    const row = await prisma.communityRecipe.update({
      where: { id: recipeId },
      data: {
        title: data.title?.trim() ?? existing.title,
        category: data.category ?? existing.category,
        description: data.description ?? existing.description,
        photoUrl: data.photoUrl !== undefined ? data.photoUrl : existing.photoUrl,
        prepTimeMin: data.prepTimeMin ?? existing.prepTimeMin,
        cookTimeMin: data.cookTimeMin ?? existing.cookTimeMin,
        difficulty: data.difficulty ?? existing.difficulty,
        portions: data.portions ?? existing.portions,
        allergens: data.allergens ?? existing.allergens,
        chefTips: data.chefTips ?? existing.chefTips,
        techniques: data.techniques ?? existing.techniques,
        plating: data.plating ?? existing.plating,
        variants: data.variants ?? existing.variants,
        temperatures: data.temperatures ?? existing.temperatures,
        theoreticalCost: data.theoreticalCost !== undefined ? data.theoreticalCost : existing.theoreticalCost,
        ingredients: data.ingredients
          ? {
              create: data.ingredients.map((ing, idx) => ({
                name: ing.name,
                qty: ing.qty,
                unit: ing.unit,
                sortOrder: ing.sortOrder ?? idx,
              })),
            }
          : undefined,
        steps: data.steps
          ? { create: data.steps.map((step) => ({ stepOrder: step.order, text: step.text })) }
          : undefined,
      },
      include: { chef: true, ingredients: true, steps: true },
    });
    return mapRecipeDetail(row as RecipeRow);
  },

  async moderateRecipe(recipeId: string, moderated: boolean) {
    const row = await prisma.communityRecipe.update({
      where: { id: recipeId },
      data: { moderated },
      include: { chef: true, ingredients: true, steps: true },
    });
    return mapRecipeDetail(row as RecipeRow);
  },

  async toggleLike(recipeId: string, userId: string) {
    const existing = await prisma.communityRecipeLike.findUnique({
      where: { recipeId_userId: { recipeId, userId } },
    });
    if (existing) {
      await prisma.communityRecipeLike.delete({ where: { id: existing.id } });
      const recipe = await prisma.communityRecipe.update({
        where: { id: recipeId },
        data: { likeCount: { decrement: 1 } },
        select: { chefId: true },
      });
      await prisma.communityChefProfile.update({
        where: { id: recipe.chefId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    }
    await prisma.communityRecipeLike.create({ data: { recipeId, userId } });
    const recipe = await prisma.communityRecipe.update({
      where: { id: recipeId },
      data: { likeCount: { increment: 1 } },
      select: { authorUserId: true, title: true, chefId: true },
    });
    await prisma.communityChefProfile.update({
      where: { id: recipe.chefId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true, recipe };
  },

  async listComments(recipeId: string): Promise<CommunityComment[]> {
    const rows = await prisma.communityRecipeComment.findMany({
      where: { recipeId },
      orderBy: { createdAt: "asc" },
    });
    const byId = new Map<string, CommunityComment>();
    for (const row of rows) {
      byId.set(row.id, {
        id: row.id,
        recipeId: row.recipeId,
        userId: row.userId,
        userName: row.userName,
        body: row.body,
        parentId: row.parentId,
        createdAt: row.createdAt.toISOString(),
        replies: [],
      });
    }
    const roots: CommunityComment[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.replies.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  },

  async addComment(recipeId: string, userId: string, userName: string, tenantId: string, body: string, parentId?: string) {
    const row = await prisma.communityRecipeComment.create({
      data: { recipeId, userId, userName, tenantId, body, parentId: parentId ?? null },
    });
    await prisma.communityRecipe.update({
      where: { id: recipeId },
      data: { commentCount: { increment: 1 } },
    });
    const recipe = await prisma.communityRecipe.findUnique({
      where: { id: recipeId },
      select: { authorUserId: true, title: true },
    });
    return { comment: row, recipe };
  },

  async toggleFollow(chefId: string, userId: string) {
    const existing = await prisma.communityChefFollow.findUnique({
      where: { chefId_userId: { chefId, userId } },
    });
    if (existing) {
      await prisma.communityChefFollow.delete({ where: { id: existing.id } });
      await prisma.communityChefProfile.update({
        where: { id: chefId },
        data: { followerCount: { decrement: 1 } },
      });
      return { following: false };
    }
    await prisma.communityChefFollow.create({ data: { chefId, userId } });
    await prisma.communityChefProfile.update({
      where: { id: chefId },
      data: { followerCount: { increment: 1 } },
    });
    const chef = await prisma.communityChefProfile.findUnique({
      where: { id: chefId },
      select: { userId: true, displayName: true },
    });
    return { following: true, chef };
  },

  async getRankings(viewerUserId?: string): Promise<CommunityRankings> {
    const [
      topChefsByFollowers,
      topChefsByLikes,
      mostViewedRecipes,
      mostCommentedRecipes,
      mostImportedRecipes,
      newRecipes,
      featuredRecipes,
    ] = await Promise.all([
      prisma.communityChefProfile.findMany({ orderBy: { followerCount: "desc" }, take: 10 }),
      prisma.communityChefProfile.findMany({ orderBy: { likeCount: "desc" }, take: 10 }),
      prisma.communityRecipe.findMany({ where: { moderated: true }, include: { chef: true }, orderBy: { viewCount: "desc" }, take: 10 }),
      prisma.communityRecipe.findMany({ where: { moderated: true }, include: { chef: true }, orderBy: { commentCount: "desc" }, take: 10 }),
      prisma.communityRecipe.findMany({ where: { moderated: true }, include: { chef: true }, orderBy: { importCount: "desc" }, take: 10 }),
      prisma.communityRecipe.findMany({ where: { moderated: true }, include: { chef: true }, orderBy: { publishedAt: "desc" }, take: 10 }),
      prisma.communityRecipe.findMany({ where: { moderated: true, featured: true }, include: { chef: true }, orderBy: { publishedAt: "desc" }, take: 10 }),
    ]);

    const chefOfTheMonth = topChefsByLikes[0] ? mapChef(topChefsByLikes[0]) : null;
    const recipeIds = [
      ...mostViewedRecipes,
      ...mostCommentedRecipes,
      ...mostImportedRecipes,
      ...newRecipes,
      ...featuredRecipes,
    ].map((r) => r.id);
    const liked = await likedRecipeIds(viewerUserId ?? "", recipeIds);

    return {
      topChefsByFollowers: topChefsByFollowers.map((c) => mapChef(c)),
      topChefsByLikes: topChefsByLikes.map((c) => mapChef(c)),
      mostViewedRecipes: mostViewedRecipes.map((r) => mapRecipeSummary(r as RecipeRow, liked.has(r.id))),
      mostCommentedRecipes: mostCommentedRecipes.map((r) => mapRecipeSummary(r as RecipeRow, liked.has(r.id))),
      mostImportedRecipes: mostImportedRecipes.map((r) => mapRecipeSummary(r as RecipeRow, liked.has(r.id))),
      chefOfTheMonth,
      newRecipes: newRecipes.map((r) => mapRecipeSummary(r as RecipeRow, liked.has(r.id))),
      featuredRecipes: featuredRecipes.map((r) => mapRecipeSummary(r as RecipeRow, liked.has(r.id))),
    };
  },

  async applyTranslation(recipeId: string, locale: string, payload: {
    title: string;
    description: string;
    chefTips: string;
    techniques: string;
    plating: string;
    variants: string;
    stepsJson: string;
  }) {
    return prisma.communityRecipeTranslation.upsert({
      where: { recipeId_locale: { recipeId, locale } },
      create: { recipeId, locale, ...payload },
      update: payload,
    });
  },

  async getTranslation(recipeId: string, locale: string) {
    return prisma.communityRecipeTranslation.findUnique({
      where: { recipeId_locale: { recipeId, locale } },
    });
  },

  async importToRicettario(
    recipeId: string,
    tenantId: string,
    userId: string,
    importerName: string,
  ) {
    const recipe = await prisma.communityRecipe.findFirst({
      where: { id: recipeId, moderated: true },
      include: { chef: true, ingredients: true, steps: true },
    });
    if (!recipe) return null;

    const attribution = [
      "────────────────────────",
      "Ricetta originale pubblicata da",
      `Chef: ${recipe.chef.displayName}`,
      `Ristorante: ${recipe.chef.restaurantName}`,
      `Città: ${recipe.chef.city}`,
      `Paese: ${recipe.chef.country}`,
      `Data pubblicazione: ${recipe.publishedAt.toISOString().slice(0, 10)}`,
      `Community ID: ${recipe.id}`,
      "────────────────────────",
    ].join("\n");

    const localRecipe = await kitchenMenuRepository.createRecipe(tenantId, {
      name: recipe.title,
      category: recipe.category,
      area: "cucina",
      portions: recipe.portions,
      sellingPrice: 0,
      targetFcPct: 30,
      ivaPct: 10,
      overheadPct: 0,
      packagingCost: 0,
      laborCost: 0,
      energyCost: 0,
      notes: [
        recipe.description,
        recipe.allergens ? `Allergeni: ${recipe.allergens}` : "",
        recipe.chefTips ? `Consigli: ${recipe.chefTips}` : "",
        attribution,
      ]
        .filter(Boolean)
        .join("\n\n"),
      ingredients: recipe.ingredients.map((ing) => ({
        id: "",
        name: ing.name,
        qty: ing.qty.toNumber(),
        unit: ing.unit,
        unitCost: 0,
        wastePct: 0,
      })),
      steps: recipe.steps
        .slice()
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((s) => ({ id: "", order: s.stepOrder, text: s.text })),
    });

    await prisma.communityRecipeImport.create({
      data: { recipeId, tenantId, userId, localRecipeId: localRecipe.id },
    });
    await prisma.communityRecipe.update({
      where: { id: recipeId },
      data: { importCount: { increment: 1 } },
    });
    await prisma.communityChefProfile.update({
      where: { id: recipe.chefId },
      data: { importCount: { increment: 1 } },
    });

    return {
      localRecipeId: localRecipe.id,
      localRecipeName: localRecipe.name,
      authorUserId: recipe.authorUserId,
      recipeTitle: recipe.title,
      importerName,
    };
  },
};
