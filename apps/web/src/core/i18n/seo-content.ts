import type { Locale } from "@/core/i18n/types";

/**
 * Contenuti SEO centralizzati per tutte le pagine pubbliche.
 * 3 lingue supportate: it (default), en, nl.
 *
 * Regola di routing:
 *   /            -> IT homepage
 *   /en          -> EN homepage
 *   /nl          -> NL homepage
 *   /<slug>      -> IT
 *   /en/<slug>   -> EN
 *   /nl/<slug>   -> NL
 *
 * Gli slug sono localizzati per massimizzare il SEO nella lingua di
 * destinazione (evitando "restaurant-management-software" in italiano
 * e "gestionale-ristorante" in inglese).
 */

export const SITE_URL = "https://ristosaas.com";

export type HomepageCopy = {
  title: string;
  description: string;
  keywords: string[];
  heroBadge: string;
  heroH1Part1: string;
  heroH1Part2: string;
  heroSub: string;
  ctaDemo: string;
  ctaAccess: string;
  demoMailSubject: string;
  demoMailBody: string;

  integrationEyebrow: string;
  integrationH2: string;
  integrationLead: string;
  integrationFlows: Array<{ from: string; arrow: string }>;

  featuresEyebrow: string;
  featuresH2: string;
  featuresLead: string;
  features: Array<{ title: string; subtitle: string; body: string }>;

  differenceEyebrow: string;
  differenceH2: string;
  differenceLead: string;
  legacy: string[];
  ours: string[];

  benefitsGrid: Array<{ title: string; body: string }>;

  brandEyebrow: string;
  brandH2Part1: string;
  brandH2Part2: string;
  brandBody: string;

  contactEyebrow: string;
  contactH2: string;
  contactBody: string;
  contactEmailLabel: string;
  contactSiteLabel: string;

  finalEyebrow: string;
  finalH2: string;
  finalBody: string;
  finalListHeader: string;
  finalList: string[];
  finalCtaPrimary: string;
  finalCtaSecondary: string;
  finalNote: string;

  navComeFunziona: string;
  navFunzioni: string;
  navIntegrato: string;
  navDemo: string;
  navLogin: string;
  footerFunctions: string;
  footerIntegrated: string;
  footerRestaurant: string;
  footerBlog: string;
  footerDemo: string;
  footerRights: string;
};

export type PillarCopy = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  h1: string;
  lead: string;
  ctaDemo: string;
  ctaAccess: string;
  demoMailSubject: string;
  demoMailBody: string;

  howItWorksH2: string;
  howItWorksLead: string;
  flows: Array<{ h3Start: string; h3End: string; body: string }>;

  featuresH2: string;
  featureBlocks: Array<{
    title: string;
    items: string[];
  }>;

  forWhoH2: string;
  forWhoItems: Array<{ title: string; body: string }>;

  benefitsH2: string;
  benefits: Array<{ title: string; body: string }>;

  finalH2: string;
  finalBody: string;
  finalDemoCta: string;
  finalAccessCta: string;
};

export type RestaurantCopy = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  h1: string;
  lead: string;
  ctaDemo: string;
  ctaAccess: string;
  demoMailSubject: string;
  demoMailBody: string;

  whatIncludesH2: string;
  features: Array<{ title: string; body: string; iconKey: "tables" | "orders" | "status" | "warehouse" }>;

  crossLinkH2: string;
  crossLinkBody: string;
  crossLinkCta: string;
};

export type BlogPostCopy = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readingMinutes: number;
  lead: string[];
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
  conclusion: string;
  related?: string[];
};

export type BlogIndexCopy = {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  lead: string;
  readLinkLabel: string;
  minLabel: string;
};

export type LocaleLabel = {
  localeCode: string;
  htmlLang: string;
  nativeName: string;
  shortName: string;
};

export const LOCALE_META: Record<Locale, LocaleLabel> = {
  it: { localeCode: "it_IT", htmlLang: "it-IT", nativeName: "Italiano", shortName: "IT" },
  en: { localeCode: "en_US", htmlLang: "en-US", nativeName: "English", shortName: "EN" },
  nl: { localeCode: "nl_NL", htmlLang: "nl-NL", nativeName: "Nederlands", shortName: "NL" },
};

/* ─── HOMEPAGE ──────────────────────────────────── */

