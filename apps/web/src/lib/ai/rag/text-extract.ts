import { createHash } from "node:crypto";

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

export type ExtractedDocument = {
  text: string;
  mimeType: string;
  charCount: number;
  contentHash: string;
};

export function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}

async function extractXlsx(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) parts.push(`[Foglio: ${sheetName}]\n${csv}`);
  }
  return parts.join("\n\n");
}

/** Extract plain text from uploaded content (TXT, MD, CSV, JSON, DOCX, XLSX). */
export async function extractTextFromDocument(params: {
  mimeType: string;
  contentText?: string | null;
  contentBase64?: string | null;
  fileName?: string | null;
}): Promise<ExtractedDocument> {
  const mime = (params.mimeType || "text/plain").toLowerCase();
  const ext = params.fileName?.split(".").pop()?.toLowerCase() ?? "";

  if (params.contentText?.trim()) {
    const text = params.contentText.trim();
    return { text, mimeType: mime, charCount: text.length, contentHash: hashContent(text) };
  }

  if (!params.contentBase64?.trim()) {
    throw new Error("Contenuto documento mancante");
  }

  const buffer = Buffer.from(params.contentBase64, "base64");
  let text = "";

  if (TEXT_MIMES.has(mime) || ["txt", "md", "csv", "json"].includes(ext)) {
    text = buffer.toString("utf8").trim();
  } else if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    text = await extractDocx(buffer);
  } else if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    ext === "xlsx" ||
    ext === "xls"
  ) {
    text = await extractXlsx(buffer);
  } else if (mime === "application/pdf" || ext === "pdf") {
    // PDF: estrazione testuale base da stream (fallback senza dipendenza nativa)
    text = extractPdfTextHeuristic(buffer);
    if (!text.trim()) {
      throw new Error("PDF senza testo estraibile — convertire in TXT/DOCX o incollare il testo");
    }
  } else {
    text = buffer.toString("utf8").trim();
  }

  if (!text.trim()) throw new Error("Nessun testo estraibile dal documento");

  return {
    text,
    mimeType: mime,
    charCount: text.length,
    contentHash: hashContent(text),
  };
}

/** Heuristic PDF text extraction from literal strings in binary. */
function extractPdfTextHeuristic(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const matches: string[] = [];
  const re = /\(([^()\\]{4,200})\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const s = m[1].replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
    if (/^[\x20-\x7E\u00A0-\u024F\s.,;:!?'"()-]+$/.test(s) && s.length > 8) {
      matches.push(s);
    }
  }
  return [...new Set(matches)].join("\n");
}

export function detectMimeType(fileName: string, fallback = "text/plain"): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
      return "text/markdown";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls":
      return "application/vnd.ms-excel";
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain";
    default:
      return fallback;
  }
}
