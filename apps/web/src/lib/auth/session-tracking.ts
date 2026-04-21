import type { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/session";
import { userSessionsRepository } from "@/lib/db/repositories/user-sessions.repository";
import { logger } from "@/lib/observability/logger";
import { clientIpFromRequest } from "@/lib/security/rate-limit";

type IssuePayload = {
  userId: string;
  tenantId?: string | null;
  role: string;
  username: string;
  name: string;
  email: string;
  sessionVersion?: number;
  mustChangePassword?: boolean;
};

/**
 * Emette cookie di sessione + refresh e traccia entrambe le sessioni
 * nella tabella `UserSession` per listing/revoca. Il tracking e'
 * best-effort: se l'inserimento DB fallisce (es. migration non ancora
 * applicata in ambiente di sviluppo) il login/refresh resta comunque
 * valido grazie al check sessionVersion + scadenza JWT.
 */
export async function issueAuthSession(
  req: NextRequest,
  res: NextResponse,
  payload: IssuePayload,
  opts?: { previousJti?: string | null },
) {
  const cookieResult = setAuthCookies(res, {
    userId: payload.userId,
    tenantId: payload.tenantId ?? undefined,
    role: payload.role,
    username: payload.username,
    name: payload.name,
    email: payload.email,
    sessionVersion: payload.sessionVersion,
    mustChangePassword: payload.mustChangePassword,
  });

  const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;
  const ipAddress = clientIpFromRequest(req) || null;

  try {
    await Promise.all([
      userSessionsRepository.create({
        userId: payload.userId,
        tenantId: payload.tenantId ?? null,
        jti: cookieResult.accessJti,
        tokenType: "access",
        userAgent,
        ipAddress,
        expiresAt: cookieResult.accessExpiresAt,
      }),
      userSessionsRepository.create({
        userId: payload.userId,
        tenantId: payload.tenantId ?? null,
        jti: cookieResult.refreshJti,
        tokenType: "refresh",
        userAgent,
        ipAddress,
        expiresAt: cookieResult.refreshExpiresAt,
      }),
    ]);
  } catch (error) {
    logger.warn("session_tracking_failed", {
      userId: payload.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (opts?.previousJti) {
    try {
      await userSessionsRepository.revoke(opts.previousJti, payload.userId);
    } catch (error) {
      logger.warn("session_tracking_previous_revoke_failed", {
        userId: payload.userId,
        jti: opts.previousJti,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return cookieResult;
}
