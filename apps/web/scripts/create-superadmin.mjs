import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] != null) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

// Same hashing format used by apps/web src/lib/auth/password.ts
// Format: `scrypt$<saltHex>$<hashHex>`
function hashPassword(plainTextPassword) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainTextPassword, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function generateStrongPassword() {
  // 16 chars: upper, lower, digit, symbol mix
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digit = "23456789";
  const symbol = "!@#$%&*+-=?";
  const all = upper + lower + digit + symbol;
  const rand = (set) => set[randomBytes(1)[0] % set.length];
  const must = [rand(upper), rand(lower), rand(digit), rand(symbol)];
  while (must.length < 16) must.push(rand(all));
  for (let i = must.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [must[i], must[j]] = [must[j], must[i]];
  }
  return must.join("");
}

const prisma = new PrismaClient({ log: ["error"] });

const TARGET_EMAIL = "basilepaolo@me.com";
const TARGET_USERNAME = "pbasile.superadmin";
const TARGET_NAME = "Paolo Basile";
const TARGET_ROLE = "super_admin";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

  // Super_admin must still live under a tenant row in the current schema.
  // Attach to the first existing tenant (we don't want to create an extra one).
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, slug: true } });
  if (!tenant) throw new Error("No tenant found. Seed at least one tenant before creating a super_admin.");

  const tempPassword = generateStrongPassword();
  const passwordHash = hashPassword(tempPassword);

  const existingByEmail = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  const existingByUsername = await prisma.user.findUnique({ where: { username: TARGET_USERNAME } });

  let userId;
  let mode;

  if (existingByEmail) {
    // Promote / reset existing user with this email.
    mode = "updated_existing_email";
    const updated = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        role: TARGET_ROLE,
        name: TARGET_NAME,
        passwordHash,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    userId = updated.id;
  } else if (existingByUsername) {
    throw new Error(
      `Username '${TARGET_USERNAME}' già in uso da un altro utente con email diversa. Cambia TARGET_USERNAME nello script.`,
    );
  } else {
    mode = "created_new";
    const created = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        username: TARGET_USERNAME,
        name: TARGET_NAME,
        email: TARGET_EMAIL,
        role: TARGET_ROLE,
        passwordHash,
        mustChangePassword: true,
      },
    });
    userId = created.id;
  }

  // Sanity: scrypt verify against format `scrypt$<salt>$<hash>`.
  const parts = passwordHash.split("$");
  const salt = parts[1];
  const hash = parts[2];
  const verify = scryptSync(tempPassword, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  const verifyOk = hashBuf.length === verify.length && timingSafeEqual(hashBuf, verify);

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode,
        userId,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        email: TARGET_EMAIL,
        username: TARGET_USERNAME,
        role: TARGET_ROLE,
        mustChangePassword: true,
        temporaryPassword: tempPassword,
        verifyOk,
        note: "Password mostrata una sola volta. Copiala ora. Verrà chiesta di cambiarla al primo login.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
