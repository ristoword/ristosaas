import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";

export async function GET(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) return err("Unauthorized", 401);

  const isValid = await authUsersRepository.isSessionVersionValid(user.id, user.sessionVersion ?? 0);
  if (!isValid) return err("Session expired. Please login again.", 401);

  return ok({ valid: true });
}
