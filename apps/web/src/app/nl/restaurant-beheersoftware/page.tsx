import type { Metadata } from "next";
import { LocaleRestaurantPage } from "@/components/landing/LocaleRestaurantPage";
import { RESTAURANT_COPY } from "@/core/i18n/seo-content";
import { restaurantLanguages, restaurantPath } from "@/core/i18n/locale-urls";

const copy = RESTAURANT_COPY.nl;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  keywords: copy.keywords,
  alternates: {
    canonical: restaurantPath("nl"),
    languages: restaurantLanguages(),
  },
  openGraph: {
    title: copy.title,
    description: copy.description,
    type: "article",
    locale: "nl_NL",
  },
};

export default function RestaurantNl() {
  return <LocaleRestaurantPage locale="nl" />;
}
