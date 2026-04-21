import { HOMEPAGE_COPY, LOCALE_META } from "@/core/i18n/seo-content";
import type { Locale } from "@/core/i18n/types";

/**
 * JSON-LD SoftwareApplication per RistoSaaS.
 * Il copy (name, description, featureList) viene preso dalla lingua
 * passata. inLanguage viene settato al codice IETF corretto (it-IT,
 * en-US, nl-NL) così i crawler sanno su quale locale indicizzare.
 */
export function SoftwareApplicationJsonLd({
  locale = "it",
  name,
  url,
  description,
}: {
  locale?: Locale;
  name?: string;
  url?: string;
  description?: string;
} = {}) {
  const copy = HOMEPAGE_COPY[locale];
  const FEATURE_LIST: Record<Locale, string[]> = {
    it: [
      "Gestione tavoli e ordini ristorante",
      "Schermo cucina KDS con stato piatti",
      "Magazzino con scarico automatico",
      "Suggerimento ordini fornitori",
      "Email e PDF ordine fornitore",
      "Prenotazioni hotel e check-in/check-out",
      "Addebito ristorante su camera (folio unico)",
      "Report e chiusura cassa giornaliera",
      "Multi-tenant con RBAC granulare",
    ],
    en: [
      "Table and order management",
      "Kitchen display system (KDS) with dish status",
      "Inventory with automatic deduction",
      "Supplier reorder suggestions",
      "Supplier PO email and PDF",
      "Hotel reservations and check-in/check-out",
      "Restaurant-to-room charging (single folio)",
      "Daily reports and end-of-day closing",
      "Multi-tenant with granular RBAC",
    ],
    nl: [
      "Tafel- en bestelbeheer",
      "Keukendisplay (KDS) met gerechtstatus",
      "Voorraad met automatische aftrek",
      "Suggesties voor leveranciersbestellingen",
      "E-mail en PDF leveranciersbestelling",
      "Hotelreserveringen en check-in/check-out",
      "Restaurant-op-kamer facturering (één folio)",
      "Dagelijkse rapporten en dagafsluiting",
      "Multi-tenant met granulair RBAC",
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: name ?? "RistoSaaS",
    url: url ?? "https://ristosaas.com/",
    description: description ?? copy.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: LOCALE_META[locale].htmlLang,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: url ?? "https://ristosaas.com/",
    },
    featureList: FEATURE_LIST[locale],
    provider: {
      "@type": "Organization",
      name: "gestionesemplificata.com",
      url: "https://gestionesemplificata.com",
    },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- inlined JSON-LD, stringified server-side
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
