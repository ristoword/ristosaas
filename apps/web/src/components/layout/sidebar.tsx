"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVisibleNavHubs, type NavHub } from "./nav-config";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/core/i18n/provider";
import type { Locale } from "@/core/i18n/types";
import { SUPPORTED_LOCALES } from "@/core/i18n/types";

type SidebarProps = {
  mobileOpen: boolean;
  onNavigate: () => void;
};

function hubContainsPath(hub: NavHub, pathname: string): boolean {
  if (hub.direct && hub.items[0]) {
    return pathname === hub.items[0].href.split("?")[0];
  }
  return hub.items.some((item) => pathname === item.href.split("?")[0]);
}

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const hubs = getVisibleNavHubs(user?.role, t, user?.partnerCode);

  const activeHubId = useMemo(
    () => hubs.find((hub) => hubContainsPath(hub, pathname))?.id ?? null,
    [hubs, pathname],
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeHubId) return;
    setExpanded((prev) => (prev[activeHubId] ? prev : { ...prev, [activeHubId]: true }));
  }, [activeHubId]);

  function toggleHub(hubId: string) {
    setExpanded((prev) => ({ ...prev, [hubId]: !prev[hubId] }));
  }

  function renderSubItem(hub: NavHub, item: (typeof hub.items)[number]) {
    const active = item.ready && pathname === item.href.split("?")[0];
    const Icon = item.icon;

    if (!item.ready) {
      return (
        <li key={item.id}>
          <div
            aria-disabled="true"
            className="flex cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2 text-sm opacity-60"
            title={t("sidebar.comingSoon.tooltip")}
          >
            <Icon className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
            <span className="truncate">{item.label}</span>
            <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-rw-sidebarMuted">
              {t("sidebar.comingSoon")}
            </span>
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
            "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-rw hover:bg-white/5",
            active && "bg-white/10 font-medium text-white",
            !active && "text-white/80",
          )}
          aria-current={active ? "page" : undefined}
          title={item.hint}
        >
          <Icon className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
          <span className="truncate">{item.label}</span>
        </Link>
      </li>
    );
  }

  function renderDirectHub(hub: NavHub) {
    const item = hub.items[0];
    if (!item) return null;
    const active = item.ready && pathname === item.href.split("?")[0];
    const Icon = hub.icon;

    if (!item.ready) {
      return (
        <div
          aria-disabled="true"
          className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-2 py-2 opacity-60"
          title={t("sidebar.comingSoon.tooltip")}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/90">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{hub.label}</span>
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors duration-rw hover:bg-white/5",
          active && "bg-white/10 hover:bg-white/10",
        )}
        aria-current={active ? "page" : undefined}
        title={hub.hint}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/90",
            active && "border-rw-accentGlow bg-rw-accentGlow text-white",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate font-medium">{hub.label}</span>
          <span className="mt-0.5 block truncate text-xs text-rw-sidebarMuted">{hub.hint}</span>
        </span>
      </Link>
    );
  }

  function renderCollapsibleHub(hub: NavHub) {
    const isOpen = expanded[hub.id] ?? false;
    const hasActiveChild = hubContainsPath(hub, pathname);
    const Icon = hub.icon;

    return (
      <div>
        <button
          type="button"
          onClick={() => toggleHub(hub.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors duration-rw hover:bg-white/5",
            hasActiveChild && "bg-white/10",
          )}
          aria-expanded={isOpen}
        >
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/90",
              hasActiveChild && "border-rw-accentGlow bg-rw-accentGlow text-white",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{hub.label}</span>
            <span className="mt-0.5 block truncate text-xs text-rw-sidebarMuted">{hub.hint}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-rw-sidebarMuted transition-transform duration-rw",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {isOpen ? (
          <ul className="mt-1 space-y-0.5 border-l border-white/10 pl-3 ml-5">
            {hub.items.map((item) => renderSubItem(hub, item))}
          </ul>
        ) : null}
      </div>
    );
  }

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

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {hubs.map((hub) => (
            <div key={hub.id}>
              {hub.direct ? renderDirectHub(hub) : renderCollapsibleHub(hub)}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-xs font-semibold text-rw-sidebarMuted">{t("locale.label")}:</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="flex-1 h-9 rounded-xl border border-white/15 bg-white/10 px-2 text-xs font-semibold text-white"
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc} value={loc} className="bg-gray-900 text-white">
                  {t(`locale.${loc}`)}
                </option>
              ))}
            </select>
          </div>
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
