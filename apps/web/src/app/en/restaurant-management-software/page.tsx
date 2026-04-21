import type { Metadata } from "next";
import { LocaleRestaurantPage } from "@/components/landing/LocaleRestaurantPage";
import { RESTAURANT_COPY } from "@/core/i18n/seo-content";
import { restaurantLanguages, restaurantPath } from "@/core/i18n/locale-urls";

const copy = RESTAURANT_COPY.en;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  keywords: copy.keywords,
  alternates: {
    canonical: restaurantPath("en"),
    languages: restaurantLanguages(),
  },
  openGraph: {
    title: copy.title,
    description: copy.description,
    type: "article",
    locale: "en_US",
  },
};

export default function RestaurantEn() {
  return <LocaleRestaurantPage locale="en" />;
}
