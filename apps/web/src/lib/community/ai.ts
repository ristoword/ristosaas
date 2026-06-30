import { callLlmChatCompletion, resolveProviderApiKey } from "@/lib/ai/runtime/llm-provider";
import type { CommunityAiImproveResult, CommunityRecipeDetail } from "@/lib/community/types";

const LOCALE_NAMES: Record<string, string> = {
  it: "Italian",
  en: "English",
  fr: "French",
  de: "German",
  nl: "Dutch",
  es: "Spanish",
  pt: "Portuguese",
};

export async function translateCommunityRecipe(
  recipe: CommunityRecipeDetail,
  targetLocale: string,
): Promise<{
  title: string;
  description: string;
  chefTips: string;
  techniques: string;
  plating: string;
  variants: string;
  stepsJson: string;
} | null> {
  const apiKey = resolveProviderApiKey("openai");
  if (!apiKey) return null;

  const lang = LOCALE_NAMES[targetLocale] ?? targetLocale;
  const prompt = `Translate the following professional recipe content to ${lang}. Keep culinary terms accurate. Return ONLY valid JSON:
{
  "title": "...",
  "description": "...",
  "chefTips": "...",
  "techniques": "...",
  "plating": "...",
  "variants": "...",
  "steps": [{"order": 1, "text": "..."}]
}

Recipe title: ${recipe.title}
Description: ${recipe.description}
Chef tips: ${recipe.chefTips}
Techniques: ${recipe.techniques}
Plating: ${recipe.plating}
Variants: ${recipe.variants}
Steps: ${JSON.stringify(recipe.steps)}`;

  const result = await callLlmChatCompletion("openai", apiKey, {
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 2000,
    messages: [
      { role: "system", content: "You are a professional culinary translator. Output only JSON." },
      { role: "user", content: prompt },
    ],
  });

  if (!result.content) return null;
  try {
    const parsed = JSON.parse(result.content.replace(/```json\n?|\n?```/g, "").trim()) as {
      title: string;
      description: string;
      chefTips: string;
      techniques: string;
      plating: string;
      variants: string;
      steps: Array<{ order: number; text: string }>;
    };
    return {
      title: parsed.title ?? recipe.title,
      description: parsed.description ?? recipe.description,
      chefTips: parsed.chefTips ?? recipe.chefTips,
      techniques: parsed.techniques ?? recipe.techniques,
      plating: parsed.plating ?? recipe.plating,
      variants: parsed.variants ?? recipe.variants,
      stepsJson: JSON.stringify(parsed.steps ?? recipe.steps),
    };
  } catch {
    return null;
  }
}

export async function improveCommunityRecipeWithAi(
  recipe: Partial<CommunityRecipeDetail>,
  focus?: string,
): Promise<CommunityAiImproveResult | null> {
  const apiKey = resolveProviderApiKey("openai");
  if (!apiKey) return null;

  const prompt = `You are a Michelin-star culinary consultant. Improve this professional recipe for Risto Community.
Focus: ${focus ?? "description, chef tips, techniques, plating, variants, alternative ingredients"}.
Return ONLY valid JSON:
{
  "description": "...",
  "chefTips": "...",
  "techniques": "...",
  "plating": "...",
  "variants": "...",
  "suggestedIngredients": [{"name": "...", "qty": 100, "unit": "g"}]
}

Current recipe:
${JSON.stringify({
  title: recipe.title,
  description: recipe.description,
  chefTips: recipe.chefTips,
  techniques: recipe.techniques,
  plating: recipe.plating,
  variants: recipe.variants,
  ingredients: recipe.ingredients,
  steps: recipe.steps,
})}`;

  const result = await callLlmChatCompletion("openai", apiKey, {
    model: "gpt-4o-mini",
    temperature: 0.5,
    max_tokens: 1800,
    messages: [
      { role: "system", content: "Professional chef AI assistant. Output only JSON." },
      { role: "user", content: prompt },
    ],
  });

  if (!result.content) return null;
  try {
    return JSON.parse(result.content.replace(/```json\n?|\n?```/g, "").trim()) as CommunityAiImproveResult;
  } catch {
    return null;
  }
}
