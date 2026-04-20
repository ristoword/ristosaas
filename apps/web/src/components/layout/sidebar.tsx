"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVisibleNavSections } from "./nav-config";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/core/i18n/provider";

type SidebarProps = {
  mobileOpen: boolean;
  onNavigate: () => void;
};

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  const sections = getVisibleNavSections(user?.role);

  return (
    <>
      <aside
        id="app-sidebar"
        aria-label="Menu principale"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(18.5rem,88vw)] flex-col border-r border-white/10 bg-rw-sidebar text-white shadow-rw transition-transform duration-rw",
          "md:sticky md:top-0 md:h-dvh md:z-0 md:translate-x-0 md:shadow-none md:self-start md:shrink-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-start gap-3 px-5 pb-6 pt-7">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rw-accent to-rw-accentSoft text-lg font-display font-semibold text-white shadow-[0_10px_30px_-12px_rgba(228,87,46,0.75)]"
            aria-hidden
          >
            RW
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-tight tracking-tight">
              {t("app.brand")}
            </p>
            <p className="mt-0.5 text-xs text-rw-sidebarMuted">
              {t("app.tagline")}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rw-sidebarMuted">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active =
                    item.ready && pathname === item.href.split("?")[0];
                  const Icon = item.icon;
                  const content = (
                    <>
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/90",
                          active && "border-rw-accentGlow bg-rw-accentGlow text-white",
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-2">
                          <span className="block truncate font-medium">
                            {item.label}
                          </span>
                          {!item.ready ? (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rw-sidebarMuted">
                              Presto
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-rw-sidebarMuted">
                          {item.hint}
                        </span>
                      </span>
                    </>
                  );

                  if (!item.ready) {
                    return (
                      <li key={item.id}>
                        <div
                          aria-disabled="true"
                          className="flex cursor-not-allowed items-start gap-3 rounded-2xl px-2 py-2 text-left opacity-60"
                          title="Collegamento in arrivo con i prossimi moduli."
                        >
                          {content}
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl px-2 py-2 transition-colors duration-rw hover:bg-white/5",
                          active && "bg-white/10 hover:bg-white/10",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {content}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5 text-xs text-rw-sidebarMuted">
            <Sparkles className="h-4 w-4 shrink-0 text-rw-accentSoft" aria-hidden />
            <span>
              {t("sidebar.styleNote")}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
