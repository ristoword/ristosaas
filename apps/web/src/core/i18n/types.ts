export type Locale = "it" | "en" | "nl" | "pt";

export const SUPPORTED_LOCALES: readonly Locale[] = ["it", "en", "nl", "pt"] as const;

export type TranslationValue = string;

export type TranslationDictionary = Record<string, TranslationValue>;
