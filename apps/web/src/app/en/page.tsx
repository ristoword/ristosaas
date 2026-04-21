import type { Metadata } from "next";
import { LocaleHomepage } from "@/components/landing/LocaleHomepage";
import { HOMEPAGE_COPY } from "@/core/i18n/seo-content";
import { homepageLanguages } from "@/core/i18n/locale-urls";

const copy = HOMEPAGE_COPY.en;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  keywords: copy.keywords,
  openGraph: {
    title: copy.title,
    description: copy.description,
    type: "website",
    locale: "en_US",
    siteName: "RistoSimply",
  },
  twitter: {
    card: "summary_large_image",
    title: copy.title,
    description: copy.description,
  },
  alternates: {
    canonical: "/en",
    languages: homepageLanguages(),
  },
};

export default function HomeEn() {
  return <LocaleHomepage locale="en" />;
}
