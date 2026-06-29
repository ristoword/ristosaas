/** Enterprise Gold — Hotel Control Center design tokens (UI only). */

export const GOLD = "#D4AF37";

export const GRID_GAP = "gap-4 md:gap-5";

export const CARD =
  "rounded-[18px] border border-rw-line/70 bg-gradient-to-b from-rw-surface to-rw-surfaceAlt/90 shadow-[0_4px_24px_rgba(0,0,0,0.18)] transition-[transform,box-shadow,border-color] duration-[180ms] hover:border-[#D4AF37]/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.22)]";

export const CARD_CLICK =
  `${CARD} cursor-pointer active:scale-[0.99] hover:scale-[1.01]`;

export const KPI_HEADER =
  "flex min-h-[88px] min-w-0 flex-col justify-between rounded-[18px] border border-rw-line/60 bg-rw-surfaceAlt/95 px-3 py-2.5 shadow-sm transition duration-[180ms] hover:border-[#D4AF37]/35 hover:shadow-md sm:min-h-[100px] sm:px-4 sm:py-3 lg:min-h-[120px]";

export const QUICK_ACTION =
  "flex min-h-[72px] min-w-0 flex-col items-start justify-center gap-0.5 rounded-[18px] border border-rw-line/60 bg-rw-surfaceAlt/95 px-3 py-2 shadow-sm transition duration-[180ms] hover:scale-[1.02] hover:border-[#D4AF37]/40 hover:shadow-md active:scale-[0.98] sm:min-h-[84px] sm:px-4 lg:min-h-[92px]";

export const MODULE_LINK =
  "group flex min-h-[96px] flex-col justify-end overflow-hidden rounded-[18px] border border-rw-line/60 bg-gradient-to-br from-rw-surfaceAlt to-rw-surface p-3 shadow-sm transition duration-[180ms] hover:scale-[1.02] hover:border-[#D4AF37]/40 hover:shadow-lg active:scale-[0.99] sm:min-h-[108px] sm:p-4 lg:min-h-[120px]";

/** Bottom clearance for mobile AI FAB + safe area. */
export const FAB_CLEARANCE = "pb-[max(6rem,calc(4.5rem+env(safe-area-inset-bottom)))] lg:pb-10";
