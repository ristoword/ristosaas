import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

const ROLES = ["supervisor", "owner", "super_admin"] as const;

// Ruoli di accesso che un owner può assegnare ai propri utenti
const ASSIGNABLE_ROLES = [
  "sala", "cucina", "bar", "pizzeria", "cassa",
  "magazzino", "supervisor", "staff",
  "reception", "hotel_manager", "housekeeping",
] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

/** GET /api/users — lista utenti del tenant corrente */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();

  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, username: true, role: true, email: true,
      mustChangePassword: true, failedLoginAttempts: true, lockedUntil: true,
    },
  });

  return ok(users.map((u) => ({
    ...u,
    isLocked: u.lockedUntil ? new Date(u.lockedUntil) > new Date() : false,
  })));
}

/** POST /api/users — crea un nuovo utente per il tenant corrente (solo owner/super_admin) */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ["owner", "super_admin"]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();

  const data = await body<{
    username?: string;
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  }>(req);

  const username = data.username?.trim().toLowerCase();
  const name = data.name?.trim();
  const email = data.email?.trim().toLowerCase();
  const password = data.password;
  const role = data.role?.trim();

  if (!username || username.length < 3) return err("Username obbligatorio (min 3 caratteri)");
  if (!/^[a-z0-9_.-]+$/.test(username)) return err("Username: solo lettere minuscole, numeri, punti, trattini, underscore");
  if (!name || name.length < 2) return err("Nome obbligatorio");
  if (!password || password.length < 6) return err("Password obbligatoria (min 6 caratteri)");
  if (!role || !ASSIGNABLE_ROLES.includes(role as AssignableRole)) {
    return err(`Ruolo non valido. Valori ammessi: ${ASSIGNABLE_ROLES.join(", ")}`);
  }

  // Verifica limite seats licenza
  const license = await prisma.tenantLicense.findUnique({ where: { tenantId } });
  if (license && license.usedSeats >= license.seats) {
    return err(`Limite utenti raggiunto (${license.seats} seats). Contatta il supporto per aumentare.`, 402);
  }

  try {
    // Se email non fornita genero un placeholder locale non reale
    const resolvedEmail = email || `${username}@staff.local`;

    const user = await prisma.user.create({
      data: {
        tenantId,
        username,
        name,
        email: resolvedEmail,
        role,
        passwordHash: hashPassword(password),
        mustChangePassword: true,
        failedLoginAttempts: 0,
      },
      select: { id: true, username: true, name: true, email: true, role: true, mustChangePassword: true },
    });

    // Aggiorna usedSeats
    if (license) {
      await prisma.tenantLicense.update({
        where: { tenantId },
        data: { usedSeats: { increment: 1 } },
      });
    }

    return ok(user, 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return err("Username o email già in uso da un altro account.", 409);
    }
    throw e;
  }
}

/** DELETE /api/users?id=... — elimina utente del tenant (solo owner/super_admin) */
export async function DELETE(req: NextRequest) {
  const guard = await requireApiUser(req, ["owner", "super_admin"]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const userId = req.nextUrl.searchParams.get("id");
  if (!userId) return err("id required");

  // Non può eliminare se stesso
  if (guard.user?.id === userId) return err("Non puoi eliminare il tuo stesso account", 400);

  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) return err("Utente non trovato", 404);

  // Non può eliminare altri owner o super_admin
  if (user.role === "owner" || user.role === "super_admin") {
    return err("Non puoi eliminare un account owner o super_admin", 403);
  }

  await prisma.user.delete({ where: { id: userId } });

  // Aggiorna usedSeats
  await prisma.tenantLicense.updateMany({
    where: { tenantId },
    data: { usedSeats: { decrement: 1 } },
  });

  return ok({ deleted: true });
}
