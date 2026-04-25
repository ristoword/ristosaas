import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ALL_ROLES = [
  "sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "staff",
  "supervisor", "owner", "super_admin", "hotel_manager", "reception", "housekeeping",
] as const;

/** GET /api/staff/me — returns the StaffMember linked to the current user */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ALL_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const userId = guard.user.id;
  const userEmail = guard.user.email?.toLowerCase() ?? "";
  const userName = guard.user.name?.toLowerCase() ?? "";

  const member = await prisma.staffMember.findFirst({
    where: {
      tenantId,
      OR: [
        { userId },
        { email: { equals: userEmail, mode: "insensitive" } },
        { name: { equals: userName, mode: "insensitive" } },
      ],
    },
    orderBy: [
      { userId: "asc" }, // prefer userId match
    ],
  });

  if (!member) return ok(null);

  return ok({
    id: member.id,
    userId: member.userId,
    name: member.name,
    role: member.role,
    email: member.email,
    phone: member.phone,
    hireDate: member.hireDate.toISOString().slice(0, 10),
    salary: Number(member.salary),
    status: member.status,
    hoursWeek: member.hoursWeek,
    notes: member.notes,
  });
}
