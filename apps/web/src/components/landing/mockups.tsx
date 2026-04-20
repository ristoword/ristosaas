import {
  ArrowUpRight,
  Bell,
  Bed,
  Calendar,
  ChefHat,
  CreditCard,
  MoreHorizontal,
  Receipt,
  Search,
  Sparkles,
  Utensils,
  Wine,
} from "lucide-react";

/**
 * Pure-JSX mocked product UI. No data, no i18n, no state.
 * Used both inside the hero showcase and the dashboard preview section.
 */

export function DashboardMockup() {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-landing-surface/95 shadow-landing-card backdrop-blur-xl">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-landing-grid bg-[length:28px_28px] opacity-[0.08]" />

      <header className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-landing-soft">
          <Search className="h-3 w-3" aria-hidden />
          ristosaas.app / dashboard
        </div>
        <div className="flex items-center gap-2 text-landing-soft">
          <Bell className="h-3.5 w-3.5" aria-hidden />
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-landing-violet to-landing-magenta" />
        </div>
      </header>

      <div className="grid grid-cols-[160px_1fr] gap-0">
        <aside className="border-r border-white/5 bg-white/[0.02] px-3 py-4">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-landing-muted">
            Moduli
          </p>
          <ul className="mt-3 space-y-1 text-[12px]">
            {[
              { label: "Dashboard", Icon: Sparkles, active: true },
              { label: "Ristorante", Icon: Utensils },
              { label: "Hotel", Icon: Bed },
              { label: "Ordini", Icon: Receipt },
              { label: "Billing", Icon: CreditCard },
              { label: "Cucina", Icon: ChefHat },
              { label: "Bar", Icon: Wine },
            ].map((row) => (
              <li key={row.label}>
                <span
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${
                    row.active
                      ? "bg-gradient-to-r from-landing-violet/20 to-landing-magenta/10 text-landing-ink"
                      : "text-landing-soft"
                  }`}
                >
                  <row.Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="truncate">{row.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-landing-muted">Oggi · Venerdì</p>
              <p className="mt-0.5 font-display text-lg font-semibold text-landing-ink">
                Ciao, Chef.
              </p>
            </div>
            <span className="rounded-full border border-landing-line bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-landing-soft">
              Live
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Incasso", value: "€ 8.420", trend: "+12%" },
              { label: "Coperti", value: "214", trend: "+7%" },
              { label: "Camere", value: "38/42", trend: "91%" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-landing-line bg-landing-card p-3"
              >
                <p className="text-[10px] uppercase tracking-wider text-landing-muted">
                  {kpi.label}
                </p>
                <p className="mt-1 font-display text-[18px] font-semibold text-landing-ink">
                  {kpi.value}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-[#7fe0b2]">{kpi.trend}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-landing-line bg-landing-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-landing-ink">Revenue · 7gg</p>
              <MoreHorizontal className="h-3.5 w-3.5 text-landing-muted" aria-hidden />
            </div>
            <div className="mt-3 flex h-20 items-end gap-1.5">
              {[42, 55, 38, 68, 52, 74, 88].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="flex-1 rounded-md bg-gradient-to-t from-landing-violet/70 to-landing-magenta"
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-landing-line bg-landing-card p-3">
              <p className="text-[11px] font-semibold text-landing-ink">Ordini in corso</p>
              <ul className="mt-2 space-y-1.5 text-[10px] text-landing-soft">
                <li className="flex items-center justify-between">
                  <span>Tavolo 7 · 4 coperti</span>
                  <span className="text-landing-magentaSoft">in preparazione</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Asporto #A-214</span>
                  <span className="text-[#7fe0b2]">pronto</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Tavolo 12 · 2 coperti</span>
                  <span className="text-landing-soft">conto</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-landing-line bg-landing-card p-3">
              <p className="text-[11px] font-semibold text-landing-ink">Check-in oggi</p>
              <ul className="mt-2 space-y-1.5 text-[10px] text-landing-soft">
                <li className="flex items-center justify-between">
                  <span>Room 204 · J. Moretti</span>
                  <span className="text-landing-magentaSoft">15:00</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Suite 301 · A. Reyes</span>
                  <span className="text-landing-magentaSoft">16:30</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Room 112 · L. Conti</span>
                  <span className="text-landing-soft">18:00</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TabletMockup() {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-landing-surface/95 shadow-landing-card backdrop-blur-xl">
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-landing-muted">
          Sala · tavoli attivi
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4">
        {[
          { label: "T1", tone: "from-emerald-500/30 to-emerald-400/10", status: "libero" },
          { label: "T2", tone: "from-landing-magenta/40 to-landing-magenta/10", status: "aperto" },
          { label: "T3", tone: "from-landing-violet/40 to-landing-violet/10", status: "conto" },
          { label: "T4", tone: "from-amber-500/30 to-amber-400/10", status: "sporco" },
          { label: "T5", tone: "from-emerald-500/30 to-emerald-400/10", status: "libero" },
          { label: "T6", tone: "from-landing-magenta/40 to-landing-magenta/10", status: "aperto" },
        ].map((t) => (
          <div
            key={t.label}
            className={`rounded-xl border border-landing-line bg-gradient-to-br ${t.tone} p-3`}
          >
            <p className="font-display text-sm font-semibold text-landing-ink">{t.label}</p>
            <p className="mt-1 text-[9px] uppercase tracking-wider text-landing-soft">{t.status}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 px-4 py-3 text-[10px] text-landing-soft">
        <div className="flex items-center justify-between">
          <span>Incasso sala</span>
          <span className="font-semibold text-landing-ink">€ 2.184</span>
        </div>
      </div>
    </div>
  );
}

export function PhoneMockup({ variant = "orders" }: { variant?: "orders" | "bookings" }) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-landing-surface/95 shadow-landing-card backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5 text-[10px] text-landing-soft">
        <span>9:41</span>
        <span className="h-1.5 w-10 rounded-full bg-white/10" aria-hidden />
        <span>94%</span>
      </div>

      {variant === "orders" ? (
        <div className="space-y-2 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-landing-muted">
            Ordini · live
          </p>
          {[
            { id: "#214", title: "Tavolo 7", tone: "text-landing-magentaSoft", status: "in prep." },
            { id: "#215", title: "Asporto", tone: "text-[#7fe0b2]", status: "pronto" },
            { id: "#216", title: "Tavolo 12", tone: "text-landing-soft", status: "conto" },
            { id: "#217", title: "Delivery", tone: "text-landing-magentaSoft", status: "in consegna" },
          ].map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-xl border border-landing-line bg-landing-card px-3 py-2.5"
            >
              <div>
                <p className="text-[11px] font-semibold text-landing-ink">{row.title}</p>
                <p className="text-[9px] text-landing-muted">{row.id}</p>
              </div>
              <span className={`text-[10px] font-semibold ${row.tone}`}>{row.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-landing-muted">
            Prenotazioni
          </p>
          {[
            { name: "J. Moretti", meta: "Sab 21:00 · 4p", tone: "from-landing-violet/40 to-landing-magenta/20" },
            { name: "A. Reyes", meta: "Dom 20:30 · 2p", tone: "from-landing-magenta/40 to-landing-pink/20" },
            { name: "L. Conti", meta: "Lun 19:45 · 6p", tone: "from-landing-violet/40 to-landing-violet/10" },
          ].map((row) => (
            <div
              key={row.name}
              className={`rounded-xl border border-landing-line bg-gradient-to-br ${row.tone} p-3`}
            >
              <p className="text-[11px] font-semibold text-landing-ink">{row.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-landing-soft">
                <Calendar className="h-3 w-3" aria-hidden />
                {row.meta}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GenericBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-landing-line bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-landing-soft">
      <ArrowUpRight className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}