export const HOMEPAGE_COPY: Record<Locale, HomepageCopy> = {
  it: {
    title: "Gestionale Ristorante e Hotel Integrato | Ordini, Cucina, Magazzino, Camere",
    description:
      "Software completo per ristorante e hotel: gestisci tavoli, cucina (KDS), magazzino, fornitori e camere in un unico sistema cloud.",
    keywords: [
      "gestionale ristorante",
      "gestionale hotel",
      "software ristorante hotel integrato",
      "KDS cucina",
      "gestione magazzino ristorante",
      "software horeca",
      "addebito camera hotel ristorante",
      "prenotazioni hotel",
    ],
    heroBadge: "Una soluzione firmata gestionesemplificata.com",
    heroH1Part1: "Gestionale ristorante e hotel",
    heroH1Part2: "in un unico sistema",
    heroSub:
      "Gestisci ristorante, hotel e magazzino senza passare tra software diversi. Ordini, cucina, camere e fornitori collegati in tempo reale.",
    ctaDemo: "Richiedi demo",
    ctaAccess: "Prova accesso",
    demoMailSubject: "RistoSaaS – Richiesta demo",
    demoMailBody: "Vorrei una demo di RistoSaaS per la mia struttura.",

    integrationEyebrow: "Come funziona",
    integrationH2: "Tutto collegato, senza passaggi manuali",
    integrationLead:
      "Ogni azione in sala, cucina, magazzino o reception aggiorna tutto il resto in tempo reale. Niente doppia registrazione, niente passaggio di carta, niente errori di trascrizione.",
    integrationFlows: [
      { from: "Ordini dal tavolo", arrow: "arrivano in cucina" },
      { from: "Piatti serviti", arrow: "aggiornano lo stato ordine" },
      { from: "Ordine chiuso", arrow: "scarica il magazzino" },
      { from: "Cliente hotel", arrow: "addebita al conto camera" },
    ],

    featuresEyebrow: "Funzioni",
    featuresH2: "Cosa fa RistoSaaS",
    featuresLead: "Quattro moduli pensati per lavorare insieme, non per essere comprati separatamente.",
    features: [
      {
        title: "Ristorante",
        subtitle: "Sala, ordini, cassa",
        body: "Tavoli e sala in tempo reale, ordini veloci collegati alla cucina, stato piatti (in preparazione, pronto, servito), chiusura conto.",
      },
      {
        title: "Cucina (KDS)",
        subtitle: "Schermo cucina",
        body: "Comande ordinate per priorità, aggiornamento live, riduzione errori tra sala e cucina. Stato corsi in preparazione, pronto, servito.",
      },
      {
        title: "Magazzino",
        subtitle: "Scorte e fornitori",
        body: "Scarico ingredienti automatico su ordine, avviso scorte basse, suggerimento ordini fornitori, PDF ed email ordine al fornitore.",
      },
      {
        title: "Hotel",
        subtitle: "Camere e ospiti",
        body: "Prenotazioni, check-in e check-out, addebito ristorante sulla camera con folio unificato per l'ospite.",
      },
    ],

    differenceEyebrow: "Differenza",
    differenceH2: "Perché è diverso dagli altri software",
    differenceLead:
      "La maggior parte delle strutture horeca oggi usa tre o quattro software separati che non si parlano tra loro. Qui è tutto nello stesso sistema.",
    legacy: [
      "un gestionale per il ristorante",
      "uno per l'hotel",
      "uno per il magazzino",
      "fogli Excel per collegare i dati",
    ],
    ours: [
      "Un unico sistema integrato per ristorante, cucina, magazzino e hotel.",
      "Flussi automatici tra sala, cucina, magazzino e camere.",
      "Zero doppie registrazioni, zero integrazioni da manutenere.",
      "Dashboard unica con dati in tempo reale.",
    ],

    benefitsGrid: [
      { title: "Meno errori operativi", body: "Niente trascrizioni manuali tra sistemi. Sala, cucina, magazzino e reception usano la stessa fonte dei dati." },
      { title: "Meno software da gestire", body: "Un solo accesso, una sola licenza, un solo fornitore. Zero integrazioni da manutenere." },
      { title: "Maggiore controllo", body: "Stato ordini, scorte, prenotazioni e incassi visibili in tempo reale dallo stesso pannello." },
      { title: "Dati centralizzati", body: "Multi-tenant sicuro con RBAC, backup automatico, audit trail sulle azioni sensibili." },
    ],

    brandEyebrow: "Trust",
    brandH2Part1: "Una soluzione firmata",
    brandH2Part2: "gestionesemplificata.com",
    brandBody:
      "Dietro RistoSaaS c'è un team che progetta software gestionale da anni. Stessa filosofia, stessa cura — applicata al mondo dell'hospitality.",

    contactEyebrow: "Contatti",
    contactH2: "Ti rispondiamo noi.",
    contactBody: "Demo, integrazioni, onboarding su una nuova struttura: scrivici, ti guidiamo noi.",
    contactEmailLabel: "Email",
    contactSiteLabel: "Sito madre",

    finalEyebrow: "Inizia ora",
    finalH2: "Riduci errori, tempo e costi operativi.",
    finalBody:
      "Vedi come funziona dal vivo sulla tua struttura. Ti mostriamo il flusso ordine → cucina → magazzino → camera in 20 minuti.",
    finalListHeader: "Cosa ottieni",
    finalList: [
      "Dashboard operativa pronta all'uso",
      "Ristorante, cucina, magazzino e hotel sincronizzati",
      "Addebito ristorante su camera (folio unico)",
      "Suggerimenti ordini fornitore automatici",
      "Onboarding guidato + supporto diretto",
    ],
    finalCtaPrimary: "Richiedi demo",
    finalCtaSecondary: "Accedi",
    finalNote: "RistoSaaS è parte dell'ecosistema gestionesemplificata.com.",

    navComeFunziona: "Come funziona",
    navFunzioni: "Funzioni",
    navIntegrato: "Integrato",
    navDemo: "Demo",
    navLogin: "Login",
    footerFunctions: "Funzioni",
    footerIntegrated: "Sistema integrato",
    footerRestaurant: "Gestionale ristorante",
    footerBlog: "Blog",
    footerDemo: "Demo",
    footerRights: "Tutti i diritti riservati.",
  },

  en: {
    title: "Restaurant & Hotel Management Software | Orders, Kitchen, Inventory, Rooms",
    description:
      "All-in-one software for restaurant and hotel: manage tables, kitchen (KDS), inventory, suppliers and rooms in a single cloud system.",
    keywords: [
      "restaurant management software",
      "hotel management software",
      "integrated restaurant hotel software",
      "KDS kitchen display",
      "restaurant inventory management",
      "horeca software",
      "room charge restaurant hotel",
      "hotel reservations",
    ],
    heroBadge: "A solution powered by gestionesemplificata.com",
    heroH1Part1: "Restaurant and hotel management",
    heroH1Part2: "in a single system",
    heroSub:
      "Manage restaurant, hotel and inventory without switching between different tools. Orders, kitchen, rooms and suppliers connected in real time.",
    ctaDemo: "Request a demo",
    ctaAccess: "Try access",
    demoMailSubject: "RistoSaaS – Demo request",
    demoMailBody: "I would like a demo of RistoSaaS for my property.",

    integrationEyebrow: "How it works",
    integrationH2: "All connected, no manual steps",
    integrationLead:
      "Every action in the dining room, kitchen, inventory or front desk updates everything else in real time. No double registration, no paper, no transcription errors.",
    integrationFlows: [
      { from: "Orders from the table", arrow: "reach the kitchen" },
      { from: "Served dishes", arrow: "update the order status" },
      { from: "Closed order", arrow: "deducts from inventory" },
      { from: "Hotel guest", arrow: "charges to the room folio" },
    ],

    featuresEyebrow: "Features",
    featuresH2: "What RistoSaaS does",
    featuresLead: "Four modules designed to work together, not to be bought separately.",
    features: [
      {
        title: "Restaurant",
        subtitle: "Dining room, orders, POS",
        body: "Tables and floor plan in real time, fast orders connected to the kitchen, dish status (in prep, ready, served), check closing.",
      },
      {
        title: "Kitchen (KDS)",
        subtitle: "Kitchen display",
        body: "Orders sorted by priority, live updates, fewer errors between floor and kitchen. Courses in prep, ready, served.",
      },
      {
        title: "Inventory",
        subtitle: "Stock and suppliers",
        body: "Automatic ingredient deduction on order, low-stock alerts, supplier reorder suggestions, PDF and email purchase orders.",
      },
      {
        title: "Hotel",
        subtitle: "Rooms and guests",
        body: "Reservations, check-in and check-out, restaurant-to-room charging with a unified guest folio.",
      },
    ],

    differenceEyebrow: "The difference",
    differenceH2: "Why it is different from other software",
    differenceLead:
      "Most hospitality venues today use three or four separate systems that don't talk to each other. Here everything is in the same system.",
    legacy: [
      "one system for the restaurant",
      "one for the hotel",
      "one for inventory",
      "spreadsheets to glue it all together",
    ],
    ours: [
      "A single integrated system for restaurant, kitchen, inventory and hotel.",
      "Automatic flows between dining room, kitchen, inventory and rooms.",
      "Zero double registration, zero integrations to maintain.",
      "One dashboard with real-time data.",
    ],

    benefitsGrid: [
      { title: "Fewer operational errors", body: "No manual transcription between systems. Dining room, kitchen, inventory and reception use the same source of truth." },
      { title: "Fewer tools to manage", body: "One login, one license, one vendor. Zero integrations to maintain." },
      { title: "Better control", body: "Order status, stock, reservations and revenue visible in real time from the same panel." },
      { title: "Centralized data", body: "Secure multi-tenant with RBAC, automatic backup, audit trail on sensitive actions." },
    ],

    brandEyebrow: "Trust",
    brandH2Part1: "A solution powered by",
    brandH2Part2: "gestionesemplificata.com",
    brandBody:
      "Behind RistoSaaS there is a team that has been designing business software for years. Same philosophy, same care — applied to hospitality.",

    contactEyebrow: "Contact",
    contactH2: "We will reply to you.",
    contactBody: "Demo, integrations, onboarding on a new property: write to us, we will guide you.",
    contactEmailLabel: "Email",
    contactSiteLabel: "Parent site",

    finalEyebrow: "Start now",
    finalH2: "Reduce errors, time and operational costs.",
    finalBody:
      "See how it works live on your property. We walk you through the order → kitchen → inventory → room flow in 20 minutes.",
    finalListHeader: "What you get",
    finalList: [
      "Operational dashboard ready to use",
      "Restaurant, kitchen, inventory and hotel in sync",
      "Restaurant-to-room charging (single folio)",
      "Automatic supplier reorder suggestions",
      "Guided onboarding + direct support",
    ],
    finalCtaPrimary: "Request a demo",
    finalCtaSecondary: "Sign in",
    finalNote: "RistoSaaS is part of the gestionesemplificata.com ecosystem.",

    navComeFunziona: "How it works",
    navFunzioni: "Features",
    navIntegrato: "Integrated",
    navDemo: "Demo",
    navLogin: "Login",
    footerFunctions: "Features",
    footerIntegrated: "Integrated system",
    footerRestaurant: "Restaurant software",
    footerBlog: "Blog",
    footerDemo: "Demo",
    footerRights: "All rights reserved.",
  },

  nl: {
    title: "Restaurant- en Hotelbeheersoftware | Bestellingen, Keuken, Voorraad, Kamers",
    description:
      "Alles-in-één software voor restaurant en hotel: beheer tafels, keuken (KDS), voorraad, leveranciers en kamers in één cloudsysteem.",
    keywords: [
      "restaurantbeheersoftware",
      "hotelbeheersoftware",
      "geïntegreerde restaurant hotel software",
      "KDS keuken display",
      "voorraadbeheer restaurant",
      "horeca software",
      "kamerrekening restaurant hotel",
      "hotelreserveringen",
    ],
    heroBadge: "Een oplossing van gestionesemplificata.com",
    heroH1Part1: "Restaurant- en hotelbeheer",
    heroH1Part2: "in één systeem",
    heroSub:
      "Beheer restaurant, hotel en voorraad zonder te wisselen tussen verschillende tools. Bestellingen, keuken, kamers en leveranciers realtime verbonden.",
    ctaDemo: "Vraag een demo aan",
    ctaAccess: "Probeer toegang",
    demoMailSubject: "RistoSaaS – Demo-aanvraag",
    demoMailBody: "Ik wil graag een demo van RistoSaaS voor mijn accommodatie.",

    integrationEyebrow: "Zo werkt het",
    integrationH2: "Alles verbonden, geen handmatige stappen",
    integrationLead:
      "Elke actie in de bediening, keuken, voorraad of receptie werkt de rest realtime bij. Geen dubbele registratie, geen papier, geen overschrijffouten.",
    integrationFlows: [
      { from: "Bestellingen van tafel", arrow: "gaan direct naar de keuken" },
      { from: "Geserveerde gerechten", arrow: "werken de bestelstatus bij" },
      { from: "Afgesloten bestelling", arrow: "boekt van voorraad af" },
      { from: "Hotelgast", arrow: "boekt op de kamerrekening" },
    ],

    featuresEyebrow: "Functies",
    featuresH2: "Wat RistoSaaS doet",
    featuresLead: "Vier modules ontworpen om samen te werken, niet om apart gekocht te worden.",
    features: [
      {
        title: "Restaurant",
        subtitle: "Zaal, bestellingen, kassa",
        body: "Tafels en zaalplan realtime, snelle bestellingen gekoppeld aan de keuken, gerechtstatus (in voorbereiding, klaar, geserveerd), rekening afsluiten.",
      },
      {
        title: "Keuken (KDS)",
        subtitle: "Keukendisplay",
        body: "Bestellingen op prioriteit, live updates, minder fouten tussen zaal en keuken. Gangen in voorbereiding, klaar, geserveerd.",
      },
      {
        title: "Voorraad",
        subtitle: "Stock en leveranciers",
        body: "Automatische ingrediëntenaftrek op bestelling, lage-voorraadwaarschuwingen, suggesties voor leveranciersbestellingen, PDF en e-mail bestelling.",
      },
      {
        title: "Hotel",
        subtitle: "Kamers en gasten",
        body: "Reserveringen, check-in en check-out, restaurant-op-kamer factureren met één gastfolio.",
      },
    ],

    differenceEyebrow: "Het verschil",
    differenceH2: "Waarom het anders is dan andere software",
    differenceLead:
      "De meeste horecalocaties gebruiken vandaag drie of vier losse systemen die niet met elkaar praten. Hier staat alles in één systeem.",
    legacy: [
      "één systeem voor het restaurant",
      "één voor het hotel",
      "één voor de voorraad",
      "Excel-sheets om alles aan elkaar te plakken",
    ],
    ours: [
      "Eén geïntegreerd systeem voor restaurant, keuken, voorraad en hotel.",
      "Automatische flows tussen zaal, keuken, voorraad en kamers.",
      "Nul dubbele registraties, nul integraties om te onderhouden.",
      "Eén dashboard met realtime data.",
    ],

    benefitsGrid: [
      { title: "Minder operationele fouten", body: "Geen handmatige overschrijving tussen systemen. Zaal, keuken, voorraad en receptie gebruiken dezelfde bron." },
      { title: "Minder tools te beheren", body: "Eén login, één licentie, één leverancier. Nul integraties om te onderhouden." },
      { title: "Betere controle", body: "Bestelstatus, voorraad, reserveringen en omzet realtime zichtbaar vanuit hetzelfde paneel." },
      { title: "Centrale data", body: "Veilige multi-tenant met RBAC, automatische back-up, audit trail op gevoelige acties." },
    ],

    brandEyebrow: "Vertrouwen",
    brandH2Part1: "Een oplossing van",
    brandH2Part2: "gestionesemplificata.com",
    brandBody:
      "Achter RistoSaaS zit een team dat al jaren bedrijfssoftware ontwerpt. Dezelfde filosofie, dezelfde zorg — toegepast op hospitality.",

    contactEyebrow: "Contact",
    contactH2: "Wij antwoorden je.",
    contactBody: "Demo, integraties, onboarding op een nieuwe locatie: schrijf ons, wij begeleiden je.",
    contactEmailLabel: "E-mail",
    contactSiteLabel: "Moedersite",

    finalEyebrow: "Begin nu",
    finalH2: "Verminder fouten, tijd en operationele kosten.",
    finalBody:
      "Zie live hoe het werkt op jouw locatie. We laten de flow bestelling → keuken → voorraad → kamer in 20 minuten zien.",
    finalListHeader: "Wat je krijgt",
    finalList: [
      "Operationeel dashboard klaar voor gebruik",
      "Restaurant, keuken, voorraad en hotel gesynchroniseerd",
      "Restaurant-op-kamer factureren (één folio)",
      "Automatische suggesties leveranciersbestellingen",
      "Begeleide onboarding + directe ondersteuning",
    ],
    finalCtaPrimary: "Vraag een demo aan",
    finalCtaSecondary: "Inloggen",
    finalNote: "RistoSaaS is onderdeel van het ecosysteem gestionesemplificata.com.",

    navComeFunziona: "Hoe het werkt",
    navFunzioni: "Functies",
    navIntegrato: "Geïntegreerd",
    navDemo: "Demo",
    navLogin: "Inloggen",
    footerFunctions: "Functies",
    footerIntegrated: "Geïntegreerd systeem",
    footerRestaurant: "Restaurantsoftware",
    footerBlog: "Blog",
    footerDemo: "Demo",
    footerRights: "Alle rechten voorbehouden.",
  },
};

