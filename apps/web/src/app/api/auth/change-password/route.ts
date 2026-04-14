import { NextRequest, NextResponse } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";

export async function POST(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) return err("Not authenticated", 401);

  const { currentPassword, newPassword } = await body<{ currentPassword: string; newPassword: string }>(req);
  if (!currentPassword || !newPassword) return err("Both fields required");
  if (newPassword.length < 6) return err("La nuova password deve avere almeno 6 caratteri.");

  const changed = await authUsersRepository.changePassword(user.id, currentPassword, newPassword);
  if (!changed.ok && changed.reason === "wrong_password") return err("Password attuale errata.");
  if (!changed.ok) return err("User not found", 404);

  const res = NextResponse.json({ success: true });
  setSessionCookie(res, {
    userId: changed.user.id,
    role: changed.user.role,
    username: changed.user.username,
    name: changed.user.name,
    email: changed.user.email,
    sessionVersion: changed.user.sessionVersion,
    mustChangePassword: false,
  });
  return res;
}
