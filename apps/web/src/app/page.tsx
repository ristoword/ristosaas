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
import { HOMEPAGE_COPY } from "@/core/i18n/seo-content";
import { homepageLanguages } from "@/core/i18n/locale-urls";

const copy = HOMEPAGE_COPY.it;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  keywords: copy.keywords,
  openGraph: {
    title: copy.title,
    description: copy.description,
    type: "website",
    locale: "it_IT",
    siteName: "RistoSaaS",
  },
  twitter: {
    card: "summary_large_image",
    title: copy.title,
    description: copy.description,
  },
  alternates: {
    canonical: "/",
    languages: homepageLanguages(),
  },
};

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-landing-bg text-landing-ink">
      <SoftwareApplicationJsonLd locale="it" />
      <LandingNavbar locale="it" />
      <main>
        <HeroShowcase locale="it" />
        <IntegrationFlowSection locale="it" />
        <FeatureCards locale="it" />
        <DashboardPreview />
        <BenefitsSection locale="it" />
        <BrandTrustSection locale="it" />
        <ContactSection locale="it" />
        <FinalCta locale="it" />
      </main>
      <LandingFooter locale="it" />
    </div>
  );
}
