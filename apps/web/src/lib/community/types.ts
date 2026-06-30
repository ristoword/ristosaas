import type { CommunityCategory, CommunityDifficulty } from "@/lib/community/constants";

export type CommunityChefSummary = {
  id: string;
  userId: string;
  displayName: string;
  signature: string;
  photoUrl: string | null;
  restaurantName: string;
  city: string;
  country: string;
  followerCount: number;
  likeCount: number;
  importCount: number;
  recipeCount: number;
  bio?: string;
  isFollowing?: boolean;
};

export type CommunityIngredient = {
  id?: string;
  name: string;
  qty: number;
  unit: string;
  sortOrder?: number;
};

export type CommunityStep = {
  id?: string;
  order: number;
  text: string;
};

export type CommunityRecipeSummary = {
  id: string;
  title: string;
  category: CommunityCategory | string;
  photoUrl: string | null;
  prepTimeMin: number;
  cookTimeMin: number;
  difficulty: CommunityDifficulty;
  portions: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  importCount: number;
  publishedAt: string;
  featured: boolean;
  chef: CommunityChefSummary;
  likedByMe?: boolean;
};

export type CommunityRecipeDetail = CommunityRecipeSummary & {
  description: string;
  allergens: string;
  chefTips: string;
  techniques: string;
  plating: string;
  variants: string;
  temperatures: string;
  theoreticalCost: number | null;
  authorUserId: string;
  ingredients: CommunityIngredient[];
  steps: CommunityStep[];
  updatedAt: string;
};

export type CommunityComment = {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  replies: CommunityComment[];
};

export type CommunityRankings = {
  topChefsByFollowers: CommunityChefSummary[];
  topChefsByLikes: CommunityChefSummary[];
  mostViewedRecipes: CommunityRecipeSummary[];
  mostCommentedRecipes: CommunityRecipeSummary[];
  mostImportedRecipes: CommunityRecipeSummary[];
  chefOfTheMonth: CommunityChefSummary | null;
  newRecipes: CommunityRecipeSummary[];
  featuredRecipes: CommunityRecipeSummary[];
};

export type CommunityRecipeInput = {
  title: string;
  category: string;
  description?: string;
  photoUrl?: string | null;
  prepTimeMin?: number;
  cookTimeMin?: number;
  difficulty?: CommunityDifficulty;
  portions?: number;
  allergens?: string;
  chefTips?: string;
  techniques?: string;
  plating?: string;
  variants?: string;
  temperatures?: string;
  theoreticalCost?: number | null;
  ingredients: CommunityIngredient[];
  steps: CommunityStep[];
};

export type CommunityChefProfileInput = {
  displayName: string;
  signature?: string;
  bio?: string;
  photoUrl?: string | null;
  restaurantName: string;
  city?: string;
  country?: string;
};

export type CommunityAiImproveResult = {
  description?: string;
  chefTips?: string;
  techniques?: string;
  plating?: string;
  variants?: string;
  suggestedIngredients?: CommunityIngredient[];
};