/* ─── PILLAR PAGE ──────────────────────────────── */

export const PILLAR_COPY: Record<Locale, PillarCopy> = {
  it: {
    slug: "gestionale-ristorante-hotel-integrato",
    title: "Gestionale Ristorante e Hotel Integrato | Software Unico Horeca",
    description:
      "Software gestionale per ristorante e hotel: ordini, cucina, camere e magazzino in un unico sistema integrato.",
    keywords: [
      "gestionale ristorante e hotel integrato",
      "software unico horeca",
      "gestionale ristorante hotel",
      "addebito ristorante camera",
      "folio unico ospite",
      "magazzino ristorante automatico",
    ],
    eyebrow: "Pillar · Sistema integrato",
    h1: "Software gestionale ristorante e hotel integrato",
    lead:
      "Un unico sistema per gestire ristorante e hotel elimina errori, doppie registrazioni e perdita di tempo. Tutto è collegato: dalla sala alla cucina, fino alle camere.",
    ctaDemo: "Richiedi demo",
    ctaAccess: "Prova accesso",
    demoMailSubject: "RistoSaaS – Richiesta demo",
    demoMailBody: "Vorrei una demo del gestionale integrato RistoSaaS.",

    howItWorksH2: "Come funziona l'integrazione",
    howItWorksLead:
      "Ogni azione in un modulo aggiorna automaticamente gli altri. Nessun passaggio manuale.",
    flows: [
      {
        h3Start: "Ristorante",
        h3End: "Hotel",
        body: "Il cliente mangia al ristorante e il conto viene caricato direttamente sulla camera. Un solo folio al check-out, con voci hotel e ristorante unificate.",
      },
      {
        h3Start: "Cucina",
        h3End: "Magazzino",
        body: "Ogni piatto preparato aggiorna automaticamente le scorte. Niente conteggi manuali, niente inventari bloccati il lunedì mattina.",
      },
      {
        h3Start: "Magazzino",
        h3End: "Fornitori",
        body: "Quando le scorte scendono sotto soglia, il sistema suggerisce un ordine fornitore con quantità consigliate e invia PDF via email.",
      },
    ],

    featuresH2: "Funzionalità principali",
    featureBlocks: [
      {
        title: "Gestione ristorante",
        items: ["Tavoli e planimetria sala", "Ordini collegati alla cucina", "Cucina (KDS) con stato corsi", "Cassa e chiusura conto"],
      },
      {
        title: "Gestione hotel",
        items: ["Prenotazioni", "Camere e availability", "Folio cliente unificato", "Check-in / check-out"],
      },
      {
        title: "Magazzino",
        items: ["Scorte e alert sotto soglia", "Ordini fornitori", "Ricezione merce con carico automatico", "Report acquisti"],
      },
    ],

    forWhoH2: "Per chi è",
    forWhoItems: [
      { title: "Ristoranti con hotel", body: "Ristoranti che offrono anche ospitalità e devono gestire folio unico e camera charge." },
      { title: "Hotel con ristorante interno", body: "Hotel con sala ristorante, colazione, mezza pensione o pensione completa." },
      { title: "Strutture horeca complete", body: "Agriturismi, resort, country house con più punti vendita interni." },
    ],

    benefitsH2: "Vantaggi concreti",
    benefits: [
      { title: "Meno errori operativi", body: "Zero trascrizioni manuali tra moduli." },
      { title: "Meno software da gestire", body: "Un solo sistema, una sola licenza." },
      { title: "Maggiore controllo", body: "Dati in tempo reale, accessibili ovunque." },
      { title: "Dati centralizzati", body: "Multi-tenant, backup, audit trail." },
    ],

    finalH2: "Richiedi una demo e vedi come funziona dal vivo",
    finalBody:
      "Ti mostriamo il flusso completo in 20 minuti: ordine in sala, KDS in cucina, scarico magazzino, addebito su camera, check-out con folio unico.",
    finalDemoCta: "Richiedi demo",
    finalAccessCta: "Prova accesso",
  },

  en: {
    slug: "integrated-restaurant-hotel-management-software",
    title: "Integrated Restaurant & Hotel Management Software | All-in-One Horeca",
    description:
      "Management software for restaurant and hotel: orders, kitchen, rooms and inventory in a single integrated system.",
    keywords: [
      "integrated restaurant hotel management software",
      "all-in-one horeca software",
      "restaurant hotel management",
      "restaurant to room charge",
      "single guest folio",
      "automatic restaurant inventory",
    ],
    eyebrow: "Pillar · Integrated system",
    h1: "Integrated restaurant and hotel management software",
    lead:
      "A single system to manage restaurant and hotel removes errors, double registration and wasted time. Everything is connected: from dining room to kitchen, to rooms.",
    ctaDemo: "Request a demo",
    ctaAccess: "Try access",
    demoMailSubject: "RistoSaaS – Demo request",
    demoMailBody: "I would like a demo of the RistoSaaS integrated system.",

    howItWorksH2: "How the integration works",
    howItWorksLead: "Every action in one module automatically updates the others. No manual steps.",
    flows: [
      {
        h3Start: "Restaurant",
        h3End: "Hotel",
        body: "The guest eats at the restaurant and the bill is charged directly to the room. One folio at check-out, with unified hotel and restaurant items.",
      },
      {
        h3Start: "Kitchen",
        h3End: "Inventory",
        body: "Every prepared dish automatically updates stock. No manual counts, no Monday-morning frozen inventories.",
      },
      {
        h3Start: "Inventory",
        h3End: "Suppliers",
        body: "When stock drops below threshold, the system suggests a supplier order with recommended quantities and sends PDF via email.",
      },
    ],

    featuresH2: "Main features",
    featureBlocks: [
      {
        title: "Restaurant management",
        items: ["Tables and floor plan", "Orders connected to the kitchen", "Kitchen (KDS) with course status", "POS and check closing"],
      },
      {
        title: "Hotel management",
        items: ["Reservations", "Rooms and availability", "Unified guest folio", "Check-in / check-out"],
      },
      {
        title: "Inventory",
        items: ["Stock and low-threshold alerts", "Supplier orders", "Goods receipt with automatic stock-in", "Purchasing reports"],
      },
    ],

    forWhoH2: "Who it is for",
    forWhoItems: [
      { title: "Restaurants with rooms", body: "Restaurants that also offer hospitality and need a single folio and room charge." },
      { title: "Hotels with internal restaurant", body: "Hotels with a restaurant room, breakfast, half board or full board." },
      { title: "Full horeca properties", body: "Agriturismo, resorts, country houses with multiple internal outlets." },
    ],

    benefitsH2: "Concrete benefits",
    benefits: [
      { title: "Fewer operational errors", body: "Zero manual transcription between modules." },
      { title: "Fewer tools to manage", body: "One system, one license." },
      { title: "Better control", body: "Real-time data, accessible anywhere." },
      { title: "Centralized data", body: "Multi-tenant, backup, audit trail." },
    ],

    finalH2: "Request a demo and see it live",
    finalBody:
      "We walk you through the full flow in 20 minutes: order from the floor, KDS in the kitchen, inventory deduction, room charging, check-out with single folio.",
    finalDemoCta: "Request a demo",
    finalAccessCta: "Try access",
  },

  nl: {
    slug: "geintegreerde-restaurant-hotel-beheersoftware",
    title: "Geïntegreerde Restaurant- en Hotelbeheersoftware | Alles-in-één Horeca",
    description:
      "Beheersoftware voor restaurant en hotel: bestellingen, keuken, kamers en voorraad in één geïntegreerd systeem.",
    keywords: [
      "geintegreerde restaurant hotel beheersoftware",
      "alles in een horeca software",
      "restaurant hotel beheer",
      "restaurant op kamer facturering",
      "een gastfolio",
      "automatische restaurant voorraad",
    ],
    eyebrow: "Pillar · Geïntegreerd systeem",
    h1: "Geïntegreerde restaurant- en hotelbeheersoftware",
    lead:
      "Eén systeem voor restaurant en hotel elimineert fouten, dubbele registratie en tijdverlies. Alles is verbonden: van de zaal tot de keuken, tot de kamers.",
    ctaDemo: "Vraag een demo aan",
    ctaAccess: "Probeer toegang",
    demoMailSubject: "RistoSaaS – Demo-aanvraag",
    demoMailBody: "Ik wil graag een demo van het geïntegreerde RistoSaaS-systeem.",

    howItWorksH2: "Hoe de integratie werkt",
    howItWorksLead: "Elke actie in één module werkt de andere automatisch bij. Geen handmatige stappen.",
    flows: [
      {
        h3Start: "Restaurant",
        h3End: "Hotel",
        body: "De gast eet in het restaurant en de rekening wordt direct op de kamer geboekt. Eén folio bij check-out, met hotel- en restaurantposten verenigd.",
      },
      {
        h3Start: "Keuken",
        h3End: "Voorraad",
        body: "Elk bereid gerecht werkt automatisch de voorraad bij. Geen handmatige tellingen, geen bevroren inventaris op maandagochtend.",
      },
      {
        h3Start: "Voorraad",
        h3End: "Leveranciers",
        body: "Als voorraad onder de drempel zakt, suggereert het systeem een leveranciersbestelling met aanbevolen hoeveelheden en verstuurt PDF per e-mail.",
      },
    ],

    featuresH2: "Belangrijkste functies",
    featureBlocks: [
      {
        title: "Restaurantbeheer",
        items: ["Tafels en zaalplan", "Bestellingen gekoppeld aan de keuken", "Keuken (KDS) met gangstatus", "Kassa en rekening afsluiten"],
      },
      {
        title: "Hotelbeheer",
        items: ["Reserveringen", "Kamers en beschikbaarheid", "Verenigd gastfolio", "Check-in / check-out"],
      },
      {
        title: "Voorraad",
        items: ["Stock en lage-drempelalerts", "Leveranciersbestellingen", "Goederenontvangst met automatische inboeking", "Inkooprapporten"],
      },
    ],

    forWhoH2: "Voor wie het is",
    forWhoItems: [
      { title: "Restaurants met kamers", body: "Restaurants die ook hospitality aanbieden en één folio en kamerrekening nodig hebben." },
      { title: "Hotels met intern restaurant", body: "Hotels met restaurantzaal, ontbijt, halfpension of volpension." },
      { title: "Volledige horecalocaties", body: "Agriturismo, resorts, country houses met meerdere interne outlets." },
    ],

    benefitsH2: "Concrete voordelen",
    benefits: [
      { title: "Minder operationele fouten", body: "Nul handmatige overschrijving tussen modules." },
      { title: "Minder tools te beheren", body: "Eén systeem, één licentie." },
      { title: "Betere controle", body: "Realtime data, overal toegankelijk." },
      { title: "Centrale data", body: "Multi-tenant, back-up, audit trail." },
    ],

    finalH2: "Vraag een demo aan en zie het live",
    finalBody:
      "We laten de volledige flow in 20 minuten zien: bestelling vanuit de zaal, KDS in de keuken, voorraadaftrek, kamerfacturering, check-out met één folio.",
    finalDemoCta: "Vraag een demo aan",
    finalAccessCta: "Probeer toegang",
  },
};

