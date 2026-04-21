import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { SeoPageShell } from "@/components/landing/SeoPageShell";
import { BLOG_INDEX_COPY, BLOG_POSTS_COPY } from "@/core/i18n/seo-content";
import { blogPostPath } from "@/core/i18n/locale-urls";
import type { Locale } from "@/core/i18n/types";

function formatDate(iso: string, locale: Locale) {
  const localeTag = locale === "it" ? "it-IT" : locale === "en" ? "en-US" : "nl-NL";
  return new Date(iso).toLocaleDateString(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function LocaleBlogIndex({ locale }: { locale: Locale }) {
  const copy = BLOG_INDEX_COPY[locale];
  const posts = [...BLOG_POSTS_COPY[locale]].sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : -1,
  );

  return (
    <SeoPageShell locale={locale}>
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 md:px-8 md:pb-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
          {copy.h1}
        </h1>
        <p className="mt-4 max-w-3xl text-landing-soft">{copy.lead}</p>

        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="group rounded-3xl border border-landing-line bg-landing-card p-6 transition-all duration-rw hover:-translate-y-0.5 hover:border-landing-magenta/40"
            >
              <p className="flex items-center gap-3 text-xs text-landing-muted">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {post.readingMinutes} {copy.minLabel}
                </span>
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold text-landing-ink group-hover:text-landing-magentaSoft">
                <Link href={blogPostPath(locale, post.slug)}>{post.title}</Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-landing-soft">{post.description}</p>
              <Link
                href={blogPostPath(locale, post.slug)}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-landing-magentaSoft hover:text-landing-ink"
              >
                {copy.readLinkLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SeoPageShell>
  );
}
