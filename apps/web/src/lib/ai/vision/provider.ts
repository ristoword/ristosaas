const DEFAULT_VISION_MODEL = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export type VisionImageInput = {
  image: string;
  mimeType?: string;
};

export type VisionProviderResult = {
  rawContent: string;
  model: string;
};

function detectMimeFromDataUrl(dataUrl: string): string | null {
  const match = /^data:([^;]+);base64,/.exec(dataUrl);
  return match?.[1] ?? null;
}

function normalizeImageUrl(input: VisionImageInput): { url: string; mimeType: string } {
  const trimmed = input.image.trim();
  if (!trimmed) throw new Error("Immagine mancante");

  if (trimmed.startsWith("data:")) {
    const mime = detectMimeFromDataUrl(trimmed) ?? input.mimeType ?? "image/jpeg";
    return { url: trimmed, mimeType: mime };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { url: trimmed, mimeType: input.mimeType ?? "image/jpeg" };
  }

  const mime = input.mimeType ?? "image/jpeg";
  const base64 = trimmed.replace(/\s/g, "");
  const approxBytes = Math.ceil((base64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new Error("Immagine troppo grande (max 20MB)");
  }
  return { url: `data:${mime};base64,${base64}`, mimeType: mime };
}

export async function callOpenAIVision(
  apiKey: string,
  prompt: string,
  input: VisionImageInput,
  signal?: AbortSignal,
): Promise<VisionProviderResult> {
  const { url } = normalizeImageUrl(input);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_VISION_MODEL,
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url, detail: "high" } },
          ],
        },
      ],
    }),
    signal: signal ?? AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Vision error: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) throw new Error("OpenAI Vision: risposta vuota");

  return { rawContent, model: DEFAULT_VISION_MODEL };
}

export { DEFAULT_VISION_MODEL, normalizeImageUrl };
