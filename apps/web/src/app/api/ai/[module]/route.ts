import { NextRequest } from "next/server";
import { handleModuleAiGet, handleModuleAiPost } from "@/lib/ai/handle-module-ai-route";

type RouteContext = { params: Promise<{ module: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { module: moduleSlug } = await context.params;
  return handleModuleAiGet(req, moduleSlug);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { module: moduleSlug } = await context.params;
  return handleModuleAiPost(req, moduleSlug);
}
