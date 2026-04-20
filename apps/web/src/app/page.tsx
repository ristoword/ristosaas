import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { BrandTrustSection } from "@/components/landing/BrandTrustSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "RistoSaaS | Piattaforma all-in-one per ristoranti e hotel",
  description:
    "RistoSaaS è la piattaforma all-in-one per ristoranti e hotel firmata gestionesemplificata.com. Ordini live, prenotazioni, pagamenti e operatività in un'unica soluzione.",
  openGraph: {
    title: "RistoSaaS | Piattaforma all-in-one per ristoranti e hotel",
    description:
      "Ordini, hotel, pagamenti e operatività in un'unica piattaforma. Una soluzione firmata gestionesemplificata.com.",
    type: "website",
  },
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-landing-bg text-landing-ink">
      <LandingNavbar />
      <main>
        <HeroShowcase />
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
