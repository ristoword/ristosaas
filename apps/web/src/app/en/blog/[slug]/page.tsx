import type { Metadata } from "next";
import { LocaleBlogPost } from "@/components/landing/LocaleBlogPost";
import { getBlogPost, getBlogSlugs } from "@/core/i18n/seo-content";
import { blogPostLanguages, blogPostPath } from "@/core/i18n/locale-urls";

export function generateStaticParams() {
  return getBlogSlugs("en").map((slug) => ({ slug }));
}

type Ctx = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost("en", slug);
  if (!post) {
    return { title: "Article not found | RistoSaaS" };
  }
  return {
    title: `${post.title} | RistoSaaS`,
    description: post.description,
    alternates: {
      canonical: blogPostPath("en", post.slug),
      languages: blogPostLanguages("en", post.slug),
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      locale: "en_US",
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
    },
  };
}

export default async function BlogPostPageEn({ params }: Ctx) {
  const { slug } = await params;
  return <LocaleBlogPost locale="en" slug={slug} />;
}
