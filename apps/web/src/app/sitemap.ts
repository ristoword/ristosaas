import type { MetadataRoute } from "next";
import { BLOG_POSTS_COPY, SITE_URL } from "@/core/i18n/seo-content";
import {
  blogIndexPath,
  blogPostPath,
  homePath,
  pillarPath,
  restaurantPath,
  absUrl,
  blogIndexLanguages,
  blogPostLanguages,
  homepageLanguages,
  pillarLanguages,
  restaurantLanguages,
} from "@/core/i18n/locale-urls";
import type { Locale } from "@/core/i18n/types";

const LOCALES: Locale[] = ["it", "en", "nl"];

/**
 * Sitemap dinamica per le pagine pubbliche multilingua.
 * Include alternates hreflang per ogni URL come previsto dalle linee
 * guida Google sulla targeting internazionale.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Homepage
  for (const locale of LOCALES) {
    entries.push({
      url: absUrl(homePath(locale)),
      lastModified: now,
      changeFrequency: "weekly",
      priority: locale === "it" ? 1.0 : 0.9,
      alternates: { languages: homepageLanguages() },
    });
  }

  // Pillar
  for (const locale of LOCALES) {
    entries.push({
      url: absUrl(pillarPath(locale)),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: pillarLanguages() },
    });
  }

  // Restaurant page
  for (const locale of LOCALES) {
    entries.push({
      url: absUrl(restaurantPath(locale)),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
      alternates: { languages: restaurantLanguages() },
    });
  }

  // Blog index
  for (const locale of LOCALES) {
    entries.push({
      url: absUrl(blogIndexPath(locale)),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: { languages: blogIndexLanguages() },
    });
  }

  // Blog posts
  for (const locale of LOCALES) {
    for (const post of BLOG_POSTS_COPY[locale]) {
      entries.push({
        url: absUrl(blogPostPath(locale, post.slug)),
        lastModified: new Date(post.publishedAt),
        changeFrequency: "yearly",
        priority: 0.6,
        alternates: { languages: blogPostLanguages(locale, post.slug) },
      });
    }
  }

  return entries;
}

export const revalidate = 3600;

// Ensure SITE_URL is referenced for bundlers
void SITE_URL;
