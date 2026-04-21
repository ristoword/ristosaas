import type { Metadata } from "next";
import { LocaleBlogIndex } from "@/components/landing/LocaleBlogIndex";
import { BLOG_INDEX_COPY } from "@/core/i18n/seo-content";
import { blogIndexLanguages, blogIndexPath } from "@/core/i18n/locale-urls";

const copy = BLOG_INDEX_COPY.nl;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  alternates: {
    canonical: blogIndexPath("nl"),
    languages: blogIndexLanguages(),
  },
  openGraph: {
    title: copy.title,
    description: copy.description,
    type: "website",
    locale: "nl_NL",
  },
};

export default function BlogIndexPageNl() {
  return <LocaleBlogIndex locale="nl" />;
}
