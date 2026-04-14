import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";

const ADMIN_ROLES = ["super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  const rows = await adminRepository.tenants();
  return ok(
    rows.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      users: tenant.users.length,
      created: tenant.createdAt.toISOString().slice(0, 10),
    })),
  );
}
