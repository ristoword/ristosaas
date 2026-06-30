-- CreateEnum
CREATE TYPE "CommunityRecipeDifficulty" AS ENUM ('easy', 'medium', 'hard', 'expert');

-- CreateTable
CREATE TABLE "CommunityChefProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "signature" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT,
    "restaurantName" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'Italia',
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "importCount" INTEGER NOT NULL DEFAULT 0,
    "recipeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityChefProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityChefFollow" (
    "id" TEXT NOT NULL,
    "chefId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityChefFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRecipe" (
    "id" TEXT NOT NULL,
    "chefId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorTenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT,
    "prepTimeMin" INTEGER NOT NULL DEFAULT 0,
    "cookTimeMin" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "CommunityRecipeDifficulty" NOT NULL DEFAULT 'medium',
    "portions" INTEGER NOT NULL DEFAULT 4,
    "allergens" TEXT NOT NULL DEFAULT '',
    "chefTips" TEXT NOT NULL DEFAULT '',
    "techniques" TEXT NOT NULL DEFAULT '',
    "plating" TEXT NOT NULL DEFAULT '',
    "variants" TEXT NOT NULL DEFAULT '',
    "temperatures" TEXT NOT NULL DEFAULT '',
    "theoreticalCost" DECIMAL(10,2),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "moderated" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "importCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CommunityRecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRecipeStep" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "CommunityRecipeStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRecipeLike" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRecipeLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRecipeComment" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRecipeComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRecipeTranslation" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "chefTips" TEXT NOT NULL DEFAULT '',
    "techniques" TEXT NOT NULL DEFAULT '',
    "plating" TEXT NOT NULL DEFAULT '',
    "variants" TEXT NOT NULL DEFAULT '',
    "stepsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRecipeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRecipeImport" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localRecipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRecipeImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityChefProfile_userId_key" ON "CommunityChefProfile"("userId");
CREATE INDEX "CommunityChefProfile_tenantId_idx" ON "CommunityChefProfile"("tenantId");
CREATE UNIQUE INDEX "CommunityChefFollow_chefId_userId_key" ON "CommunityChefFollow"("chefId", "userId");
CREATE INDEX "CommunityChefFollow_userId_idx" ON "CommunityChefFollow"("userId");
CREATE INDEX "CommunityRecipe_publishedAt_idx" ON "CommunityRecipe"("publishedAt");
CREATE INDEX "CommunityRecipe_category_idx" ON "CommunityRecipe"("category");
CREATE INDEX "CommunityRecipe_chefId_idx" ON "CommunityRecipe"("chefId");
CREATE INDEX "CommunityRecipe_featured_idx" ON "CommunityRecipe"("featured");
CREATE INDEX "CommunityRecipe_likeCount_idx" ON "CommunityRecipe"("likeCount");
CREATE INDEX "CommunityRecipe_viewCount_idx" ON "CommunityRecipe"("viewCount");
CREATE INDEX "CommunityRecipe_importCount_idx" ON "CommunityRecipe"("importCount");
CREATE UNIQUE INDEX "CommunityRecipeLike_recipeId_userId_key" ON "CommunityRecipeLike"("recipeId", "userId");
CREATE INDEX "CommunityRecipeComment_recipeId_createdAt_idx" ON "CommunityRecipeComment"("recipeId", "createdAt");
CREATE UNIQUE INDEX "CommunityRecipeTranslation_recipeId_locale_key" ON "CommunityRecipeTranslation"("recipeId", "locale");
CREATE INDEX "CommunityRecipeImport_tenantId_userId_idx" ON "CommunityRecipeImport"("tenantId", "userId");
CREATE UNIQUE INDEX "CommunityRecipeImport_recipeId_tenantId_localRecipeId_key" ON "CommunityRecipeImport"("recipeId", "tenantId", "localRecipeId");

-- AddForeignKey
ALTER TABLE "CommunityChefFollow" ADD CONSTRAINT "CommunityChefFollow_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "CommunityChefProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRecipe" ADD CONSTRAINT "CommunityRecipe_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "CommunityChefProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRecipeIngredient" ADD CONSTRAINT "CommunityRecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CommunityRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRecipeStep" ADD CONSTRAINT "CommunityRecipeStep_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CommunityRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRecipeLike" ADD CONSTRAINT "CommunityRecipeLike_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CommunityRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRecipeComment" ADD CONSTRAINT "CommunityRecipeComment_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CommunityRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRecipeComment" ADD CONSTRAINT "CommunityRecipeComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityRecipeComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRecipeTranslation" ADD CONSTRAINT "CommunityRecipeTranslation_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CommunityRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRecipeImport" ADD CONSTRAINT "CommunityRecipeImport_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CommunityRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
