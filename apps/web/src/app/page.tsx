import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { BrandTrustSection } from "@/components/landing/BrandTrustSection";
import { IntegrationFlowSection } from "@/components/landing/IntegrationFlowSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SoftwareApplicationJsonLd } from "@/components/landing/SoftwareApplicationJsonLd";

export const metadata: Metadata = {
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
  openGraph: {
    title: "Gestionale Ristorante e Hotel Integrato | Ordini, Cucina, Magazzino, Camere",
    description:
      "Software completo per ristorante e hotel: gestisci tavoli, cucina (KDS), magazzino, fornitori e camere in un unico sistema cloud.",
    type: "website",
    locale: "it_IT",
    siteName: "RistoSaaS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gestionale Ristorante e Hotel Integrato | RistoSaaS",
    description:
      "Ordini, cucina, magazzino, camere e fornitori in un unico sistema. Addebito ristorante su camera, scarico magazzino automatico.",
  },
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-landing-bg text-landing-ink">
      <SoftwareApplicationJsonLd />
      <LandingNavbar />
      <main>
        <HeroShowcase />
        <IntegrationFlowSection />
        <FeatureCards />
        <DashboardPreview />
        <BenefitsSection />
        <BrandTrustSection />
        <ContactSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
