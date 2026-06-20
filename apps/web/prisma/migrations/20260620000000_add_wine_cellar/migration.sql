-- CreateTable
CREATE TABLE "WineCellarItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "producer" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'rosso',
    "body" TEXT NOT NULL DEFAULT '',
    "grapeVariety" TEXT NOT NULL DEFAULT '',
    "alcoholPct" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "vintageYear" INTEGER,
    "bottlingYear" INTEGER,
    "pairings" TEXT NOT NULL DEFAULT '',
    "purchasePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "showPurchasePrice" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WineCellarItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WineCellarItem_tenantId_color_idx" ON "WineCellarItem"("tenantId", "color");

-- CreateIndex
CREATE INDEX "WineCellarItem_tenantId_country_idx" ON "WineCellarItem"("tenantId", "country");

-- AddForeignKey
ALTER TABLE "WineCellarItem" ADD CONSTRAINT "WineCellarItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
