import type { Metadata } from "next";
import { LocaleBlogPost } from "@/components/landing/LocaleBlogPost";
import { getBlogPost, getBlogSlugs } from "@/core/i18n/seo-content";
import { blogPostLanguages, blogPostPath } from "@/core/i18n/locale-urls";

export function generateStaticParams() {
  return getBlogSlugs("it").map((slug) => ({ slug }));
}

type Ctx = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost("it", slug);
  if (!post) {
    return { title: "Articolo non trovato | RistoSimply" };
  }
  return {
    title: `${post.title} | RistoSimply`,
    description: post.description,
    alternates: {
      canonical: blogPostPath("it", post.slug),
      languages: blogPostLanguages("it", post.slug),
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      locale: "it_IT",
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
    },
  };
}

export default async function BlogPostPageIt({ params }: Ctx) {
  const { slug } = await params;
  return <LocaleBlogPost locale="it" slug={slug} />;
}
