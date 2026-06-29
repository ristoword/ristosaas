import { isWebSearchAvailable } from "@/lib/ai/platform-config.runtime";

export type WebSearchResult = {
  context: string | null;
  resultCount: number;
  used: boolean;
};

async function searchWithTavily(query: string, apiKey: string, maxResults: number): Promise<WebSearchResult> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: true,
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) return { context: null, resultCount: 0, used: false };

  const data = (await response.json()) as {
    answer?: string;
    results?: Array<{ title?: string; content?: string; url?: string }>;
  };

  const blocks: string[] = [];
  if (data.answer?.trim()) blocks.push(`Sintesi web: ${data.answer.trim()}`);
  for (const hit of data.results ?? []) {
    if (!hit.content?.trim()) continue;
    blocks.push(`- ${hit.title ?? "Risultato"}: ${hit.content.trim().slice(0, 400)}${hit.url ? ` (${hit.url})` : ""}`);
  }

  if (blocks.length === 0) return { context: null, resultCount: 0, used: false };

  return {
    context: `[Web Search]\n${blocks.join("\n")}`,
    resultCount: data.results?.length ?? (data.answer ? 1 : 0),
    used: true,
  };
}

async function searchWithSerper(query: string, apiKey: string, maxResults: number): Promise<WebSearchResult> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) return { context: null, resultCount: 0, used: false };

  const data = (await response.json()) as {
    answerBox?: { answer?: string; snippet?: string };
    organic?: Array<{ title?: string; snippet?: string; link?: string }>;
  };

  const blocks: string[] = [];
  const answer = data.answerBox?.answer ?? data.answerBox?.snippet;
  if (answer?.trim()) blocks.push(`Sintesi web: ${answer.trim()}`);
  for (const hit of data.organic ?? []) {
    if (!hit.snippet?.trim()) continue;
    blocks.push(`- ${hit.title ?? "Risultato"}: ${hit.snippet.trim()}${hit.link ? ` (${hit.link})` : ""}`);
  }

  if (blocks.length === 0) return { context: null, resultCount: 0, used: false };

  return {
    context: `[Web Search]\n${blocks.join("\n")}`,
    resultCount: data.organic?.length ?? (answer ? 1 : 0),
    used: true,
  };
}

/** Fetches live web context when platform + agent web search toggles are enabled. */
export async function retrieveWebSearchContext(params: {
  query: string;
  webSearchEnabled: boolean;
  maxResults?: number;
}): Promise<WebSearchResult> {
  if (!params.webSearchEnabled || !params.query.trim() || !isWebSearchAvailable()) {
    return { context: null, resultCount: 0, used: false };
  }

  const maxResults = params.maxResults ?? 4;
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey) {
    try {
      return await searchWithTavily(params.query.trim(), tavilyKey, maxResults);
    } catch {
      /* fall through */
    }
  }

  const serperKey = process.env.SERPER_API_KEY?.trim();
  if (serperKey) {
    try {
      return await searchWithSerper(params.query.trim(), serperKey, maxResults);
    } catch {
      /* non-blocking */
    }
  }

  return { context: null, resultCount: 0, used: false };
}
