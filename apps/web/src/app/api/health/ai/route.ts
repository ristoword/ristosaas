import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cheap runtime check for OpenAI env. DOES NOT call OpenAI.
 *
 * Reports whether:
 *   - OPENAI_API_KEY is set and plausibly shaped ("sk-" / "sk-proj-").
 *   - OPENAI_MODEL, OPENAI_MAX_TOKENS, OPENAI_TEMPERATURE are present.
 *
 * Use this from monitoring / dev-access to catch missing or malformed env
 * without burning OpenAI quota.
 */
export async function GET() {
  const rawKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const maxTokens = Number(process.env.OPENAI_MAX_TOKENS ?? 700);
  const temperature = Number(process.env.OPENAI_TEMPERATURE ?? 0.4);

  let status: "ok" | "missing" | "malformed" = "missing";
  if (rawKey.length > 0) {
    const isPlaceholder = /^sk-\.\.\.?$/i.test(rawKey) || rawKey.includes("replace");
    const hasProperPrefix = /^sk-(proj-)?[A-Za-z0-9_\-]{20,}$/.test(rawKey);
    if (isPlaceholder || !hasProperPrefix) status = "malformed";
    else status = "ok";
  }

  const masked =
    rawKey.length > 12
      ? `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}`
      : rawKey.length > 0
        ? "***"
        : null;

  return NextResponse.json(
    {
      status,
      keyMasked: masked,
      model,
      maxTokens: Number.isFinite(maxTokens) ? maxTokens : null,
      temperature: Number.isFinite(temperature) ? temperature : null,
      timestamp: new Date().toISOString(),
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
