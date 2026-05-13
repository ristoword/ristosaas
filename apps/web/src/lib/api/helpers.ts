import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function body<T>(req: Request): Promise<T> {
  return req.json() as Promise<T>;
}

type RouteContext = { params?: Promise<Record<string, string>> };
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>;

/**
 * Wraps an API route handler with try/catch, logging, and consistent error responses.
 * Usage: `export const POST = withErrorHandler(async (req) => { ... });`
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const pathname = req.nextUrl.pathname;
      const method = req.method;
      const message = error instanceof Error ? error.message : String(error);
      logger.error("api_unhandled_error", { method, pathname, error: message });
      return NextResponse.json(
        { error: "Errore interno del server." },
        { status: 500 },
      );
    }
  };
}
