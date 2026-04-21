import { NextRequest } from "next/server";
import { ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { haccpRepository, type HaccpEntryType } from "@/lib/db/repositories/haccp.repository";

const HACCP_ROLES = ["owner", "supervisor", "cucina", "pizzeria", "bar", "magazzino", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HACCP_ROLES);
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(500, Number.parseInt(limitRaw, 10) || 0)) : undefined;
  return ok(
    await haccpRepository.list(getTenantId(), {
      type: typeParam as HaccpEntryType | undefined,
      from,
      to,
      limit,
    }),
  );
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, HACCP_ROLES);
  if (guard.error) return guard.error;
  const data = await body<{
    type?: HaccpEntryType;
    recordedAt?: string;
    location?: string;
    tempC?: number | null;
    operator?: string;
    notes?: string;
  }>(req);
  const item = await haccpRepository.create(getTenantId(), data);
  return ok(item, 201);
}
