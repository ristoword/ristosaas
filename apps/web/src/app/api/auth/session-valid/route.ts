import { NextRequest } from "next/server";
import { err, ok, fireAndForget, withErrorHandler} from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";
import { userSessionsRepository } from "@/lib/db/repositories/user-sessions.repository";

export const GET = withErrorHandler(async (req) => {
  const user = getRequestUser(req);
  if (!user) return err("Unauthorized", 401);

  const isValid = await authUsersRepository.isSessionVersionValid(user.id, user.sessionVersion ?? 0);
  if (!isValid) return err("Session expired. Please login again.", 401);

  if (user.jti) {
    const active = await userSessionsRepository.isActive(user.jti).catch(() => true);
    if (!active) return err("Session revoked. Please login again.", 401);
    fireAndForget(userSessionsRepository.touch(user.jti), "session:touch");
  }

  return ok({ valid: true });
});
