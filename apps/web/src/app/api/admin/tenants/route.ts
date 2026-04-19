import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";

const ADMIN_ROLES = ["super_admin"] as const;

function tenantDbMigrationHint(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2022") {
      return "Il database non ha le colonne/tabelle previste dal codice (es. accessStatus o PlatformConfig). Esegui sul PostgreSQL lo script apps/web/prisma/migrations_add_platform_and_tenant_access.sql, poi riavvia.";
    }
  }
  const msg = error instanceof Error ? error.message : "";
  if (/accessStatus|PlatformConfig|TenantAccessStatus|does not exist|Unknown arg|column.*does not exist/i.test(msg)) {
    return "Aggiorna il database con lo script prisma/migrations_add_platform_and_tenant_access.sql (manca una migrazione rispetto al codice attuale).";
  }
  return null;
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  try {
    const rows = await adminRepository.tenants();
    return ok(
      rows.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        users: tenant.users.length,
        created: tenant.createdAt.toISOString().slice(0, 10),
        status: tenant.accessStatus === "blocked" ? "blocked" : "active",
      })),
    );
  } catch (error) {
    console.error("[admin/tenants GET]", error);
    const hint = tenantDbMigrationHint(error);
    const dev = process.env.NODE_ENV === "development";
    const detail = error instanceof Error ? error.message : "";
    if (hint) return err(dev ? `${hint} (${detail})` : hint, 500);
    return err("Impossibile caricare l'elenco tenant.", 500);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  const payload = await body<{
    name: string;
    slug: string;
    plan: "restaurant_only" | "hotel_only" | "all_included";
    billingCycle?: "monthly" | "annual";
    seats?: number;
    /** Whole months until license expiry (e.g. 1, 6, 12). Default 12. Max 120. */
    licenseDurationMonths?: number;
    adminUser: {
      username: string;
      email: string;
      name: string;
      password: string;
      role?: string;
    };
  }>(req);

  if (!payload?.name?.trim()) return err("Tenant name required");
  if (!payload?.slug?.trim()) return err("Tenant slug required");
  if (!payload?.adminUser?.username?.trim()) return err("Admin username required");
  if (!payload?.adminUser?.email?.trim()) return err("Admin email required");
  if (!payload?.adminUser?.name?.trim()) return err("Admin name required");
  if (!payload?.adminUser?.password || payload.adminUser.password.length < 8) return err("Admin password min 8 chars");

  const normalizedSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-");
  const billingCycle = payload.billingCycle === "annual" ? "annual" : "monthly";
  const seats = Number.isFinite(Number(payload.seats)) && Number(payload.seats) > 0 ? Math.floor(Number(payload.seats)) : 25;
  let licenseDurationMonths: number | undefined;
  if (payload.licenseDurationMonths != null) {
    const m = Math.floor(Number(payload.licenseDurationMonths));
    if (!Number.isFinite(m) || m < 1 || m > 120) return err("licenseDurationMonths must be between 1 and 120");
    licenseDurationMonths = m;
  }

  try {
    const created = await adminRepository.createTenantWithLicense({
      name: payload.name.trim(),
      slug: normalizedSlug,
      plan: payload.plan,
      billingCycle,
      seats,
      licenseDurationMonths,
      adminUser: {
        username: payload.adminUser.username.trim(),
        email: payload.adminUser.email.trim().toLowerCase(),
        name: payload.adminUser.name.trim(),
        password: payload.adminUser.password,
        role: payload.adminUser.role,
      },
    });
    return ok(created, 201);
  } catch (error) {
    console.error("[admin/tenants POST]", error);
    const message = error instanceof Error ? error.message : "";
    const unique =
      message.toLowerCase().includes("unique") ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002");
    if (unique) return err("Slug tenant, username o email già in uso.", 409);
    const hint = tenantDbMigrationHint(error);
    const dev = process.env.NODE_ENV === "development";
    if (hint) return err(dev ? `${hint} (${message})` : hint, 500);
    if (message && message.length > 0 && message.length < 280 && dev) return err(`Impossibile creare il tenant: ${message}`, 500);
    return err("Impossibile creare il tenant. Controlla i log del server o applica le migrazioni SQL se mancanti.", 500);
  }
}
