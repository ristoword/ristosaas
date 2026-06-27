/** OpenAI text → numeric vector (embedding) for semantic search / RAG. */

export const EMBEDDING_DIM = 1536;
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export type TextEmbedding = {
  text: string;
  vector: number[];
  model: string;
  dimensions: number;
};

export function getEmbeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}

export function validateEmbedding(vector: number[], expectedDim = EMBEDDING_DIM): void {
  if (!Array.isArray(vector) || vector.length !== expectedDim) {
    throw new Error(`Invalid embedding: expected ${expectedDim} dimensions, got ${vector?.length ?? 0}`);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function callOpenAiEmbeddings(apiKey: string, inputs: string[]): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input: inputs,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI embeddings error: ${errorText || response.statusText}`);
  }

  const json = (await response.json()) as {
    data?: Array<{ index: number; embedding: number[] }>;
  };

  const rows = json.data ?? [];
  return rows
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((row) => {
      validateEmbedding(row.embedding);
      return row.embedding;
    });
}

/**
 * Transform one or more texts into numeric embedding vectors (OpenAI).
 */
export async function embedTexts(apiKey: string, texts: string[]): Promise<number[][]> {
  const inputs = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (inputs.length === 0) return [];
  return callOpenAiEmbeddings(apiKey, inputs);
}

/** Single-text convenience wrapper. */
export async function embedText(apiKey: string, text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }
  const [vector] = await callOpenAiEmbeddings(apiKey, [trimmed]);
  return vector;
}

/** Text + vector pair with model metadata. */
export async function embedTextWithMeta(apiKey: string, text: string): Promise<TextEmbedding> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }
  const model = getEmbeddingModel();
  const [vector] = await callOpenAiEmbeddings(apiKey, [trimmed]);
  return {
    text: trimmed,
    vector,
    model,
    dimensions: vector.length,
  };
}
