import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const ONLINE_THRESHOLD_MINUTES = 15;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;

  try {
    const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MINUTES * 60_000);

    const sessions = await prisma.userSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        lastSeenAt: { gte: threshold },
      },
      select: {
        id: true,
        userId: true,
        tenantId: true,
        ipAddress: true,
        userAgent: true,
        lastSeenAt: true,
        issuedAt: true,
        user: {
          select: {
            username: true,
            name: true,
            role: true,
            tenant: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { lastSeenAt: "desc" },
    });

    const uniqueUsers = new Map<string, typeof sessions[number]>();
    for (const s of sessions) {
      if (!uniqueUsers.has(s.userId)) uniqueUsers.set(s.userId, s);
    }

    const onlineUsers = [...uniqueUsers.values()].map((s) => ({
      sessionId: s.id,
      userId: s.userId,
      username: s.user.username,
      name: s.user.name,
      role: s.user.role,
      tenantId: s.tenantId,
      tenantName: s.user.tenant.name,
      ipAddress: s.ipAddress ?? "—",
      userAgent: parseUserAgent(s.userAgent),
      lastSeenAt: s.lastSeenAt.toISOString(),
      issuedAt: s.issuedAt.toISOString(),
    }));

    const tenantSet = new Set(onlineUsers.map((u) => u.tenantId).filter(Boolean));

    return ok({
      onlineUsers,
      summary: {
        totalOnline: onlineUsers.length,
        tenantsOnline: tenantSet.size,
        activeSessions: sessions.length,
        thresholdMinutes: ONLINE_THRESHOLD_MINUTES,
      },
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/online GET]", error);
    return err("Impossibile caricare sessioni attive.", 500);
  }
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Sconosciuto";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("CrOS")) return "ChromeOS";
  return ua.length > 40 ? ua.substring(0, 40) + "…" : ua;
}
