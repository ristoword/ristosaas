"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ROUTES } from "@/lib/routes";

const NAV_LINKS = [
  { href: "#come-funziona", label: "Come funziona" },
  { href: "#funzioni", label: "Funzioni" },
  { href: "/gestionale-ristorante-hotel-integrato", label: "Integrato" },
  { href: "#demo", label: "Demo" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled
          ? "bg-landing-bg/60 backdrop-blur-xl border-b border-landing-line"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link href={ROUTES.home} className="flex items-center gap-2.5">
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

        <nav aria-label="Menu principale" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
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
          <Link
            href={ROUTES.login}
            className="hidden rounded-full border border-landing-line bg-white/5 px-5 py-2 text-sm font-semibold text-landing-ink transition-all duration-rw hover:border-landing-magenta/60 hover:bg-white/10 hover:shadow-landing-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-magenta md:inline-flex"
          >
            Login
          </Link>
          <Link
            href={ROUTES.login}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-5 py-2 text-sm font-semibold text-white shadow-landing-soft transition-transform duration-rw hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-magenta md:hidden"
          >
            Login
          </Link>
          <button
            type="button"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
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
          <nav className="flex flex-col gap-2" aria-label="Menu mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-landing-soft transition-colors hover:bg-white/5 hover:text-landing-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
