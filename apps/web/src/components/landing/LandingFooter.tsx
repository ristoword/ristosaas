import Link from "next/link";
import { HOMEPAGE_COPY } from "@/core/i18n/seo-content";
import type { Locale } from "@/core/i18n/types";
import {
  blogIndexPath,
  homePath,
  pillarPath,
  restaurantPath,
} from "@/core/i18n/locale-urls";

export function LandingFooter({ locale = "it" }: { locale?: Locale } = {}) {
  const copy = HOMEPAGE_COPY[locale];
  const base = locale === "it" ? "" : `/${locale}`;
  return (
    <footer className="border-t border-landing-line bg-landing-bg py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center md:px-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-landing-violet via-landing-magenta to-landing-pink text-xs font-bold text-white"
          >
            R
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-landing-ink">RistoSaaS</p>
            <a
              href="https://gestionesemplificata.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-landing-muted hover:text-landing-ink"
            >
              gestionesemplificata.com
            </a>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-xs text-landing-soft">
          <a href={`${homePath(locale)}#funzioni`} className="hover:text-landing-ink">
            {copy.footerFunctions}
          </a>
          <Link href={pillarPath(locale)} className="hover:text-landing-ink">
            {copy.footerIntegrated}
          </Link>
          <Link href={restaurantPath(locale)} className="hover:text-landing-ink">
            {copy.footerRestaurant}
          </Link>
          <Link href={blogIndexPath(locale)} className="hover:text-landing-ink">
            {copy.footerBlog}
          </Link>
          <a href={`${base}/#demo`} className="hover:text-landing-ink">
            {copy.footerDemo}
          </a>
          <Link
            href="/login"
            className="font-semibold text-landing-ink hover:text-landing-magentaSoft"
          >
            {copy.navLogin}
          </Link>
        </nav>

        <p className="text-xs text-landing-muted">
          © {new Date().getFullYear()} RistoSaaS · {copy.footerRights}
        </p>
      </div>
    </footer>
  );
}
