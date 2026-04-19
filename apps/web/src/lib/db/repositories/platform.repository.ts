import { prisma } from "@/lib/db/prisma";

const PLATFORM_ID = "default";

let maintenanceCache: { value: boolean; expiresAt: number } = { value: false, expiresAt: 0 };
const tenantBlockCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_MS = 4000;

function nowMs() {
  return Date.now();
}

export function invalidateMaintenanceCache() {
  maintenanceCache = { value: false, expiresAt: 0 };
}

export function invalidateTenantAccessCache(tenantId?: string) {
  if (tenantId) tenantBlockCache.delete(tenantId);
  else tenantBlockCache.clear();
}

async function ensurePlatformRow() {
  await prisma.platformConfig.upsert({
    where: { id: PLATFORM_ID },
    create: { id: PLATFORM_ID, maintenanceMode: false },
    update: {},
  });
}

export async function isMaintenanceMode(): Promise<boolean> {
  const t = nowMs();
  if (t < maintenanceCache.expiresAt) return maintenanceCache.value;
  await ensurePlatformRow();
  const row = await prisma.platformConfig.findUnique({ where: { id: PLATFORM_ID } });
  const value = row?.maintenanceMode ?? false;
  maintenanceCache = { value, expiresAt: t + CACHE_MS };
  return value;
}

export async function getPlatformConfig() {
  await ensurePlatformRow();
  const row = await prisma.platformConfig.findUniqueOrThrow({ where: { id: PLATFORM_ID } });
  return {
    maintenanceMode: row.maintenanceMode,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function setMaintenanceMode(maintenanceMode: boolean) {
  await ensurePlatformRow();
  await prisma.platformConfig.update({
    where: { id: PLATFORM_ID },
    data: { maintenanceMode },
  });
  invalidateMaintenanceCache();
  return getPlatformConfig();
}

export async function isTenantBlocked(tenantId: string | null | undefined): Promise<boolean> {
  if (!tenantId) return false;
  const t = nowMs();
  const cached = tenantBlockCache.get(tenantId);
  if (cached && t < cached.expiresAt) return cached.value;
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { accessStatus: true },
  });
  const value = row?.accessStatus === "blocked";
  tenantBlockCache.set(tenantId, { value, expiresAt: t + CACHE_MS });
  return value;
}
