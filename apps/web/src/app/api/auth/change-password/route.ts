import { NextRequest, NextResponse } from "next/server";
import { err, body, withErrorHandler} from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";
import { issueAuthSession } from "@/lib/auth/session-tracking";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";
import { validatePasswordStrength } from "@/lib/auth/password";

export const POST = withErrorHandler(async (req) => {
  const user = getRequestUser(req);
  if (!user) return err("Not authenticated", 401);

  const { currentPassword, newPassword } = await body<{ currentPassword: string; newPassword: string }>(req);
  if (!currentPassword || !newPassword) return err("Both fields required");
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return err(pwError);

  const changed = await authUsersRepository.changePassword(user.id, currentPassword, newPassword);
  if (!changed.ok && changed.reason === "wrong_password") return err("Password attuale errata.");
  if (!changed.ok) return err("User not found", 404);

  const res = NextResponse.json({ success: true });
  await issueAuthSession(
    req,
    res,
    {
      userId: changed.user.id,
      tenantId: changed.user.tenantId,
      role: changed.user.role,
      username: changed.user.username,
      name: changed.user.name,
      email: changed.user.email,
      sessionVersion: changed.user.sessionVersion,
      mustChangePassword: false,
    },
    { previousJti: user.jti ?? null },
  );
  return res;
});
