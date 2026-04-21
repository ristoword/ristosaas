import type { Metadata } from "next";
import { LocalePillarPage } from "@/components/landing/LocalePillarPage";
import { PILLAR_COPY } from "@/core/i18n/seo-content";
import { pillarLanguages, pillarPath } from "@/core/i18n/locale-urls";

const copy = PILLAR_COPY.en;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  keywords: copy.keywords,
  alternates: {
    canonical: pillarPath("en"),
    languages: pillarLanguages(),
  },
  openGraph: {
    title: copy.title,
    description: copy.description,
    type: "article",
    locale: "en_US",
  },
};

export default function PillarEn() {
  return <LocalePillarPage locale="en" />;
}
