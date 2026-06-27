import { buildVisionPrompt } from "@/lib/ai/vision/prompts";
import { parseVisionResponse } from "@/lib/ai/vision/parser";
import { callOpenAIVision } from "@/lib/ai/vision/provider";
import { extractIntegrations } from "@/lib/ai/vision/extractor";
import { validateVisionAnalysis } from "@/lib/ai/vision/validator";
import type { VisionAnalysisResult, VisionAnalyzeRequest, VisionTaskType } from "@/lib/ai/vision/types";
import { TASK_LABELS } from "@/lib/ai/vision/types";

export async function analyzeVisionImage(params: {
  tenantId: string;
  request: VisionAnalyzeRequest;
  signal?: AbortSignal;
}): Promise<VisionAnalysisResult> {
  const { tenantId, request, signal } = params;
  const locale = request.locale ?? "it";
  const generatedAt = new Date().toISOString();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return fallbackResult(tenantId, request.taskType, generatedAt, "OPENAI_API_KEY non configurata");
  }

  const prompt = buildVisionPrompt(request.taskType, locale, request.hints);

  try {
    const { rawContent, model } = await callOpenAIVision(
      apiKey,
      prompt,
      { image: request.image, mimeType: request.mimeType },
      signal,
    );

    const analysis = parseVisionResponse(request.taskType, rawContent);
    analysis.metadata = { model, taskLabel: TASK_LABELS[request.taskType] };

    const validation = validateVisionAnalysis(analysis);
    const integrations = extractIntegrations(analysis);

    return {
      taskType: request.taskType,
      generatedAt,
      tenantId,
      analysis,
      integrations,
      source: "openai_vision",
      valid: validation.valid,
      validationErrors: validation.errors,
    };
  } catch (e) {
    return fallbackResult(
      tenantId,
      request.taskType,
      generatedAt,
      e instanceof Error ? e.message : "Errore Vision AI",
    );
  }
}

function fallbackResult(
  tenantId: string,
  taskType: VisionTaskType,
  generatedAt: string,
  reason: string,
): VisionAnalysisResult {
  const analysis = {
    taskType,
    confidence: 0,
    confidenceLevel: "low" as const,
    summary: "Analisi Vision non disponibile",
    warnings: [reason, "Utilizzare inserimento manuale come fallback"],
  };

  return {
    taskType,
    generatedAt,
    tenantId,
    analysis,
    integrations: [],
    source: "fallback",
    valid: false,
    validationErrors: [reason],
  };
}

export { TASK_LABELS };
