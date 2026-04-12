import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) return err("User not found", 401);
  return ok(user);
}
