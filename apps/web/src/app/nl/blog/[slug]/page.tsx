import type { Metadata } from "next";
import { LocaleBlogPost } from "@/components/landing/LocaleBlogPost";
import { getBlogPost, getBlogSlugs } from "@/core/i18n/seo-content";
import { blogPostLanguages, blogPostPath } from "@/core/i18n/locale-urls";

export function generateStaticParams() {
  return getBlogSlugs("nl").map((slug) => ({ slug }));
}

type Ctx = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost("nl", slug);
  if (!post) {
    return { title: "Artikel niet gevonden | RistoSaaS" };
  }
  return {
    title: `${post.title} | RistoSaaS`,
    description: post.description,
    alternates: {
      canonical: blogPostPath("nl", post.slug),
      languages: blogPostLanguages("nl", post.slug),
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      locale: "nl_NL",
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
    },
  };
}

export default async function BlogPostPageNl({ params }: Ctx) {
  const { slug } = await params;
  return <LocaleBlogPost locale="nl" slug={slug} />;
}
