import type { ReactNode } from "react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNavbar } from "@/components/landing/LandingNavbar";

export function SeoPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-landing-bg text-landing-ink">
      <LandingNavbar />
      <main className="pt-28 md:pt-32">{children}</main>
      <LandingFooter />
    </div>
  );
}
