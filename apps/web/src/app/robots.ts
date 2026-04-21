import type { MetadataRoute } from "next";
import { SITE_URL } from "@/core/i18n/seo-content";

/**
 * robots.txt dinamico:
 * - permette tutto il pubblico marketing e blog in 3 lingue
 * - esclude API, flussi dashboard e endpoint tecnici
 * - espone sitemap.xml
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/en",
          "/nl",
          "/blog",
          "/en/blog",
          "/nl/blog",
          "/gestionale-ristorante-hotel-integrato",
          "/gestionale-ristorante",
          "/en/integrated-restaurant-hotel-management-software",
          "/en/restaurant-management-software",
          "/nl/geintegreerde-restaurant-hotel-beheersoftware",
          "/nl/restaurant-beheersoftware",
        ],
        disallow: [
          "/api/",
          "/dashboard",
          "/cassa",
          "/cucina",
          "/pizzeria",
          "/bar",
          "/hotel",
          "/magazzino",
          "/fornitori",
          "/rooms",
          "/sala-fullscreen",
          "/super-admin",
          "/dev-access",
          "/owner",
          "/supervisor",
          "/sessions",
          "/change-password",
          "/setup",
          "/maintenance",
          "/login",
          "/signup",
          "/stripe",
          "/licenses",
          "/email-settings",
          "/hardware",
          "/t/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
