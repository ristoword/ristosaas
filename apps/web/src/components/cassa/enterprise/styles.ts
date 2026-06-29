/** Enterprise Gold POS — touch-first design tokens (Cassa module only). */

export const GOLD = "#D4AF37";
export const GOLD_LIGHT = "#E8C547";
export const GOLD_DIM = "#B8962E";

export const TOUCH_BTN =
  "inline-flex min-h-[80px] min-w-[110px] items-center justify-center gap-2 rounded-2xl px-4 text-base font-semibold transition-all duration-200 active:scale-[0.97] shadow-sm hover:shadow-md";

export const TOUCH_BTN_SM =
  "inline-flex min-h-[80px] min-w-[110px] flex-col items-center justify-center gap-1.5 rounded-2xl px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] shadow-sm hover:shadow-md";

export const GOLD_BTN =
  `${TOUCH_BTN} border border-[#D4AF37]/40 bg-gradient-to-b from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#E8C547] hover:border-[#D4AF37]/60 hover:from-[#D4AF37]/30`;

export const GOLD_BTN_ACTIVE =
  "border-[#D4AF37] bg-gradient-to-b from-[#D4AF37]/35 to-[#D4AF37]/15 text-[#F0D060] shadow-[0_0_20px_rgba(212,175,55,0.15)]";

export const CARD_BASE =
  "rounded-2xl border border-rw-line/80 bg-gradient-to-b from-rw-surface to-rw-surfaceAlt/80 shadow-sm";

export const KPI_BOX =
  "flex min-w-[7.5rem] flex-col rounded-xl border border-rw-line/60 bg-rw-surfaceAlt/90 px-3 py-2 shadow-sm";

export const INPUT_POS =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-base text-rw-ink placeholder:text-rw-muted focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30";

export const LABEL_POS = "block text-xs font-bold uppercase tracking-wide text-rw-muted mb-1.5";
