import type { VisionRawAnalysis, VisionTaskType } from "@/lib/ai/vision/types";
import { VISION_TASK_TYPES } from "@/lib/ai/vision/types";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function err(errors: string[], message: string) {
  errors.push(message);
}

export function isVisionTaskType(value: string): value is VisionTaskType {
  return (VISION_TASK_TYPES as readonly string[]).includes(value);
}

export function validateVisionAnalysis(analysis: VisionRawAnalysis): ValidationResult {
  const errors: string[] = [];

  if (!isVisionTaskType(analysis.taskType)) {
    err(errors, "taskType non valido");
  }

  if (analysis.confidence < 0 || analysis.confidence > 1) {
    err(errors, "confidence fuori range 0-1");
  }

  if (!analysis.summary.trim()) {
    err(errors, "summary mancante");
  }

  switch (analysis.taskType) {
    case "invoice":
    case "ddt":
    case "supplier_price_list":
      if (!analysis.document) err(errors, "document mancante");
      else {
        if (!analysis.document.lineItems?.length) err(errors, "lineItems vuoti");
        for (const [i, line] of (analysis.document.lineItems ?? []).entries()) {
          if (!line.description.trim()) err(errors, `lineItems[${i}].description mancante`);
        }
      }
      break;

    case "product_recognition":
    case "label_recognition":
      if (!analysis.products?.length) err(errors, "products vuoto");
      break;

    case "paper_menu":
      if (!analysis.menuItems?.length) err(errors, "menuItems vuoto");
      else {
        for (const [i, item] of analysis.menuItems.entries()) {
          if (!item.name.trim()) err(errors, `menuItems[${i}].name mancante`);
        }
      }
      break;

    case "plating_verification":
      if (!analysis.plating) err(errors, "plating mancante");
      break;

    case "haccp_photo":
      if (!analysis.haccp) err(errors, "haccp mancante");
      break;
  }

  return { valid: errors.length === 0, errors };
}

export function validateAnalyzeRequest(body: {
  taskType?: string;
  image?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!body.taskType || !isVisionTaskType(body.taskType)) {
    err(errors, `taskType richiesto: ${VISION_TASK_TYPES.join(", ")}`);
  }

  if (!body.image?.trim()) {
    err(errors, "image richiesta (base64, data URL o URL HTTPS)");
  }

  return { valid: errors.length === 0, errors };
}
