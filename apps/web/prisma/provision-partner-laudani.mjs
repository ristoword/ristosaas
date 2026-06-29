/**
 * Provisioning one-shot: socio partner Costantino Laudani + credenziali dashboard partner.
 * Usage:
 *   SEED_PARTNER_LAUDANI_PASSWORD='...' DATABASE_URL=... node prisma/provision-partner-laudani.mjs
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
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
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "tenant_demo";
const PASSWORD = process.env.SEED_PARTNER_LAUDANI_PASSWORD || "LaudaniPartner2026!";

function hashPassword(plainTextPassword) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainTextPassword, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function main() {
  if (PASSWORD.length < 12) {
    throw new Error("SEED_PARTNER_LAUDANI_PASSWORD deve avere almeno 12 caratteri.");
  }

  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: "RistoSimply Demo",
      slug: TENANT_ID,
      plan: "all_included",
    },
  });

  const partner = await prisma.partner.upsert({
    where: { code: PARTNER_CODE },
    update: {
      name: "Costantino Laudani",
      country: "Italia",
      email: "costantino.laudani@ristosimply.com",
      notes: "Socio partner",
      active: true,
    },
    create: {
      code: PARTNER_CODE,
      name: "Costantino Laudani",
      country: "Italia",
      email: "costantino.laudani@ristosimply.com",
      phone: "",
      notes: "Socio partner",
      commissionType: "fixed",
      licensePrice: 79,
      commissionEuros: 29,
      commissionPct: 0,
      allInclusivePrice: 279,
      allInclusiveCommission: 59,
      allInclusivePct: null,
      active: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { username: "claudani" },
    update: {
      name: "Costantino Laudani",
      email: "costantino.laudani@ristosimply.com",
      role: "partner",
      partnerCode: PARTNER_CODE,
      tenantId: TENANT_ID,
      passwordHash: hashPassword(PASSWORD),
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      id: "usr_partner_laudani",
      tenantId: TENANT_ID,
      username: "claudani",
      name: "Costantino Laudani",
      email: "costantino.laudani@ristosimply.com",
      role: "partner",
      partnerCode: PARTNER_CODE,
      passwordHash: hashPassword(PASSWORD),
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  console.log("✔ Partner creato:", partner.code, partner.name);
  console.log("✔ Utente partner:", user.username, user.email);
  console.log("");
  console.log("Credenziali accesso dashboard partner (/partner):");
  console.log("  Username:", user.username);
  console.log("  Password:", PASSWORD);
  console.log("  (cambio password obbligatorio al primo accesso)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
