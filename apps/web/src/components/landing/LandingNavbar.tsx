"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Globe, Menu, X } from "lucide-react";
import { HOMEPAGE_COPY, LOCALE_META, type HomepageCopy } from "@/core/i18n/seo-content";
import type { Locale } from "@/core/i18n/types";
import {
  blogIndexPath,
  homePath,
  pillarPath,
  restaurantPath,
} from "@/core/i18n/locale-urls";

type Props = { locale?: Locale };

function buildLinks(locale: Locale, copy: HomepageCopy) {
  const base = locale === "it" ? "" : `/${locale}`;
  return [
    { href: `${base}#come-funziona`, label: copy.navComeFunziona },
    { href: `${base}#funzioni`, label: copy.navFunzioni },
    { href: pillarPath(locale), label: copy.navIntegrato },
    { href: `${base}#demo`, label: copy.navDemo },
  ];
}

const LOCALE_ORDER: Locale[] = ["it", "en", "nl"];

export function LandingNavbar({ locale = "it" }: Props = {}) {
  const copy = HOMEPAGE_COPY[locale];
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = buildLinks(locale, copy);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled
          ? "bg-landing-bg/60 backdrop-blur-xl border-b border-landing-line"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link href={homePath(locale)} className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet via-landing-magenta to-landing-pink text-sm font-bold text-white shadow-landing-soft"
          >
            R
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-landing-ink">
            RistoSaaS
          </span>
        </Link>

        <nav aria-label="Main menu" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-landing-soft transition-colors duration-rw hover:text-landing-ink focus-visible:text-landing-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-landing-magenta"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={langOpen}
              className="inline-flex items-center gap-1.5 rounded-full border border-landing-line bg-white/5 px-3 py-2 text-xs font-semibold text-landing-ink transition-all hover:border-landing-magenta/60"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              {LOCALE_META[locale].shortName}
            </button>
            {langOpen ? (
              <div className="absolute right-0 top-11 z-50 min-w-[160px] rounded-2xl border border-landing-line bg-landing-card p-1 shadow-landing-soft backdrop-blur-xl">
                {LOCALE_ORDER.map((loc) => (
                  <a
                    key={loc}
                    href={homePath(loc)}
                    onClick={() => setLangOpen(false)}
                    className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      loc === locale
                        ? "bg-landing-magenta/15 text-landing-ink"
                        : "text-landing-soft hover:bg-white/5 hover:text-landing-ink"
                    }`}
                  >
                    <span className="mr-2 font-mono text-[10px] text-landing-muted">
                      {LOCALE_META[loc].shortName}
                    </span>
                    {LOCALE_META[loc].nativeName}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <Link
            href="/login"
            className="hidden rounded-full border border-landing-line bg-white/5 px-5 py-2 text-sm font-semibold text-landing-ink transition-all duration-rw hover:border-landing-magenta/60 hover:bg-white/10 hover:shadow-landing-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-magenta md:inline-flex"
          >
            {copy.navLogin}
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-5 py-2 text-sm font-semibold text-white shadow-landing-soft transition-transform duration-rw hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-magenta md:hidden"
          >
            {copy.navLogin}
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-landing-line bg-white/5 text-landing-ink md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="landing-mobile-menu"
          className="border-t border-landing-line bg-landing-bg/90 px-5 py-4 backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col gap-2" aria-label="Mobile menu">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-landing-soft transition-colors hover:bg-white/5 hover:text-landing-ink"
              >
                {link.label}
              </a>
            ))}
            <Link
              href={blogIndexPath(locale)}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-landing-soft transition-colors hover:bg-white/5 hover:text-landing-ink"
            >
              Blog
            </Link>
            <Link
              href={restaurantPath(locale)}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-landing-soft transition-colors hover:bg-white/5 hover:text-landing-ink"
            >
              {locale === "it" ? "Ristorante" : locale === "en" ? "Restaurant" : "Restaurant"}
            </Link>

            <div className="mt-2 border-t border-landing-line pt-3">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-landing-muted">
                {LOCALE_META[locale].shortName === "IT" ? "Lingua" : LOCALE_META[locale].shortName === "EN" ? "Language" : "Taal"}
              </p>
              <div className="grid grid-cols-3 gap-1 px-2">
                {LOCALE_ORDER.map((loc) => (
                  <a
                    key={loc}
                    href={homePath(loc)}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-3 py-2 text-center text-xs font-semibold transition-colors ${
                      loc === locale
                        ? "bg-landing-magenta/20 text-landing-ink"
                        : "bg-white/5 text-landing-soft hover:text-landing-ink"
                    }`}
                  >
                    {LOCALE_META[loc].shortName}
                  </a>
                ))}
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
