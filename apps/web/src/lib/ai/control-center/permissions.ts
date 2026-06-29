import type { PublicUser } from "@/lib/auth/types";
import type { ControlCenterPermissions } from "@/lib/ai/control-center/types";

export function resolveControlCenterPermissions(user: Pick<PublicUser, "role">): ControlCenterPermissions {
  const isSuperAdmin = user.role === "super_admin";
  const isPartner = user.role === "partner" || Boolean((user as PublicUser & { partnerCode?: string }).partnerCode);
  const readOnly = isPartner && !isSuperAdmin;

  return {
    readOnly,
    canMutateAgents: isSuperAdmin,
    canMutatePrompts: isSuperAdmin,
    canMutateKnowledge: isSuperAdmin,
    canMutateEmbeddings: isSuperAdmin,
    canInstallMarketplace: isSuperAdmin,
  };
}
