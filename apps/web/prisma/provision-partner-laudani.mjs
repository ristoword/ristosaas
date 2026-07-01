/**
 * Provisioning: socio partner Costantino Laudani collegato all'account Baia Verde.
 * Usage:
 *   DATABASE_URL=... node prisma/provision-partner-laudani.mjs
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
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

const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.resolve(currentDir, "../.env"));
loadEnvFile(path.resolve(currentDir, "../.env.local"));

const prisma = new PrismaClient();

const PARTNER_CODE = "laudani";
const BAIA_VERDE_SLUG = "baia-verde";
const OWNER_USERNAME = "baiaverde_admin";
const OWNER_EMAIL = "costantinolaudani1@gmail.com";

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: BAIA_VERDE_SLUG },
        { name: { contains: "Baia Verde", mode: "insensitive" } },
      ],
    },
  });

  if (!tenant) {
    throw new Error(`Tenant "${BAIA_VERDE_SLUG}" non trovato.`);
  }

  const partner = await prisma.partner.upsert({
    where: { code: PARTNER_CODE },
    update: {
      name: "Costantino Laudani",
      country: "Italia",
      email: OWNER_EMAIL,
      notes: "Socio partner — Baia Verde",
      partnerKind: "socio",
      commissionEuros: 0,
      allInclusiveCommission: 0,
      commissionPct: 0,
      commissionType: "fixed",
      active: true,
    },
    create: {
      code: PARTNER_CODE,
      name: "Costantino Laudani",
      country: "Italia",
      email: OWNER_EMAIL,
      phone: "",
      notes: "Socio partner — Baia Verde",
      partnerKind: "socio",
      commissionType: "fixed",
      licensePrice: 79,
      commissionEuros: 0,
      commissionPct: 0,
      allInclusivePrice: 279,
      allInclusiveCommission: 0,
      allInclusivePct: null,
      active: true,
    },
  });

  const owner = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { username: OWNER_USERNAME },
        { email: OWNER_EMAIL },
        { name: { contains: "Laudani", mode: "insensitive" } },
      ],
    },
  });

  if (!owner) {
    throw new Error(`Utente owner Baia Verde non trovato (atteso ${OWNER_USERNAME} / ${OWNER_EMAIL}).`);
  }

  const linked = await prisma.user.update({
    where: { id: owner.id },
    data: { partnerCode: PARTNER_CODE },
  });

  const duplicate = await prisma.user.findUnique({ where: { username: "claudani" } });
  if (duplicate && duplicate.id !== owner.id) {
    await prisma.user.delete({ where: { id: duplicate.id } });
    console.log("✔ Rimosso account duplicato claudani");
  }

  console.log("✔ Partner:", partner.code, partner.name, partner.email);
  console.log("✔ Account collegato:", linked.username, linked.email, `(tenant ${tenant.name})`);
  console.log("");
  console.log("Accesso dashboard partner (/partner) con le credenziali owner Baia Verde.");
  console.log("  Username:", linked.username);
  console.log("  Email:", linked.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
