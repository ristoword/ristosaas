export const COMMUNITY_CATEGORIES = [
  "Antipasti",
  "Primi",
  "Secondi",
  "Contorni",
  "Pizza",
  "Pane",
  "Dolci",
  "Pesce",
  "Carne",
  "Vegetariano",
  "Vegano",
  "Cocktail",
  "Pasticceria",
  "Street Food",
  "Altro",
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const COMMUNITY_DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export type CommunityDifficulty = (typeof COMMUNITY_DIFFICULTIES)[number];

export const COMMUNITY_TRANSLATION_LOCALES = [
  "it",
  "en",
  "fr",
  "de",
  "nl",
  "es",
  "pt",
] as const;

export type CommunityLocale = (typeof COMMUNITY_TRANSLATION_LOCALES)[number];

export const COMMUNITY_PUBLISH_ROLES = ["owner", "cucina", "supervisor", "super_admin"] as const;

export const COMMUNITY_ACCESS_ROLES = [
  "owner",
  "supervisor",
  "super_admin",
  "cucina",
  "sala",
  "cassa",
  "bar",
  "pizzeria",
  "magazzino",
  "staff",
  "hotel_manager",
  "reception",
  "housekeeping",
] as const;