/* ─── RESTAURANT PAGE ─────────────────────────── */

export const RESTAURANT_COPY: Record<Locale, RestaurantCopy> = {
  it: {
    slug: "gestionale-ristorante",
    title: "Gestionale Ristorante Cloud | Ordini, Cucina, Magazzino",
    description:
      "Software gestionale per ristorante: tavoli, ordini collegati alla cucina, stato piatti e integrazione magazzino. Cloud, multi-device, in un unico sistema.",
    keywords: [
      "gestionale ristorante",
      "gestionale ristorante cloud",
      "software cucina KDS",
      "gestione tavoli ristorante",
      "ordini sala cucina",
    ],
    eyebrow: "Ristorante",
    h1: "Software gestionale per ristorante",
    lead:
      "Dalla presa comanda al conto chiuso: tutto collegato, tutto tracciato. Sala, cucina e magazzino parlano la stessa lingua in tempo reale.",
    ctaDemo: "Richiedi demo",
    ctaAccess: "Prova accesso",
    demoMailSubject: "RistoSaaS – Demo ristorante",
    demoMailBody: "Vorrei una demo del gestionale ristorante.",

    whatIncludesH2: "Cosa include il gestionale ristorante",
    features: [
      {
        title: "Gestione tavoli",
        body: "Planimetria sala touch con drag & drop dei tavoli, stati colorati (libero, aperto, conto, da pulire), coperti e ordine corrente visibile a colpo d'occhio.",
        iconKey: "tables",
      },
      {
        title: "Ordini → cucina",
        body: "La comanda presa al tavolo arriva direttamente al KDS della cucina, suddivisa per corso e destinazione (cucina, pizzeria, bar). Nessuna carta, nessun fax.",
        iconKey: "orders",
      },
      {
        title: "Stato piatti",
        body: "In preparazione, pronto, servito. Ogni transizione è tracciata e visibile sia in cucina che in sala, con tempo di attesa per corso.",
        iconKey: "status",
      },
      {
        title: "Integrazione magazzino",
        body: "Ogni piatto servito scarica automaticamente gli ingredienti dal magazzino secondo la ricetta. Scorte aggiornate senza un solo click manuale.",
        iconKey: "warehouse",
      },
    ],

    crossLinkH2: "Cerchi un sistema unico per ristorante e hotel?",
    crossLinkBody:
      "Scopri il gestionale integrato con addebito ristorante su camera e folio unico ospite, pensato per strutture horeca complete.",
    crossLinkCta: "Scopri il sistema integrato",
  },

  en: {
    slug: "restaurant-management-software",
    title: "Cloud Restaurant Management Software | Orders, Kitchen, Inventory",
    description:
      "Restaurant management software: tables, orders connected to the kitchen, dish status and inventory integration. Cloud, multi-device, in a single system.",
    keywords: [
      "restaurant management software",
      "cloud restaurant software",
      "KDS kitchen software",
      "table management restaurant",
      "floor to kitchen orders",
    ],
    eyebrow: "Restaurant",
    h1: "Restaurant management software",
    lead:
      "From order taking to closed check: everything connected, everything tracked. Floor, kitchen and inventory speak the same language in real time.",
    ctaDemo: "Request a demo",
    ctaAccess: "Try access",
    demoMailSubject: "RistoSaaS – Restaurant demo",
    demoMailBody: "I would like a demo of the restaurant management software.",

    whatIncludesH2: "What the restaurant system includes",
    features: [
      {
        title: "Table management",
        body: "Touch floor plan with drag & drop, color-coded statuses (free, open, check, cleanup), covers and current order at a glance.",
        iconKey: "tables",
      },
      {
        title: "Orders → kitchen",
        body: "The order taken at the table reaches the kitchen KDS directly, split by course and destination (kitchen, pizzeria, bar). No paper, no fax.",
        iconKey: "orders",
      },
      {
        title: "Dish status",
        body: "In prep, ready, served. Every transition is tracked and visible both in the kitchen and on the floor, with waiting time per course.",
        iconKey: "status",
      },
      {
        title: "Inventory integration",
        body: "Every served dish automatically deducts ingredients from inventory per the recipe. Stock updated without a single manual click.",
        iconKey: "warehouse",
      },
    ],

    crossLinkH2: "Looking for a single system for restaurant and hotel?",
    crossLinkBody:
      "Discover the integrated system with restaurant-to-room charging and single guest folio, designed for full hospitality properties.",
    crossLinkCta: "Discover the integrated system",
  },

  nl: {
    slug: "restaurant-beheersoftware",
    title: "Cloud Restaurantbeheersoftware | Bestellingen, Keuken, Voorraad",
    description:
      "Restaurantbeheersoftware: tafels, bestellingen gekoppeld aan de keuken, gerechtstatus en voorraadintegratie. Cloud, multi-device, in één systeem.",
    keywords: [
      "restaurantbeheersoftware",
      "cloud restaurantsoftware",
      "KDS keukensoftware",
      "tafelbeheer restaurant",
      "zaal naar keuken bestellingen",
    ],
    eyebrow: "Restaurant",
    h1: "Restaurantbeheersoftware",
    lead:
      "Van bestelopname tot afgesloten rekening: alles verbonden, alles gevolgd. Zaal, keuken en voorraad spreken dezelfde taal, realtime.",
    ctaDemo: "Vraag een demo aan",
    ctaAccess: "Probeer toegang",
    demoMailSubject: "RistoSaaS – Restaurantdemo",
    demoMailBody: "Ik wil graag een demo van de restaurantbeheersoftware.",

    whatIncludesH2: "Wat het restaurantsysteem bevat",
    features: [
      {
        title: "Tafelbeheer",
        body: "Touch zaalplan met drag & drop, kleurgecodeerde statussen (vrij, open, rekening, schoonmaken), couverts en actuele bestelling in één oogopslag.",
        iconKey: "tables",
      },
      {
        title: "Bestellingen → keuken",
        body: "De bestelling aan tafel bereikt direct de keuken-KDS, gesplitst per gang en bestemming (keuken, pizzeria, bar). Geen papier, geen fax.",
        iconKey: "orders",
      },
      {
        title: "Gerechtstatus",
        body: "In voorbereiding, klaar, geserveerd. Elke overgang wordt gevolgd en is zowel in de keuken als in de zaal zichtbaar, met wachttijd per gang.",
        iconKey: "status",
      },
      {
        title: "Voorraadintegratie",
        body: "Elk geserveerd gerecht trekt automatisch ingrediënten van voorraad af volgens het recept. Voorraad bijgewerkt zonder één handmatige klik.",
        iconKey: "warehouse",
      },
    ],

    crossLinkH2: "Zoek je één systeem voor restaurant en hotel?",
    crossLinkBody:
      "Ontdek het geïntegreerde systeem met restaurant-op-kamer facturering en één gastfolio, ontworpen voor volledige hospitality-locaties.",
    crossLinkCta: "Ontdek het geïntegreerde systeem",
  },
};

