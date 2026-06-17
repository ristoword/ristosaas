import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const MAX_BODY_SIZE = 1_048_576; // 1 MB

export async function body<T>(req: Request): Promise<T> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    throw new BodyParseError("Request body too large");
  }
  try {
    return (await req.json()) as T;
  } catch {
    throw new BodyParseError("Invalid JSON");
  }
}

export class BodyParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BodyParseError";
  }
}

/**
 * Fire-and-forget a promise with error logging instead of silent swallowing.
 * Use for non-critical side-effects (notifications, session touch, etc.).
 */
export function fireAndForget(promise: Promise<unknown>, context: string) {
  void promise.catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("fire_and_forget_failed", { context, error: message });
  });
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
      if (error instanceof BodyParseError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
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
