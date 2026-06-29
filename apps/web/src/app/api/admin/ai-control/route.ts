import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { buildAiEnterpriseControlCenter } from "@/lib/ai/control-center/service";

export async function GET(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId") ?? undefined;
  const payload = await buildAiEnterpriseControlCenter(guard.user!, { tenantId, embeddingSearch: url.searchParams.get("q") ?? undefined });
  return ok(payload);
}
