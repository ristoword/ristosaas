/**
 * JSON-LD SoftwareApplication per RistoSaaS. Pensato per essere
 * incluso in /app/page.tsx e nelle pagine pillar SEO. Aiuta i motori
 * di ricerca a capire categoria e offerta, migliorando rich snippets
 * e click-through da risultati di ricerca.
 */
export function SoftwareApplicationJsonLd({
  name = "RistoSaaS",
  url = "https://ristosaas.com/",
  description = "Software gestionale per ristorante e hotel integrato: ordini, cucina (KDS), magazzino, fornitori e camere in un unico sistema cloud.",
}: { name?: string; url?: string; description?: string } = {}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    url,
    description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "it-IT",
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url,
    },
    featureList: [
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
