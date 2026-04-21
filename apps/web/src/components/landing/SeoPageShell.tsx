import type { ReactNode } from "react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import type { Locale } from "@/core/i18n/types";

export function SeoPageShell({
  children,
  locale = "it",
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-landing-bg text-landing-ink">
      <LandingNavbar locale={locale} />
      <main className="pt-28 md:pt-32">{children}</main>
      <LandingFooter locale={locale} />
    </div>
  );
}
