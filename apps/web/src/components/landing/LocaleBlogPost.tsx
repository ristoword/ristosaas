import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { SeoPageShell } from "@/components/landing/SeoPageShell";
import { BLOG_POSTS_COPY, LOCALE_META, getBlogPost, PILLAR_COPY } from "@/core/i18n/seo-content";
import { absUrl, blogPostPath, pillarPath } from "@/core/i18n/locale-urls";
import type { Locale } from "@/core/i18n/types";

function formatDate(iso: string, locale: Locale) {
  const localeTag = locale === "it" ? "it-IT" : locale === "en" ? "en-US" : "nl-NL";
  return new Date(iso).toLocaleDateString(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const LABELS: Record<Locale, {
  back: string;
  min: string;
  summary: string;
  requestDemo: string;
  discoverIntegrated: string;
  related: string;
}> = {
  it: {
    back: "← Tutti gli articoli",
    min: "min di lettura",
    summary: "In sintesi",
    requestDemo: "Richiedi demo",
    discoverIntegrated: "Scopri il sistema integrato",
    related: "Articoli correlati",
  },
  en: {
    back: "← All articles",
    min: "min read",
    summary: "In short",
    requestDemo: "Request a demo",
    discoverIntegrated: "Discover the integrated system",
    related: "Related articles",
  },
  nl: {
    back: "← Alle artikelen",
    min: "min leestijd",
    summary: "In het kort",
    requestDemo: "Vraag een demo aan",
    discoverIntegrated: "Ontdek het geïntegreerde systeem",
    related: "Gerelateerde artikelen",
  },
};

const DEMO_MAIL: Record<Locale, { subject: string; body: string }> = {
  it: {
    subject: "RistoSaaS – Richiesta demo",
    body: "Vorrei una demo di RistoSaaS dopo aver letto l'articolo del blog.",
  },
  en: {
    subject: "RistoSaaS – Demo request",
    body: "I would like a demo of RistoSaaS after reading the blog post.",
  },
  nl: {
    subject: "RistoSaaS – Demo-aanvraag",
    body: "Ik wil graag een demo van RistoSaaS na het lezen van het blogartikel.",
  },
};

export function LocaleBlogPost({ locale, slug }: { locale: Locale; slug: string }) {
  const post = getBlogPost(locale, slug);
  if (!post) return notFound();

  const labels = LABELS[locale];
  const demo = DEMO_MAIL[locale];
  const demoHref = `mailto:hello@gestionesemplificata.com?subject=${encodeURIComponent(
    demo.subject,
  )}&body=${encodeURIComponent(demo.body)}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    inLanguage: LOCALE_META[locale].htmlLang,
    author: {
      "@type": "Organization",
      name: "RistoSaaS",
      url: absUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: "gestionesemplificata.com",
      url: "https://gestionesemplificata.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absUrl(blogPostPath(locale, post.slug)),
    },
  };

  const related = (post.related ?? [])
    .map((slugRef) => BLOG_POSTS_COPY[locale].find((p) => p.slug === slugRef))
    .filter((p): p is (typeof BLOG_POSTS_COPY)[Locale][number] => !!p);

  return (
    <SeoPageShell locale={locale}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- Article JSON-LD inline
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="mx-auto w-full max-w-3xl px-5 pb-16 pt-4 md:px-8 md:pb-24">
        <Link
          href={locale === "it" ? "/blog" : `/${locale}/blog`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-landing-magentaSoft hover:text-landing-ink"
        >
          {labels.back}
        </Link>

        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
          {post.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-landing-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.readingMinutes} {labels.min}
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
              {labels.summary}
            </p>
            <p className="mt-3 text-base leading-relaxed text-landing-ink">{post.conclusion}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={demoHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-6 py-3 text-sm font-semibold text-white"
              >
                {labels.requestDemo} <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <Link
                href={pillarPath(locale)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-6 py-3 text-sm font-semibold text-landing-ink"
              >
                {PILLAR_COPY[locale].ctaAccess === undefined ? labels.discoverIntegrated : labels.discoverIntegrated}
              </Link>
            </div>
          </aside>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-16 border-t border-landing-line pt-10">
            <h2 className="font-display text-xl font-semibold text-landing-ink">{labels.related}</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <li
                  key={r.slug}
                  className="rounded-2xl border border-landing-line bg-landing-card p-5 transition hover:border-landing-magenta/40"
                >
                  <h3 className="font-display text-base font-semibold text-landing-ink">
                    <Link href={blogPostPath(locale, r.slug)}>{r.title}</Link>
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
