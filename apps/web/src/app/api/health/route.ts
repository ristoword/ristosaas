import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/logger";
import { getOrCreateRequestId } from "@/lib/observability/request-context";
import { sendOperationalAlert } from "@/lib/observability/alerts";
import { captureException } from "@/lib/observability/sentry-lite";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    await prisma.$queryRaw`SELECT 1`;
    const res = NextResponse.json(
      {
        status: "ok",
        db: "up",
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
    res.headers.set("x-request-id", requestId);
    return res;
  } catch {
    logger.error("healthcheck_failed", { requestId });
    void sendOperationalAlert({
      key: "health_db_down",
      title: "Database healthcheck failed",
      message: "API /api/health returned degraded because DB check failed.",
      severity: "critical",
      metadata: { requestId },
    });
    void captureException({
      source: "server",
      message: "Database healthcheck failed",
      requestId,
      tags: { endpoint: "/api/health" },
    });
    const res = NextResponse.json(
      {
        status: "degraded",
        db: "down",
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
    res.headers.set("x-request-id", requestId);
    return res;
  }
}
