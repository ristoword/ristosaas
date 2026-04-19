/**
 * Cerca e (con --execute) rimuove tenant + dati collegati per struttura "celeste"
 * e l'utente con email giuseppeceleste@alice.it se ancora presente.
 *
 * Uso:
 *   node scripts/cleanup-celeste-targets.mjs           # dry-run, solo report
 *   node scripts/cleanup-celeste-targets.mjs --execute # elimina davvero
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIdx = line.indexOf("=");
    if (separatorIdx === -1) continue;
    const key = line.slice(0, separatorIdx).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(separatorIdx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const cwd = resolve(process.cwd());
loadEnvFile(resolve(cwd, ".env.local"));
loadEnvFile(resolve(cwd, ".env"));

const prisma = new PrismaClient({ log: ["error"] });
const execute = process.argv.includes("--execute");

const TARGET_EMAIL = "giuseppeceleste@alice.it";

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { name: { contains: "celeste", mode: "insensitive" } },
        { slug: { contains: "celeste", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      accessStatus: true,
      users: { select: { id: true, username: true, email: true } },
      license: { select: { id: true, licenseKey: true, status: true, expiresAt: true } },
    },
  });

  const usersByEmail = await prisma.user.findMany({
    where: { email: { equals: TARGET_EMAIL, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      email: true,
      tenantId: true,
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        mode: execute ? "EXECUTE" : "DRY_RUN",
        tenantsFound: tenants.length,
        tenants: tenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          accessStatus: t.accessStatus,
          users: t.users,
          license: t.license,
        })),
        usersWithTargetEmail: usersByEmail.length,
        usersWithTargetEmailRows: usersByEmail.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          tenantSlug: u.tenant.slug,
          tenantName: u.tenant.name,
        })),
      },
      null,
      2,
    ),
  );

  if (!execute) {
    console.log("\nNessuna modifica (dry-run). Rilancia con: node scripts/cleanup-celeste-targets.mjs --execute\n");
    return;
  }

  const tenantIds = new Set(tenants.map((t) => t.id));

  for (const t of tenants) {
    await prisma.tenant.delete({ where: { id: t.id } });
    console.log(`Eliminato tenant: ${t.slug} (${t.id})`);
  }

  const remaining = await prisma.user.findMany({
    where: { email: { equals: TARGET_EMAIL, mode: "insensitive" } },
    select: { id: true, tenantId: true },
  });
  for (const u of remaining) {
    if (!tenantIds.has(u.tenantId)) {
      await prisma.user.delete({ where: { id: u.id } });
      console.log(`Eliminato utente orfano email target: ${u.id}`);
    }
  }

  console.log("\nPulizia completata.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
