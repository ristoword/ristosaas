import type { Metadata } from "next";
import { LocaleBlogIndex } from "@/components/landing/LocaleBlogIndex";
import { BLOG_INDEX_COPY } from "@/core/i18n/seo-content";
import { blogIndexLanguages, blogIndexPath } from "@/core/i18n/locale-urls";

const copy = BLOG_INDEX_COPY.en;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  alternates: {
    canonical: blogIndexPath("en"),
    languages: blogIndexLanguages(),
  },
  openGraph: {
    title: copy.title,
    description: copy.description,
    type: "website",
    locale: "en_US",
  },
};

export default function BlogIndexPageEn() {
  return <LocaleBlogIndex locale="en" />;
}
