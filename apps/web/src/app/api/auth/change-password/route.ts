import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { changeUserPassword } from "@/lib/auth/users.store";
import { getRequestUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) return err("Not authenticated", 401);

  const { currentPassword, newPassword } = await body<{ currentPassword: string; newPassword: string }>(req);
  if (!currentPassword || !newPassword) return err("Both fields required");
  if (newPassword.length < 6) return err("La nuova password deve avere almeno 6 caratteri.");

  const changed = changeUserPassword(user.id, currentPassword, newPassword);
  if (!changed.ok && changed.reason === "wrong_password") return err("Password attuale errata.");
  if (!changed.ok) return err("User not found", 404);

  return ok({ success: true });
}
