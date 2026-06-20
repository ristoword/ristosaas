import { NextRequest } from "next/server";
import { ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { wineCellarRepository, type WineCellarCreatePayload } from "@/lib/db/repositories/wine-cellar.repository";

const CANTINA_ROLES = ["owner", "supervisor", "sala", "bar", "cassa", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, CANTINA_ROLES);
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const color = url.searchParams.get("color") ?? undefined;
  const country = url.searchParams.get("country") ?? undefined;
  const search = url.searchParams.get("q") ?? undefined;
  return ok(await wineCellarRepository.list(getTenantId(), { color, country, search }));
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, CANTINA_ROLES);
  if (guard.error) return guard.error;
  const data = await body<WineCellarCreatePayload>(req);
  const item = await wineCellarRepository.create(getTenantId(), data);
  return ok(item, 201);
}