/* ─── BLOG INDEX ──────────────────────────────── */

export const BLOG_INDEX_COPY: Record<Locale, BlogIndexCopy> = {
  it: {
    title: "Blog | Gestionale ristorante e hotel integrato",
    description:
      "Guide, approfondimenti e best practice per gestire ristorante, cucina, magazzino e hotel con un sistema integrato.",
    eyebrow: "Blog",
    h1: "Guide pratiche per ristorante e hotel",
    lead:
      "Approfondimenti operativi su come scegliere un gestionale, gestire il magazzino in modo integrato, collegare ristorante e hotel senza doppie registrazioni.",
    readLinkLabel: "Leggi l'articolo",
    minLabel: "min",
  },
  en: {
    title: "Blog | Integrated Restaurant & Hotel Management",
    description:
      "Guides, deep-dives and best practices to manage restaurant, kitchen, inventory and hotel with an integrated system.",
    eyebrow: "Blog",
    h1: "Practical guides for restaurant and hotel",
    lead:
      "Operational insights on how to choose a management system, run inventory in an integrated way, connect restaurant and hotel without double registration.",
    readLinkLabel: "Read the article",
    minLabel: "min",
  },
  nl: {
    title: "Blog | Geïntegreerd Restaurant- en Hotelbeheer",
    description:
      "Gidsen, verdiepingen en best practices om restaurant, keuken, voorraad en hotel met een geïntegreerd systeem te beheren.",
    eyebrow: "Blog",
    h1: "Praktische gidsen voor restaurant en hotel",
    lead:
      "Operationele inzichten over hoe een beheersysteem kiezen, voorraad geïntegreerd runnen, restaurant en hotel verbinden zonder dubbele registratie.",
    readLinkLabel: "Lees het artikel",
    minLabel: "min",
  },
};

/* ─── BLOG POSTS ──────────────────────────────── */

