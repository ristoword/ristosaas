"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/core/i18n/provider";
import { useI10n } from "@/core/i10n/formatters";
import type { Locale } from "@/core/i18n/types";
import { SUPPORTED_LOCALES } from "@/core/i18n/types";
import { useAuth } from "@/components/auth/auth-context";
import { notificationsApi, type AppNotification } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type TopBarProps = {
  onOpenSidebar: () => void;
  menuOpen: boolean;
};

/* ─── helpers ────────────────────────────────────── */

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Adesso";
  if (mins < 60) return `${mins} min fa`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h fa`;
  return `${Math.floor(hrs / 24)}g fa`;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  turno_creato: "📅",
  sync_staff: "🔄",
  sistema: "⚙️",
  staff_status: "👤",
  default: "🔔",
};

/* ─── Notification Panel ─────────────────────────── */

type NotifPanelProps = {
  items: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
  loading: boolean;
};

function NotificationPanel({ items, onMarkRead, onMarkAll, loading }: NotifPanelProps) {
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-80 overflow-hidden rounded-2xl border border-rw-line bg-rw-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-rw-line px-4 py-3">
        <h3 className="text-sm font-bold text-rw-ink">Notifiche</h3>
        {items.some((n) => !n.read) && (
          <button
            type="button"
            onClick={onMarkAll}
            className="flex items-center gap-1 text-xs text-rw-accent hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Segna tutto come letto
          </button>
        )}
      </div>

      <div className="max-h-[380px] overflow-y-auto">
        {loading && (
          <div className="py-8 text-center text-xs text-rw-muted">Caricamento…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10">
            <Bell className="h-8 w-8 text-rw-line" />
            <p className="text-xs text-rw-muted">Nessuna notifica.</p>
          </div>
        )}
        {!loading && items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onMarkRead(n.id)}
            className={cn(
              "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-rw-surfaceAlt",
              !n.read && "bg-rw-accent/5",
            )}
          >
            <span className="mt-0.5 shrink-0 text-base leading-none">
              {NOTIFICATION_ICONS[n.type] ?? NOTIFICATION_ICONS.default}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-xs font-semibold leading-snug text-rw-ink truncate", !n.read && "text-rw-accent")}>
                  {n.title}
                </p>
                {!n.read && (
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rw-accent" />
                )}
              </div>
              {n.message && (
                <p className="mt-0.5 text-[11px] leading-snug text-rw-muted line-clamp-2">{n.message}</p>
              )}
              <p className="mt-1 text-[10px] text-rw-muted/60">{relativeTime(n.createdAt)}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-rw-line px-4 py-2.5">
        <Link
          href="/staff-me"
          className="flex items-center justify-between text-xs text-rw-muted hover:text-rw-accent transition"
        >
          <span>Le tue presenze e turni</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ─── User Menu ──────────────────────────────────── */

type UserMenuProps = {
  name: string;
  role: string;
  email: string;
  initials: string;
  onLogout: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietario",
  super_admin: "Super Admin",
  sala: "Sala",
  cucina: "Cucina",
  bar: "Bar",
  pizzeria: "Pizzeria",
  cassa: "Cassa",
  supervisor: "Supervisor",
  magazzino: "Magazzino",
  staff: "Staff",
  hotel_manager: "Hotel Manager",
  reception: "Reception",
  housekeeping: "Housekeeping",
};

function UserMenu({ name, role, email, initials, onLogout }: UserMenuProps) {
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 overflow-hidden rounded-2xl border border-rw-line bg-rw-surface shadow-2xl">
      <div className="flex items-center gap-3 border-b border-rw-line px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rw-accent to-rw-accentSoft text-sm font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-rw-ink">{name}</p>
          <p className="truncate text-xs text-rw-muted">{email}</p>
          <span className="mt-0.5 inline-block rounded-md bg-rw-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-rw-accent">
            {ROLE_LABELS[role] ?? role}
          </span>
        </div>
      </div>

      <div className="py-1.5">
        <Link
          href="/staff-me"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-rw-ink transition hover:bg-rw-surfaceAlt"
        >
          <User className="h-4 w-4 text-rw-muted" />
          Il mio profilo
        </Link>
        <Link
          href="/turni"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-rw-ink transition hover:bg-rw-surfaceAlt"
        >
          <CalendarClock className="h-4 w-4 text-rw-muted" />
          I miei turni
        </Link>
        <Link
          href="/owner"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-rw-ink transition hover:bg-rw-surfaceAlt"
        >
          <Settings className="h-4 w-4 text-rw-muted" />
          Impostazioni
        </Link>
      </div>

      <div className="border-t border-rw-line py-1.5">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Esci
        </button>
      </div>
    </div>
  );
}

/* ─── TopBar ─────────────────────────────────────── */

export function TopBar({ onOpenSidebar, menuOpen }: TopBarProps) {
  const { locale, setLocale, t } = useI18n();
  const { formatDate } = useI10n();
  const { user, logout } = useAuth();
  const today = formatDate(new Date());

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await notificationsApi.list({ limit: 30 });
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      /* non-fatal */
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
    const interval = setInterval(() => { void loadNotifications(); }, 30_000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleNotif() {
    setNotifOpen((o) => !o);
    setUserOpen(false);
    if (!notifOpen) void loadNotifications();
  }

  function toggleUser() {
    setUserOpen((o) => !o);
    setNotifOpen(false);
  }

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAll() {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const initials = user ? getInitials(user.name) : "?";

  return (
    <header className="sticky top-0 z-30 border-b border-rw-line bg-rw-surface/90 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-6xl items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rw-line bg-rw-surfaceAlt text-rw-ink shadow-sm md:hidden"
          aria-controls="app-sidebar"
          aria-expanded={menuOpen}
          aria-label={t("topbar.menu.toggle")}
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold text-rw-ink md:text-xl">
            {user ? `Ciao, ${user.name.split(" ")[0]}` : t("topbar.greeting")}
          </p>
          <p className="truncate text-sm text-rw-muted capitalize">{today}</p>
        </div>

        <div className="hidden min-w-0 flex-1 md:block">
          <label className="sr-only" htmlFor="global-search">{t("topbar.search.label")}</label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rw-muted"
              aria-hidden
            />
            <input
              id="global-search"
              name="q"
              readOnly
              placeholder={t("topbar.search")}
              className="h-12 w-full cursor-not-allowed rounded-2xl border border-rw-line bg-rw-surfaceAlt pl-12 pr-4 text-sm text-rw-muted"
              title="La ricerca globale si collegherà ai moduli."
            />
          </div>
        </div>

        <label className="hidden text-xs font-semibold text-rw-muted md:flex md:items-center md:gap-2">
          <span>{t("locale.label")}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-10 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 text-sm text-rw-ink"
          >
            {SUPPORTED_LOCALES.map((loc) => (
              <option key={loc} value={loc}>
                {t(`locale.${loc}`)}
              </option>
            ))}
          </select>
        </label>

        {/* ─── Notification Bell ──────────────────── */}
        <div ref={notifRef} className="relative shrink-0">
          <button
            type="button"
            onClick={toggleNotif}
            className={cn(
              "relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rw-line bg-rw-surface text-rw-ink shadow-sm transition hover:border-rw-accent/40 hover:bg-rw-surfaceAlt",
              notifOpen && "border-rw-accent/40 bg-rw-surfaceAlt",
            )}
            aria-label="Notifiche"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rw-accent text-[10px] font-bold text-white shadow">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotificationPanel
              items={notifications}
              onMarkRead={(id) => void handleMarkRead(id)}
              onMarkAll={() => void handleMarkAll()}
              loading={notifLoading}
            />
          )}
        </div>

        {/* ─── User Avatar ────────────────────────── */}
        <div ref={userRef} className="relative shrink-0">
          <button
            type="button"
            onClick={toggleUser}
            className={cn(
              "hidden h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rw-accent to-rw-accentSoft text-sm font-bold text-white shadow-rw-sm transition hover:opacity-90 active:scale-[0.97] sm:flex",
              userOpen && "ring-2 ring-rw-accent ring-offset-2 ring-offset-rw-bg",
            )}
            aria-label="Menu utente"
          >
            {initials}
          </button>

          {userOpen && user && (
            <UserMenu
              name={user.name}
              role={user.role}
              email={user.email}
              initials={initials}
              onLogout={() => void logout()}
            />
          )}
        </div>
      </div>
    </header>
  );
}
