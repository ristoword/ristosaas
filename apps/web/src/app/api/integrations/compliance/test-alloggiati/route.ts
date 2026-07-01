import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { complianceRepository } from "@/lib/db/repositories/compliance.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { alloggiatiTestConnection } from "@/lib/integrations/alloggiati-web";

const ROLES = ["owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const config = await complianceRepository.get(getTenantId());
  if (!config.alloggiatiUsername || !config.alloggiatiPassword || !config.alloggiatiWsKey) {
    return err("Compila username, password e WsKey Alloggiati Web.", 400);
  }
  try {
    const result = await alloggiatiTestConnection({
      username: config.alloggiatiUsername,
      password: config.alloggiatiPassword,
      wsKey: config.alloggiatiWsKey,
      apartmentId: config.alloggiatiApartmentId,
    });
    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(message, 502);
  }
}
