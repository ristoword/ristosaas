import type { OcrExtractedFields } from "@/modules/hotel/domain/guest-register-types";

/**
 * OCR layer — predisposto per integrazione provider esterni (Azure, Google Vision, etc.).
 * Attualmente estrae metadati base da payload immagine e consente verifica manuale.
 */
export async function runOcrOnDocument(params: {
  mimeType: string;
  dataBase64: string;
  fileName: string;
}): Promise<OcrExtractedFields> {
  const raw = params.dataBase64.includes(",") ? params.dataBase64.split(",")[1]! : params.dataBase64;
  const sizeKb = Math.ceil((raw.length * 3) / 4 / 1024);

  // Placeholder: in produzione sostituire con chiamata al provider OCR configurato per tenant.
  await new Promise((r) => setTimeout(r, 300));

  const hints: OcrExtractedFields = {
    documentType: params.fileName.toLowerCase().includes("passport") ? "passport" : undefined,
  };

  if (params.mimeType.startsWith("image/") && sizeKb > 0) {
    hints.documentNumber = undefined;
  }

  return {
    ...hints,
  };
}

export function mergeOcrIntoPerson(
  current: Partial<OcrExtractedFields>,
  extracted: OcrExtractedFields,
  overwrite = false,
): OcrExtractedFields {
  const merged = { ...current };
  for (const [key, value] of Object.entries(extracted)) {
    if (key === "_meta") continue;
    if (value == null || value === "") continue;
    if (overwrite || merged[key as keyof OcrExtractedFields] == null) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}
