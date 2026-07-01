import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  complianceRepository,
  type ComplianceConfig,
} from "@/lib/db/repositories/compliance.repository";

const ROLES = ["owner", "super_admin"] as const;
const SECRET_MASK = "••••••••";

function maskSecrets(config: ComplianceConfig): ComplianceConfig {
  return {
    ...config,
    alloggiatiPassword: config.alloggiatiPassword ? SECRET_MASK : "",
    alloggiatiWsKey: config.alloggiatiWsKey ? SECRET_MASK : "",
    lockBridgeApiKey: config.lockBridgeApiKey ? SECRET_MASK : "",
  };
}

function mergeSecrets(
  current: ComplianceConfig,
  incoming: Partial<ComplianceConfig>,
): Partial<ComplianceConfig> {
  const merged = { ...incoming };
  if (merged.alloggiatiPassword === SECRET_MASK) delete merged.alloggiatiPassword;
  if (merged.alloggiatiWsKey === SECRET_MASK) delete merged.alloggiatiWsKey;
  if (merged.lockBridgeApiKey === SECRET_MASK) delete merged.lockBridgeApiKey;
  return merged;
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const config = await complianceRepository.get(getTenantId());
  return ok(maskSecrets(config));
}

export async function PUT(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const tenantId = getTenantId();
  const current = await complianceRepository.get(tenantId);
  const data = await body<Partial<ComplianceConfig>>(req);
  const updated = await complianceRepository.upsert(tenantId, mergeSecrets(current, data));
  return ok(maskSecrets(updated));
}
