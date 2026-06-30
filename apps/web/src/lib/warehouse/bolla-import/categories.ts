/** Regole euristiche reparto/categoria + apprendimento tenant. */

export const WAREHOUSE_CATEGORIES = [
  "Formaggi",
  "Latticini",
  "Carne",
  "Pesce",
  "Orto",
  "Dispensa",
  "Conservati",
  "Bevande",
  "Birre",
  "Distillati",
  "Vini",
  "Surgelati",
  "Pizzeria",
  "Bar",
  "Altro",
] as const;

const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["parmigiano", "grana", "pecorino", "gorgonzola", "formaggio", "emmental"], category: "Formaggi" },
  { keywords: ["mozzarella", "burrata", "ricotta", "latte", "panna", "yogurt"], category: "Latticini" },
  { keywords: ["bistecca", "manzo", "vitello", "maiale", "pollo", "tacchino", "salsiccia", "carne"], category: "Carne" },
  { keywords: ["salmone", "tonno", "orata", "branzino", "gamber", "calamari", "pesce"], category: "Pesce" },
  { keywords: ["menta", "basilico", "prezzemolo", "lattuga", "pomodorini freschi", "insalata", "rucola"], category: "Orto" },
  { keywords: ["farina", "riso", "zucchero", "sale", "olio extra", "aceto"], category: "Dispensa" },
  { keywords: ["pelati", "passata", "conserva", "scatol", "tonno scatola"], category: "Conservati" },
  { keywords: ["coca", "pepsi", "acqua", "succo", "the freddo", "aranciata"], category: "Bevande" },
  { keywords: ["moretti", "peroni", "heineken", "birra", "ipa", "lager"], category: "Birre" },
  { keywords: ["vodka", "gin", "rum", "whisky", "grappa", "limoncello", "amaro"], category: "Distillati" },
  { keywords: ["vino", "prosecco", "chianti", "barolo", "spumante"], category: "Vini" },
  { keywords: ["surgelat", "gelato industriale"], category: "Surgelati" },
  { keywords: ["impasto", "farina 00 pizza", "mozzarella pizza"], category: "Pizzeria" },
  { keywords: ["sciroppo", "granita", "caffè", "caffe"], category: "Bar" },
];

export function normalizeProductKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function suggestCategoryFromRules(productName: string): string {
  const key = normalizeProductKey(productName);
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => key.includes(kw))) return rule.category;
  }
  return "Dispensa";
}
