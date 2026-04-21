export type Locale = "it" | "en" | "nl";

export const SUPPORTED_LOCALES: readonly Locale[] = ["it", "en", "nl"] as const;

export type TranslationValue = string;

export type TranslationDictionary = Record<string, TranslationValue>;
