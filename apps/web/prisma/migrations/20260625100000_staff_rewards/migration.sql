-- CreateTable
CREATE TABLE "StaffReward" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" DECIMAL(10,2),
    "period" TEXT NOT NULL,
    "awardedBy" TEXT NOT NULL,
    "awardedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffReward_tenantId_staffName_createdAt_idx" ON "StaffReward"("tenantId", "staffName", "createdAt");

-- AddForeignKey
ALTER TABLE "StaffReward" ADD CONSTRAINT "StaffReward_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
