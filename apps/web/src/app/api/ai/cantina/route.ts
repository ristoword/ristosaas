import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiCantinaRepository } from "@/lib/db/repositories/ai-cantina.repository";

const CANTINA_AI_ROLES = ["owner", "supervisor", "sala", "bar", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, CANTINA_AI_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const snapshot = await aiCantinaRepository.snapshot(tenantId);
  return ok(snapshot);
}
