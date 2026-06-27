import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { verifyInternalSignature } from "@/lib/security/internal-signature";
import { automationScheduler } from "@/lib/ai/automation/scheduler";

export async function POST(req: NextRequest) {
  const sharedSecret = process.env.AI_SCHEDULER_TOKEN?.trim();
  if (!sharedSecret) return err("AI_SCHEDULER_TOKEN non configurato", 500);

  const signature = req.headers.get("x-scheduler-signature") || "";
  const timestampHeader = req.headers.get("x-scheduler-ts") || "";
  const timestampMs = Number(timestampHeader);
  const isValid = verifyInternalSignature({
    secret: sharedSecret,
    timestampMs,
    providedSignature: signature,
    method: req.method,
    pathname: req.nextUrl.pathname,
  });
  if (!isValid) return err("Forbidden", 403);

  const result = await automationScheduler.runForAllTenants();
  return ok(result);
}
