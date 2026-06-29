/** Design tokens condivisi — allineati a cassa, front desk, hotel dashboard. */

export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-semibold text-rw-ink transition hover:bg-rw-surfaceAlt disabled:opacity-50";

export const BTN_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50";

export const INPUT_CLASS =
  "w-full min-w-0 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30 disabled:opacity-50";

export const SELECT_CLASS =
  "w-full min-w-0 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30 disabled:opacity-50";

export const ALERT_WARN =
  "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200";

export const ALERT_INFO =
  "rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-soft";

export const KPI_GRID = "grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8";

export const PAGE_STACK = "space-y-6 pb-10";
