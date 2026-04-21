import type { Locale } from "@/core/i18n/types";
import {
  HOMEPAGE_COPY,
  PILLAR_COPY,
  RESTAURANT_COPY,
  SITE_URL,
  getBlogAlternates,
} from "@/core/i18n/seo-content";

/**
 * Helper di routing i18n.
 *
 * Convenzione:
 *   - L'italiano e' la lingua default e NON ha prefisso in URL.
 *     Homepage IT = "/", pillar IT = "/gestionale-ristorante-hotel-integrato",
 *     blog IT = "/blog", ecc.
 *   - Inglese e olandese hanno prefisso dedicato: "/en" e "/nl".
 *     Homepage EN = "/en", pillar EN = "/en/integrated-...", blog EN = "/en/blog",
 *     blog NL = "/nl/blog", ecc.
 */

export function homePath(locale: Locale): string {
  if (locale === "it") return "/";
  return `/${locale}`;
}

export function pillarPath(locale: Locale): string {
  const slug = PILLAR_COPY[locale].slug;
  if (locale === "it") return `/${slug}`;
  return `/${locale}/${slug}`;
}

export function restaurantPath(locale: Locale): string {
  const slug = RESTAURANT_COPY[locale].slug;
  if (locale === "it") return `/${slug}`;
  return `/${locale}/${slug}`;
}

export function blogIndexPath(locale: Locale): string {
  if (locale === "it") return "/blog";
  return `/${locale}/blog`;
}

export function blogPostPath(locale: Locale, slug: string): string {
  if (locale === "it") return `/blog/${slug}`;
  return `/${locale}/blog/${slug}`;
}

/** Assoluto con dominio, per og:url e sitemap */
export function absUrl(path: string): string {
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
  return `${SITE_URL}${path}`;
}

/**
 * Genera gli hreflang alternates per Next.js metadata.alternates.languages.
 * Va passato con una mappa { it: "/path", en: "/en/path", nl: "/nl/path" }.
 */
export function buildLanguages(paths: Partial<Record<Locale, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  const locales: Locale[] = ["it", "en", "nl"];
  for (const loc of locales) {
    const path = paths[loc];
    if (path) {
      out[loc === "it" ? "it-IT" : loc === "en" ? "en-US" : "nl-NL"] = absUrl(path);
    }
  }
  // x-default punta alla versione inglese (pratica SEO comune per audience internazionale)
  if (paths.en) out["x-default"] = absUrl(paths.en);
  else if (paths.it) out["x-default"] = absUrl(paths.it);
  return out;
}

export function homepageLanguages(): Record<string, string> {
  return buildLanguages({
    it: homePath("it"),
    en: homePath("en"),
    nl: homePath("nl"),
  });
}

export function pillarLanguages(): Record<string, string> {
  return buildLanguages({
    it: pillarPath("it"),
    en: pillarPath("en"),
    nl: pillarPath("nl"),
  });
}

export function restaurantLanguages(): Record<string, string> {
  return buildLanguages({
    it: restaurantPath("it"),
    en: restaurantPath("en"),
    nl: restaurantPath("nl"),
  });
}

export function blogIndexLanguages(): Record<string, string> {
  return buildLanguages({
    it: blogIndexPath("it"),
    en: blogIndexPath("en"),
    nl: blogIndexPath("nl"),
  });
}

export function blogPostLanguages(locale: Locale, slug: string): Record<string, string> {
  const alternates = getBlogAlternates(locale, slug);
  const paths: Partial<Record<Locale, string>> = {};
  for (const loc of ["it", "en", "nl"] as Locale[]) {
    if (alternates[loc]) paths[loc] = blogPostPath(loc, alternates[loc]!);
  }
  return buildLanguages(paths);
}

export { HOMEPAGE_COPY };