export const BLOG_POSTS_COPY: Record<Locale, BlogPostCopy[]> = {
  it: [
    {
      slug: "come-scegliere-gestionale-ristorante",
      title: "Come scegliere un gestionale ristorante nel 2026",
      description:
        "Errori comuni, importanza dell'integrazione cucina-magazzino e perché conviene scegliere un sistema unico. Guida pratica 2026.",
      publishedAt: "2026-04-21",
      readingMinutes: 6,
      lead: [
        "Scegliere un gestionale ristorante nel 2026 significa decidere come lavorerà la tua struttura per i prossimi anni. La maggior parte degli errori che vediamo non deriva dal software scelto, ma dal fatto che le strutture acquistano software diversi per ristorante, magazzino e hotel, e poi cercano di farli comunicare tra loro.",
        "In questa guida raccogliamo gli errori più comuni, cosa guardare davvero quando valuti un gestionale e perché un sistema unico è quasi sempre la scelta più solida.",
      ],
      sections: [
        {
          heading: "Errori comuni: software separati che non si parlano",
          paragraphs: [
            "Il pattern più frequente nelle strutture che ci contattano è: un gestionale per il ristorante, uno per il magazzino, uno per le prenotazioni hotel e — spesso — un foglio Excel a fare da collante. Il risultato è che ogni cambiamento (nuovo piatto, nuovo fornitore, nuovo ospite) va registrato tre volte e le incoerenze emergono al momento sbagliato: in chiusura, durante un inventario, davanti a un cliente.",
            "Scegliere strumenti separati sembra più flessibile all'inizio, ma diventa ingestibile quando i dati crescono. Ogni integrazione in più è un punto di rottura in più.",
          ],
          bullets: [
            "Doppia registrazione di articoli e ricette",
            "Inventari non coerenti tra magazzino e ordini",
            "Impossibilità di sapere il food cost reale in tempo reale",
            "Clienti hotel che consumano al ristorante senza che la camera se ne accorga",
          ],
        },
        {
          heading: "L'integrazione cucina è fondamentale",
          paragraphs: [
            "Un gestionale ristorante moderno deve collegare sala e cucina (KDS) senza carta, senza fax, senza reinserimenti. La comanda presa al tavolo deve arrivare direttamente al monitor della brigata, suddivisa per corso e destinazione (cucina, pizzeria, bar), con stato (in preparazione, pronto, servito) tracciato automaticamente.",
            "Senza questa integrazione, il tempo risparmiato in sala viene perso in cucina — e viceversa. Il miglior indicatore di qualità di un gestionale è la fluidità di questo passaggio.",
          ],
        },
        {
          heading: "Il magazzino deve essere automatico",
          paragraphs: [
            "Se per sapere cosa c'è in magazzino devi aprire un altro software, il tuo gestionale ristorante non è abbastanza integrato. Ogni piatto servito dovrebbe scaricare automaticamente gli ingredienti dal magazzino secondo la ricetta, e il food cost dovrebbe aggiornarsi in tempo reale.",
            "Un buon gestionale ristorante oggi include suggerimento automatico degli ordini fornitore quando le scorte scendono sotto soglia, invio PDF dell'ordine via email e ricezione merce con carico automatico in stock.",
          ],
        },
        {
          heading: "Conclusione: sistema unico o sistema integrato",
          paragraphs: [
            "Se gestisci solo un ristorante senza ospitalità, hai due opzioni: un gestionale verticale molto specializzato oppure un sistema più ampio che include anche magazzino e CRM. Se invece gestisci una struttura horeca completa (ristorante più hotel, ristorante più asporto, agriturismo, ecc.), la scelta è quasi obbligata: un sistema unico.",
            "La differenza la fanno pochi dettagli: quanto tempo ti serve per insegnarlo al personale, quanti click separano la comanda dallo stato magazzino, quanto è realistica la chiusura di giornata alla fine del turno.",
          ],
        },
      ],
      conclusion:
        "Vuoi vedere come un sistema unico gestisce in concreto il flusso ordine → cucina → magazzino? Richiedi una demo di RistoSaaS: ti mostriamo il percorso completo in 20 minuti sulla tua struttura reale.",
      related: ["gestionale-ristorante-magazzino-integrato", "software-hotel-ristorante-vantaggi"],
    },
    {
      slug: "gestionale-ristorante-magazzino-integrato",
      title: "Gestionale ristorante con magazzino: perché è fondamentale",
      description:
        "Sprechi, errori di inventario e ordini fornitore manuali: perché un magazzino integrato nel gestionale ristorante fa la differenza sul margine.",
      publishedAt: "2026-04-21",
      readingMinutes: 5,
      lead: [
        "Il magazzino è il punto dove i ristoranti perdono più margine e dove, paradossalmente, usano gli strumenti meno sofisticati. Spesso si lavora con un foglio Excel aggiornato a mano, un inventario settimanale a vista e ordini fornitore inviati quando qualcuno se ne ricorda.",
        "Un gestionale ristorante con magazzino integrato cambia radicalmente il quadro. Ecco dove si vede la differenza.",
      ],
      sections: [
        {
          heading: "Sprechi: capire dove finisce davvero il cibo",
          paragraphs: [
            "Senza un magazzino integrato, gli sprechi restano invisibili. Sai che compri 10 kg di pomodoro a settimana, ma non sai quanti finiscono in sughi, quanti vengono buttati perché scaduti, quanti spariscono senza una spiegazione precisa.",
            "Un magazzino collegato alla cucina scarica automaticamente gli ingredienti quando un piatto viene servito. La differenza tra consumo teorico (ricetta × piatti serviti) e consumo reale (carichi meno giacenza) è il tuo spreco. Averlo sotto gli occhi ogni giorno è un cambio di paradigma.",
          ],
        },
        {
          heading: "Errori inventario: inventari lunedì mattina, addio",
          paragraphs: [
            "Quando il magazzino è separato dal gestionale, l'inventario diventa un'operazione manuale settimanale o mensile. Conti pesi, scrivi quantità, aggiorni un foglio. Gli errori si accumulano e a fine mese i numeri non tornano.",
            "Con un sistema integrato l'inventario teorico è sempre allineato al consumo reale. Il conteggio fisico serve solo come verifica periodica (mensile o trimestrale), non come operazione quotidiana. Il personale si libera di un lavoro noioso e soggetto a errori.",
          ],
          bullets: [
            "Giacenze aggiornate in tempo reale",
            "Alert automatico quando una scorta scende sotto soglia",
            "Costo medio ponderato aggiornato automaticamente",
            "Storico movimenti filtrabile per periodo, fornitore, articolo",
          ],
        },
        {
          heading: "Ordini manuali vs ordini automatici",
          paragraphs: [
            "Gli ordini fornitore manuali sono la fonte principale di errore operativo: ordini doppi, ordini dimenticati, quantità sbagliate, fornitore chiamato per urgenza a un prezzo superiore. Un magazzino integrato trasforma questo flusso.",
            "Quando un articolo scende sotto soglia, il sistema propone un ordine con quantità consigliata basata sul consumo medio recente. Tu confermi, invii PDF via email al fornitore con un click, registri la ricezione merce quando arriva e il magazzino si aggiorna automaticamente. Zero trascrizioni.",
          ],
        },
      ],
      conclusion:
        "Il ROI di un gestionale ristorante con magazzino integrato si misura nei primi 2-3 mesi di utilizzo, soprattutto sul controllo degli sprechi. Richiedi una demo per vedere il flusso completo su RistoSaaS.",
      related: ["come-scegliere-gestionale-ristorante", "software-hotel-ristorante-vantaggi"],
    },
    {
      slug: "software-hotel-ristorante-vantaggi",
      title: "Software hotel e ristorante integrato: vantaggi reali",
      description:
        "Addebito su camera, flussi unificati, meno errori operativi: i vantaggi reali di un software che gestisce hotel e ristorante nello stesso sistema.",
      publishedAt: "2026-04-21",
      readingMinutes: 5,
      lead: [
        "Se gestisci una struttura con ristorante interno (hotel, agriturismo, resort, country house), probabilmente hai già incontrato il problema: software PMS per l'hotel da una parte, gestionale ristorante dall'altra, e il personale a fare da ponte per chiudere il conto del cliente.",
        "Un software hotel e ristorante integrato risolve questo alla radice. Vediamo i vantaggi reali.",
      ],
      sections: [
        {
          heading: "Addebito su camera (room charge) senza trascrizioni",
          paragraphs: [
            "In una struttura integrata, il cameriere al ristorante può addebitare la consumazione direttamente alla camera dell'ospite interno con un click. Nessuno stampa uno scontrino, nessuno annota il numero camera, nessuno lo trasferisce al PMS. Il folio dell'ospite viene aggiornato in tempo reale e al check-out l'ospite paga un conto unico.",
            "Per strutture con mezza pensione o pensione completa, il sistema tiene traccia anche dei crediti pasto (meal plan credits): se l'ospite ha pagato la mezza pensione e consuma la cena inclusa, il sistema scala automaticamente il credito; se consuma qualcosa in più, la differenza va a carico della camera.",
          ],
        },
        {
          heading: "Flussi unificati: un solo processo, un solo report",
          paragraphs: [
            "Con software separati, i report di fine giornata sono due: uno del ristorante, uno dell'hotel. Confrontarli richiede tempo e genera sempre incoerenze (incasso ristorante diverso dall'imputato su camera, ecc.).",
            "In un sistema integrato la chiusura di giornata è unica: incassi ristorante, incassi hotel, addebiti camera, folio aperti, food cost reale, costi staff. Tutto in una sola schermata, con dati coerenti perché provengono dalla stessa fonte.",
          ],
          bullets: [
            "Chiusura Z unica ristorante + hotel",
            "Report incassi per metodo pagamento (contanti, carta, addebito camera)",
            "KPI supervisor con margine operativo reale",
            "Forecast 7/30 giorni basato su dati storici integrati",
          ],
        },
        {
          heading: "Meno errori, meno personale dedicato al back-office",
          paragraphs: [
            "Il vantaggio meno visibile ma più importante è operativo: meno ore spese ogni settimana a far quadrare i conti tra sistemi diversi. Il personale amministrativo torna a lavorare sul controllo di gestione invece che sulla riconciliazione manuale.",
            "Per strutture medie-piccole questo significa spesso liberare mezza giornata di lavoro amministrativo a settimana. Per strutture più grandi, si traduce in meno risorse dedicate alla riconciliazione e più al controllo di qualità.",
          ],
        },
      ],
      conclusion:
        "Se gestisci hotel con ristorante o ristorante con ospitalità, un software integrato è quasi sempre la scelta giusta. Richiedi una demo di RistoSaaS e verifica il flusso addebito-su-camera in tempo reale sulla tua struttura.",
      related: ["gestionale-ristorante-magazzino-integrato", "come-scegliere-gestionale-ristorante"],
    },
  ],

  en: [
    {
      slug: "how-to-choose-restaurant-management-software",
      title: "How to choose a restaurant management system in 2026",
      description:
        "Common mistakes, why kitchen-inventory integration matters, and why a single system is the safer choice. Practical 2026 guide.",
      publishedAt: "2026-04-21",
      readingMinutes: 6,
      lead: [
        "Choosing restaurant management software in 2026 means deciding how your property will work for the next years. Most errors we see come not from the software chosen but from the fact that properties buy separate tools for restaurant, inventory and hotel, and then try to glue them together.",
        "This guide covers the most common mistakes, what to actually look for when evaluating a system, and why a single integrated system is almost always the solid choice.",
      ],
      sections: [
        {
          heading: "Common mistakes: separate tools that don't talk",
          paragraphs: [
            "The most frequent pattern in the properties that contact us is: one system for the restaurant, one for inventory, one for hotel reservations and — often — an Excel sheet as glue. The result is that every change (new dish, new supplier, new guest) must be registered three times and inconsistencies emerge at the wrong time: at closing, during an inventory count, in front of a customer.",
            "Choosing separate tools seems more flexible at first, but becomes unmanageable as data grows. Every extra integration is one more breaking point.",
          ],
          bullets: [
            "Double registration of items and recipes",
            "Inconsistent inventories between stock and orders",
            "No real-time food cost visibility",
            "Hotel guests spending at the restaurant without the room being aware",
          ],
        },
        {
          heading: "Kitchen integration is essential",
          paragraphs: [
            "A modern restaurant management system must connect dining room and kitchen (KDS) without paper, without fax, without re-entering data. The order taken at the table must reach the kitchen display directly, split by course and destination (kitchen, pizzeria, bar), with status (in prep, ready, served) tracked automatically.",
            "Without this integration, time saved on the floor is lost in the kitchen — and vice versa. The best quality indicator of a system is how smoothly this handoff works.",
          ],
        },
        {
          heading: "Inventory must be automatic",
          paragraphs: [
            "If you need to open another tool to know what is in inventory, your restaurant system is not integrated enough. Every served dish should automatically deduct ingredients from stock per the recipe, and food cost should update in real time.",
            "A good restaurant management system today includes automatic supplier reorder suggestions when stock drops below threshold, PDF order sent by email, and goods receipt with automatic stock-in.",
          ],
        },
        {
          heading: "Conclusion: single system or integrated system",
          paragraphs: [
            "If you only run a restaurant without hospitality, you have two options: a very specialized vertical system or a broader one that includes inventory and CRM. If instead you run a full hospitality property (restaurant + hotel, restaurant + takeaway, agriturismo, etc.), the choice is almost forced: a single system.",
            "The difference is in the details: how long you need to train staff, how many clicks separate order from inventory status, how realistic day closing is at the end of shift.",
          ],
        },
      ],
      conclusion:
        "Want to see how a single system actually runs the order → kitchen → inventory flow? Request a demo of RistoSaaS: we walk through the whole path in 20 minutes on your real property.",
      related: ["restaurant-software-with-inventory", "hotel-restaurant-software-benefits"],
    },
    {
      slug: "restaurant-software-with-inventory",
      title: "Restaurant software with inventory: why it matters",
      description:
        "Waste, inventory errors and manual supplier orders: why an integrated inventory in your restaurant system changes your margin.",
      publishedAt: "2026-04-21",
      readingMinutes: 5,
      lead: [
        "Inventory is the point where restaurants lose most margin and, paradoxically, where the least sophisticated tools are used. Often an Excel sheet updated by hand, a weekly eyeballed inventory and supplier orders sent when someone remembers.",
        "A restaurant system with integrated inventory changes the picture radically. Here's where the difference shows.",
      ],
      sections: [
        {
          heading: "Waste: knowing where food actually goes",
          paragraphs: [
            "Without integrated inventory, waste stays invisible. You know you buy 10 kg of tomato per week, but not how many end up in sauces, how many get thrown away expired, how many disappear with no clear reason.",
            "An inventory connected to the kitchen deducts ingredients automatically when a dish is served. The difference between theoretical consumption (recipe × served dishes) and actual consumption (stock-in minus on-hand) is your waste. Having it on the dashboard every day is a paradigm shift.",
          ],
        },
        {
          heading: "Inventory errors: goodbye Monday-morning inventories",
          paragraphs: [
            "When inventory is separate from the management system, counting becomes a weekly or monthly manual operation. Weights, quantities, spreadsheet updates. Errors pile up and month-end numbers don't match.",
            "With an integrated system the theoretical inventory is always aligned with actual consumption. Physical counting is only a periodic check (monthly or quarterly), not a daily operation. Staff get rid of a tedious error-prone task.",
          ],
          bullets: [
            "Real-time stock on hand",
            "Automatic alert when stock drops below threshold",
            "Weighted average cost updated automatically",
            "Movement history filterable by period, supplier, item",
          ],
        },
        {
          heading: "Manual orders vs automatic orders",
          paragraphs: [
            "Manual supplier orders are the main source of operational error: duplicate orders, forgotten orders, wrong quantities, supplier called in emergency at higher price. Integrated inventory transforms this flow.",
            "When an item drops below threshold, the system proposes an order with recommended quantity based on recent average consumption. You confirm, send PDF by email with one click, register goods receipt when it arrives and inventory updates automatically. Zero transcription.",
          ],
        },
      ],
      conclusion:
        "The ROI of a restaurant system with integrated inventory is measurable in the first 2-3 months of use, especially on waste control. Request a demo to see the full flow on RistoSaaS.",
      related: ["how-to-choose-restaurant-management-software", "hotel-restaurant-software-benefits"],
    },
    {
      slug: "hotel-restaurant-software-benefits",
      title: "Integrated hotel and restaurant software: real benefits",
      description:
        "Room charge, unified flows, fewer operational errors: the real benefits of software that manages hotel and restaurant in the same system.",
      publishedAt: "2026-04-21",
      readingMinutes: 5,
      lead: [
        "If you run a property with an internal restaurant (hotel, agriturismo, resort, country house), you have probably hit the problem already: a PMS for the hotel on one side, a restaurant system on the other, and staff acting as a bridge to close the guest's bill.",
        "Integrated hotel and restaurant software solves this at the root. Here are the real benefits.",
      ],
      sections: [
        {
          heading: "Room charge without transcription",
          paragraphs: [
            "In an integrated property, the waiter at the restaurant can charge the spend directly to the internal guest's room with one click. No one prints a receipt, no one writes down the room number, no one transfers it to the PMS. The guest folio updates in real time and at check-out the guest pays a single bill.",
            "For properties with half board or full board, the system also tracks meal plan credits: if the guest has paid half board and consumes the included dinner, the system deducts the credit automatically; if they consume more, the difference is charged to the room.",
          ],
        },
        {
          heading: "Unified flows: one process, one report",
          paragraphs: [
            "With separate tools, end-of-day reports are two: one for the restaurant, one for the hotel. Comparing them takes time and always surfaces inconsistencies (restaurant revenue different from room-charged, etc.).",
            "In an integrated system day closing is unique: restaurant revenue, hotel revenue, room charges, open folios, real food cost, staff cost. All in one screen, with consistent data because it comes from the same source.",
          ],
          bullets: [
            "Unified end-of-day closing: restaurant + hotel",
            "Revenue report by payment method (cash, card, room charge)",
            "Supervisor KPIs with real operating margin",
            "7/30-day forecast based on integrated historical data",
          ],
        },
        {
          heading: "Fewer errors, less back-office staff",
          paragraphs: [
            "The less visible but more important benefit is operational: fewer hours spent every week squaring numbers between different systems. Admin staff goes back to management control instead of manual reconciliation.",
            "For small-medium properties this often means freeing up half a day of admin work per week. For larger properties, it translates to fewer resources dedicated to reconciliation and more to quality control.",
          ],
        },
      ],
      conclusion:
        "If you run a hotel with a restaurant or a restaurant with hospitality, integrated software is almost always the right choice. Request a demo of RistoSaaS and verify the room-charge flow in real time on your property.",
      related: ["restaurant-software-with-inventory", "how-to-choose-restaurant-management-software"],
    },
  ],

  nl: [
    {
      slug: "hoe-kies-je-restaurantbeheersoftware",
      title: "Hoe kies je restaurantbeheersoftware in 2026",
      description:
        "Veelgemaakte fouten, het belang van keuken-voorraadintegratie en waarom één systeem de veiligere keuze is. Praktische gids 2026.",
      publishedAt: "2026-04-21",
      readingMinutes: 6,
      lead: [
        "Restaurantbeheersoftware kiezen in 2026 betekent beslissen hoe jouw locatie de komende jaren zal werken. De meeste fouten die we zien komen niet van de gekozen software, maar van het feit dat locaties losse tools kopen voor restaurant, voorraad en hotel en die dan aan elkaar proberen te lijmen.",
        "Deze gids behandelt de meest voorkomende fouten, waar je echt op moet letten bij het evalueren van een systeem, en waarom één geïntegreerd systeem bijna altijd de solide keuze is.",
      ],
      sections: [
        {
          heading: "Veelgemaakte fouten: losse tools die niet praten",
          paragraphs: [
            "Het meest frequente patroon bij de locaties die contact met ons opnemen is: één systeem voor het restaurant, één voor de voorraad, één voor hotelreserveringen en — vaak — een Excel-sheet als lijm. Het resultaat is dat elke wijziging (nieuw gerecht, nieuwe leverancier, nieuwe gast) driemaal geregistreerd moet worden en de inconsistenties komen op het verkeerde moment naar boven: bij afsluiting, tijdens een voorraadtelling, voor een klant.",
            "Aparte tools kiezen lijkt in het begin flexibeler, maar wordt onbeheersbaar als de data groeit. Elke extra integratie is één breekpunt meer.",
          ],
          bullets: [
            "Dubbele registratie van artikelen en recepten",
            "Inconsistente voorraden tussen stock en bestellingen",
            "Geen realtime zicht op food cost",
            "Hotelgasten die consumeren in het restaurant zonder dat de kamer dit weet",
          ],
        },
        {
          heading: "Keukenintegratie is essentieel",
          paragraphs: [
            "Een modern restaurantbeheersysteem moet zaal en keuken (KDS) verbinden zonder papier, zonder fax, zonder herinvoer. De bestelling aan tafel moet direct op de keukendisplay aankomen, gesplitst per gang en bestemming (keuken, pizzeria, bar), met status (in voorbereiding, klaar, geserveerd) automatisch gevolgd.",
            "Zonder deze integratie gaat de in de zaal bespaarde tijd verloren in de keuken — en andersom. De beste kwaliteitsindicator van een systeem is hoe soepel deze overdracht werkt.",
          ],
        },
        {
          heading: "De voorraad moet automatisch zijn",
          paragraphs: [
            "Als je een andere tool moet openen om te weten wat er in de voorraad zit, is jouw restaurantsysteem niet geïntegreerd genoeg. Elk geserveerd gerecht zou automatisch ingrediënten van voorraad moeten afschrijven volgens het recept, en food cost zou realtime moeten bijwerken.",
            "Een goed restaurantbeheersysteem vandaag omvat automatische suggesties voor leveranciersbestellingen wanneer voorraad onder de drempel zakt, PDF-bestelling per e-mail verstuurd, en goederenontvangst met automatische inboeking.",
          ],
        },
        {
          heading: "Conclusie: één systeem of geïntegreerd systeem",
          paragraphs: [
            "Als je alleen een restaurant runt zonder hospitality, heb je twee opties: een zeer gespecialiseerd verticaal systeem of een breder systeem dat ook voorraad en CRM omvat. Als je in plaats daarvan een volledige hospitality-locatie runt (restaurant + hotel, restaurant + afhaal, agriturismo, enz.), is de keuze bijna verplicht: één systeem.",
            "Het verschil zit in details: hoe lang je nodig hebt om het aan personeel te leren, hoeveel klikken bestelling van voorraadstatus scheiden, hoe realistisch de dagafsluiting aan het einde van de dienst is.",
          ],
        },
      ],
      conclusion:
        "Wil je zien hoe één systeem de flow bestelling → keuken → voorraad concreet uitvoert? Vraag een demo van RistoSaaS aan: we laten het hele pad in 20 minuten zien op jouw echte locatie.",
      related: ["restaurantsoftware-met-voorraad", "hotel-restaurant-software-voordelen"],
    },
    {
      slug: "restaurantsoftware-met-voorraad",
      title: "Restaurantsoftware met voorraad: waarom het essentieel is",
      description:
        "Verspilling, inventarisfouten en handmatige leveranciersbestellingen: waarom geïntegreerde voorraad in jouw restaurantsysteem je marge verandert.",
      publishedAt: "2026-04-21",
      readingMinutes: 5,
      lead: [
        "Voorraad is het punt waar restaurants de meeste marge verliezen en, paradoxaal genoeg, waar de minst geavanceerde tools worden gebruikt. Vaak een handmatig bijgewerkte Excel-sheet, een wekelijkse visuele inventarisatie en leveranciersbestellingen die verstuurd worden wanneer iemand eraan denkt.",
        "Een restaurantsysteem met geïntegreerde voorraad verandert het beeld radicaal. Hier is waar het verschil zichtbaar is.",
      ],
      sections: [
        {
          heading: "Verspilling: weten waar eten daadwerkelijk heen gaat",
          paragraphs: [
            "Zonder geïntegreerde voorraad blijft verspilling onzichtbaar. Je weet dat je 10 kg tomaten per week koopt, maar niet hoeveel in sauzen belanden, hoeveel verlopen weggegooid worden, hoeveel verdwijnen zonder duidelijke reden.",
            "Een voorraad gekoppeld aan de keuken schrijft ingrediënten automatisch af wanneer een gerecht wordt geserveerd. Het verschil tussen theoretisch verbruik (recept × geserveerde gerechten) en werkelijk verbruik (inkomend minus voorhanden) is jouw verspilling. Dat elke dag op het dashboard hebben is een paradigmaverandering.",
          ],
        },
        {
          heading: "Inventarisfouten: dag maandag-ochtend inventarisaties",
          paragraphs: [
            "Wanneer voorraad los staat van het beheersysteem, wordt tellen een wekelijkse of maandelijkse handmatige operatie. Gewichten, hoeveelheden, sheet-updates. Fouten stapelen zich op en de cijfers kloppen aan het einde van de maand niet.",
            "Met een geïntegreerd systeem is de theoretische voorraad altijd in lijn met werkelijk verbruik. Fysiek tellen is alleen een periodieke controle (maandelijks of kwartaal), geen dagelijkse operatie. Personeel wordt van een vervelende foutgevoelige taak bevrijd.",
          ],
          bullets: [
            "Realtime voorraad voorhanden",
            "Automatische alert wanneer voorraad onder de drempel zakt",
            "Gewogen gemiddelde kostprijs automatisch bijgewerkt",
            "Mutatiegeschiedenis filterbaar op periode, leverancier, artikel",
          ],
        },
        {
          heading: "Handmatige bestellingen vs automatische bestellingen",
          paragraphs: [
            "Handmatige leveranciersbestellingen zijn de belangrijkste bron van operationele fout: dubbele bestellingen, vergeten bestellingen, verkeerde hoeveelheden, leverancier in noodgeval gebeld tegen hogere prijs. Geïntegreerde voorraad transformeert deze flow.",
            "Wanneer een artikel onder de drempel zakt, stelt het systeem een bestelling voor met aanbevolen hoeveelheid op basis van recent gemiddeld verbruik. Jij bevestigt, verstuurt PDF per e-mail met één klik, registreert goederenontvangst bij aankomst en de voorraad werkt automatisch bij. Nul overschrijving.",
          ],
        },
      ],
      conclusion:
        "De ROI van een restaurantsysteem met geïntegreerde voorraad is meetbaar in de eerste 2-3 maanden gebruik, vooral bij verspillingscontrole. Vraag een demo aan om de volledige flow op RistoSaaS te zien.",
      related: ["hoe-kies-je-restaurantbeheersoftware", "hotel-restaurant-software-voordelen"],
    },
    {
      slug: "hotel-restaurant-software-voordelen",
      title: "Geïntegreerde hotel- en restaurantsoftware: echte voordelen",
      description:
        "Kamerrekening, verenigde flows, minder operationele fouten: de echte voordelen van software die hotel en restaurant in hetzelfde systeem beheert.",
      publishedAt: "2026-04-21",
      readingMinutes: 5,
      lead: [
        "Als je een locatie met intern restaurant runt (hotel, agriturismo, resort, country house), ben je waarschijnlijk al tegen het probleem aangelopen: een PMS voor het hotel aan de ene kant, een restaurantsysteem aan de andere kant, en personeel als brug om de rekening van de gast af te sluiten.",
        "Geïntegreerde hotel- en restaurantsoftware lost dit bij de wortel op. Hier zijn de echte voordelen.",
      ],
      sections: [
        {
          heading: "Kamerrekening zonder overschrijving",
          paragraphs: [
            "In een geïntegreerde locatie kan de ober in het restaurant het verbruik direct op de kamer van de interne gast boeken met één klik. Niemand print een bon, niemand noteert het kamernummer, niemand draagt het over aan de PMS. Het gastfolio werkt realtime bij en bij check-out betaalt de gast één enkele rekening.",
            "Voor locaties met halfpension of volpension volgt het systeem ook de meal plan credits: als de gast halfpension heeft betaald en het inbegrepen diner verbruikt, trekt het systeem het krediet automatisch af; als ze meer verbruiken, wordt het verschil op de kamer geboekt.",
          ],
        },
        {
          heading: "Verenigde flows: één proces, één rapport",
          paragraphs: [
            "Met losse tools zijn de einde-dag-rapporten twee: één voor het restaurant, één voor het hotel. Ze vergelijken kost tijd en levert altijd inconsistenties op (restaurantomzet verschillend van op-kamer-geboekt, enz.).",
            "In een geïntegreerd systeem is dagafsluiting uniek: restaurantomzet, hotelomzet, kamerboekingen, open folio's, werkelijke food cost, personeelskosten. Alles in één scherm, met consistente data omdat ze van dezelfde bron komen.",
          ],
          bullets: [
            "Verenigde einde-dag-afsluiting: restaurant + hotel",
            "Omzetrapport per betaalmethode (contant, kaart, kamerrekening)",
            "Supervisor KPI's met echte operationele marge",
            "Voorspelling 7/30 dagen op basis van geïntegreerde historische data",
          ],
        },
        {
          heading: "Minder fouten, minder back-office personeel",
          paragraphs: [
            "Het minder zichtbare maar belangrijkere voordeel is operationeel: minder uren per week besteed aan cijfers uitzoeken tussen verschillende systemen. Administratief personeel gaat terug naar management control in plaats van handmatige reconciliatie.",
            "Voor kleine-middelgrote locaties betekent dit vaak een halve dag admin-werk per week vrijmaken. Voor grotere locaties vertaalt het zich in minder resources aan reconciliatie en meer aan kwaliteitscontrole.",
          ],
        },
      ],
      conclusion:
        "Als je een hotel met restaurant of een restaurant met hospitality runt, is geïntegreerde software bijna altijd de juiste keuze. Vraag een demo van RistoSaaS aan en verifieer de kamerrekeningsflow realtime op jouw locatie.",
      related: ["restaurantsoftware-met-voorraad", "hoe-kies-je-restaurantbeheersoftware"],
    },
  ],
};

