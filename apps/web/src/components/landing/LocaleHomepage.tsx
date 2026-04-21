import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { BrandTrustSection } from "@/components/landing/BrandTrustSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { FinalCta } from "@/components/landing/FinalCta";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { IntegrationFlowSection } from "@/components/landing/IntegrationFlowSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { SoftwareApplicationJsonLd } from "@/components/landing/SoftwareApplicationJsonLd";
import type { Locale } from "@/core/i18n/types";

/**
 * Shell homepage condivisa IT/EN/NL: stesso layout e sequenza
 * delle sezioni, copy parametrizzato dal `locale`.
 */
export function LocaleHomepage({ locale }: { locale: Locale }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-landing-bg text-landing-ink">
      <SoftwareApplicationJsonLd locale={locale} />
      <LandingNavbar locale={locale} />
      <main>
        <HeroShowcase locale={locale} />
        <IntegrationFlowSection locale={locale} />
        <FeatureCards locale={locale} />
        <DashboardPreview />
        <BenefitsSection locale={locale} />
        <BrandTrustSection locale={locale} />
        <ContactSection locale={locale} />
        <FinalCta locale={locale} />
      </main>
      <LandingFooter locale={locale} />
    </div>
  );
}
