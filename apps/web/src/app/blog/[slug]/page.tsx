import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { SeoPageShell } from "@/components/landing/SeoPageShell";
import { BLOG_POSTS, getAllSlugs, getPostBySlug } from "@/app/blog/posts";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

type Ctx = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "Articolo non trovato | RistoSaaS" };
  }
  return {
    title: `${post.seoTitle ?? post.title} | RistoSaaS`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.seoTitle ?? post.title,
      description: post.description,
      type: "article",
      locale: "it_IT",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: Ctx) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seoTitle ?? post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    inLanguage: "it-IT",
    author: {
      "@type": "Organization",
      name: "RistoSaaS",
      url: "https://ristosaas.com/",
    },
    publisher: {
      "@type": "Organization",
      name: "gestionesemplificata.com",
      url: "https://gestionesemplificata.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://ristosaas.com/blog/${post.slug}`,
    },
  };

  const related = (post.related ?? [])
    .map((slugRef) => BLOG_POSTS.find((p) => p.slug === slugRef))
    .filter((p): p is (typeof BLOG_POSTS)[number] => !!p);

  return (
    <SeoPageShell>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- Article JSON-LD inline
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="mx-auto w-full max-w-3xl px-5 pb-16 pt-4 md:px-8 md:pb-24">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-landing-magentaSoft hover:text-landing-ink"
        >
          ← Tutti gli articoli
        </Link>

        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
          {post.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-landing-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.readingMinutes} min di lettura
          </span>
        </div>

        <div className="mt-8 space-y-4 text-base leading-relaxed text-landing-soft">
          {post.lead.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {post.sections.map((section) => (
          <section key={section.heading} className="mt-12">
            <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-landing-soft">
              {section.paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            {section.bullets ? (
              <ul className="mt-4 space-y-2 text-landing-soft">
                {section.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-landing-magenta" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {post.conclusion ? (
          <aside className="mt-14 rounded-3xl border border-landing-magenta/30 bg-landing-card p-8 shadow-landing-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-magentaSoft">
              In sintesi
            </p>
            <p className="mt-3 text-base leading-relaxed text-landing-ink">{post.conclusion}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:hello@gestionesemplificata.com?subject=RistoSaaS%20%E2%80%93%20Richiesta%20demo&body=Vorrei%20una%20demo%20di%20RistoSaaS%20dopo%20aver%20letto%20l%27articolo%20del%20blog."
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-6 py-3 text-sm font-semibold text-white"
              >
                Richiedi demo <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <Link
                href="/gestionale-ristorante-hotel-integrato"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-6 py-3 text-sm font-semibold text-landing-ink"
              >
                Scopri il sistema integrato
              </Link>
            </div>
          </aside>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-16 border-t border-landing-line pt-10">
            <h2 className="font-display text-xl font-semibold text-landing-ink">Articoli correlati</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <li
                  key={r.slug}
                  className="rounded-2xl border border-landing-line bg-landing-card p-5 transition hover:border-landing-magenta/40"
                >
                  <h3 className="font-display text-base font-semibold text-landing-ink">
                    <Link href={`/blog/${r.slug}`}>{r.title}</Link>
                  </h3>
                  <p className="mt-2 text-sm text-landing-soft">{r.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </SeoPageShell>
  );
}