export function getBlogPost(locale: Locale, slug: string): BlogPostCopy | null {
  return BLOG_POSTS_COPY[locale].find((p) => p.slug === slug) ?? null;
}

export function getBlogSlugs(locale: Locale): string[] {
  return BLOG_POSTS_COPY[locale].map((p) => p.slug);
}

/** Mapping cross-lingua degli slug blog per hreflang alternates. */
export const BLOG_SLUG_ALTERNATES: Record<string, Partial<Record<Locale, string>>> = {
  choose: {
    it: "come-scegliere-gestionale-ristorante",
    en: "how-to-choose-restaurant-management-software",
    nl: "hoe-kies-je-restaurantbeheersoftware",
  },
  inventory: {
    it: "gestionale-ristorante-magazzino-integrato",
    en: "restaurant-software-with-inventory",
    nl: "restaurantsoftware-met-voorraad",
  },
  hotel: {
    it: "software-hotel-ristorante-vantaggi",
    en: "hotel-restaurant-software-benefits",
    nl: "hotel-restaurant-software-voordelen",
  },
};

export function getBlogAlternates(locale: Locale, slug: string): Partial<Record<Locale, string>> {
  for (const group of Object.values(BLOG_SLUG_ALTERNATES)) {
    if (group[locale] === slug) return group;
  }
  return {};
}
