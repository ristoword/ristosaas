import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { SeoPageShell } from "@/components/landing/SeoPageShell";
import { BLOG_POSTS } from "@/app/blog/posts";

export const metadata: Metadata = {
  title: "Blog | Gestionale ristorante e hotel integrato",
  description:
    "Guide, approfondimenti e best practice per gestire ristorante, cucina, magazzino e hotel con un sistema integrato.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog RistoSaaS",
    description:
      "Guide operative per scegliere e usare un gestionale ristorante e hotel integrato.",
    type: "website",
    locale: "it_IT",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return (
    <SeoPageShell>
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 md:px-8 md:pb-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
          Blog
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
          Guide pratiche per ristorante e hotel
        </h1>
        <p className="mt-4 max-w-3xl text-landing-soft">
          Approfondimenti operativi su come scegliere un gestionale, gestire il magazzino in modo
          integrato, collegare ristorante e hotel senza doppie registrazioni.
        </p>

        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="group rounded-3xl border border-landing-line bg-landing-card p-6 transition-all duration-rw hover:-translate-y-0.5 hover:border-landing-magenta/40"
            >
              <p className="flex items-center gap-3 text-xs text-landing-muted">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {post.readingMinutes} min
                </span>
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold text-landing-ink group-hover:text-landing-magentaSoft">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-landing-soft">{post.description}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-landing-magentaSoft hover:text-landing-ink"
              >
                Leggi l&apos;articolo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SeoPageShell>
  );
}
