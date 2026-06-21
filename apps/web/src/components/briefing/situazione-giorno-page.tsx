"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Armchair,
  CalendarCheck,
  ChefHat,
  ClipboardList,
  Loader2,
  Mic,
  MicOff,
  Package,
  Pause,
  Play,
  RefreshCcw,
  ShoppingBag,
  Users,
  Volume2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import type { OperationalBriefing } from "@/lib/db/repositories/operational-briefing.repository";

type BriefingResponse = {
  briefing: OperationalBriefing;
  narrative: string;
  source?: string;
};

const SPEECH_LANG = "it-IT";

function euro(n: number) {
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

function fmtLiveTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function LiveDataBadge({ generatedAt, loading }: { generatedAt?: string; loading?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        loading
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      )}
      title={generatedAt ? `Ultimo aggiornamento: ${fmtLiveTime(generatedAt)}` : "In attesa del primo caricamento"}
    >
      <span className="relative flex h-2 w-2">
        {!loading && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            loading ? "bg-amber-400" : "bg-emerald-400",
          )}
        />
      </span>
      {loading ? "Aggiornamento in corso…" : "Dati live"}
      {generatedAt && !loading && (
        <span className="font-normal text-emerald-400/80">· {fmtLiveTime(generatedAt)}</span>
      )}
    </span>
  );
}

function speakText(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = SPEECH_LANG;
  utter.rate = 0.95;
  utter.pitch = 1;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
  return utter;
}

function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } }; length: number } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionType;
    webkitSpeechRecognition?: new () => SpeechRecognitionType;
  };
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function SituazioneGiornoPage() {
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [narrating, setNarrating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionType | null>(null);

  const load = useCallback(async (withAi = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operational-briefing/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "it", enhance: withAi }),
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Errore ${res.status}`);
      }
      const json = await res.json() as BriefingResponse;
      setData(json);
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => stopSpeaking();
  }, [load]);

  const handleListen = useCallback(async () => {
    setNarrating(true);
    const result = data ?? await load(true);
    setNarrating(false);
    if (!result?.narrative) return;

    setSpeaking(true);
    speakText(result.narrative, () => setSpeaking(false));
  }, [data, load]);

  const handleVoiceCommand = useCallback(() => {
    const rec = getSpeechRecognition();
    if (!rec) {
      void handleListen();
      return;
    }

    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }

    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = SPEECH_LANG;
    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript?.toLowerCase() ?? "";
      if (
        transcript.includes("situazione") ||
        transcript.includes("riepilogo") ||
        transcript.includes("oggi") ||
        transcript.includes("risto")
      ) {
        void handleListen();
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, handleListen]);

  const b = data?.briefing;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Situazione del Giorno"
        subtitle="Briefing operativo completo — prenotazioni, staff, cucina, magazzino e cose da fare."
      >
        <div className="flex flex-wrap items-center gap-2">
          <LiveDataBadge generatedAt={b?.generatedAt} loading={loading} />
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-ink hover:bg-rw-surface disabled:opacity-50"
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            Aggiorna
          </button>
          {speaking ? (
            <button
              type="button"
              onClick={() => { stopSpeaking(); setSpeaking(false); }}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400"
            >
              <Pause className="h-4 w-4" /> Ferma lettura
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleListen()}
              disabled={narrating || loading}
              className="flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2 text-xs font-semibold text-white hover:bg-rw-accent/85 disabled:opacity-50"
            >
              {narrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              {narrating ? "Preparo il briefing…" : "Ascolta briefing"}
            </button>
          )}
          <button
            type="button"
            onClick={handleVoiceCommand}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition",
              listening
                ? "border-red-500/40 bg-red-500/15 text-red-400 animate-pulse"
                : "border-rw-line bg-rw-surfaceAlt text-rw-ink hover:border-rw-accent/30",
            )}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening ? "Ascolto…" : "Risto, situazione"}
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && !b ? (
        <div className="flex items-center justify-center py-24 text-rw-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento situazione operativa…
        </div>
      ) : b ? (
        <>
          {/* Data label */}
          <div className="rounded-2xl border border-rw-accent/20 bg-gradient-to-br from-rw-accent/10 to-rw-accent/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-rw-accent capitalize">{b.dateLabel}</p>
              <LiveDataBadge generatedAt={b.generatedAt} loading={loading} />
            </div>
            <p className="mt-1 text-[11px] text-rw-muted">
              Dati letti in tempo reale dal gestionale — nessun dato demo o simulato.
            </p>
            {data?.narrative && (
              <p className="mt-2 text-sm text-rw-soft leading-relaxed line-clamp-4">{data.narrative}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleListen()}
                disabled={speaking || narrating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rw-accent/20 px-3 py-1.5 text-xs font-semibold text-rw-accent hover:bg-rw-accent/30"
              >
                <Play className="h-3.5 w-3.5" /> Leggi tutto ad alta voce
              </button>
              {data?.source && (
                <span className="text-[10px] text-rw-muted">
                  {data.source === "ai" ? "Narrato da AI" : "Narrato automaticamente"}
                </span>
              )}
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={<CalendarCheck className="h-5 w-5 text-rw-accent" />}
              label="Prenotazioni oggi"
              value={String(b.reservations.total)}
              sub={`${b.reservations.totalCovers} coperti`}
            />
            <KpiCard
              icon={<Users className="h-5 w-5 text-emerald-400" />}
              label="Staff in servizio"
              value={String(b.staff.onDutyCount)}
              sub={`${b.staff.plannedCount} turni pianificati`}
            />
            <KpiCard
              icon={<ChefHat className="h-5 w-5 text-orange-400" />}
              label="Comande attive"
              value={String(b.restaurant.activeOrders)}
              sub={`${b.restaurant.ordersToday} ordini oggi`}
            />
            <KpiCard
              icon={<ClipboardList className="h-5 w-5 text-amber-400" />}
              label="Cose da fare"
              value={String(b.tasks.unreadCount)}
              sub={`${b.warehouse.lowStockCount} sotto scorta`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Prenotazioni */}
            <Section
              title="Prenotazioni di oggi"
              icon={<Armchair className="h-4 w-4" />}
              badge={b.reservations.newToday > 0 ? `${b.reservations.newToday} nuove` : undefined}
            >
              {b.reservations.list.length === 0 ? (
                <EmptyState text="Nessuna prenotazione per oggi." />
              ) : (
                <div className="space-y-2">
                  {b.reservations.list.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt/50 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-rw-ink">{r.customerName}</p>
                        <p className="text-xs text-rw-muted">
                          {r.time} · {r.guests} coperti · Tavolo {r.table || "—"}
                        </p>
                        {(r.notes || r.allergies) && (
                          <p className="mt-1 text-xs text-amber-400">
                            {[r.allergies && `Allergie: ${r.allergies}`, r.notes].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <StatusPill status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Staff */}
            <Section title="Staff presente" icon={<Users className="h-4 w-4" />}>
              {b.staff.onDuty.length === 0 && b.staff.planned.length === 0 ? (
                <EmptyState text="Nessun turno registrato per oggi." />
              ) : (
                <div className="space-y-3">
                  {b.staff.onDuty.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-400">In servizio adesso</p>
                      <div className="flex flex-wrap gap-2">
                        {b.staff.onDuty.map((s, i) => (
                          <span key={i} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                            {s.name} ({s.role})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {b.staff.planned.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rw-muted">Turni pianificati</p>
                      <div className="space-y-1.5">
                        {b.staff.planned.slice(0, 8).map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-rw-soft">
                            <span className="font-medium text-rw-ink">{s.name}</span>
                            <span>{s.area} · {s.startTime}–{s.endTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Cucina */}
            <Section title="Comande e prodotti da preparare" icon={<ChefHat className="h-4 w-4" />} badge={String(b.kitchen.activeComande.length)}>
              {b.kitchen.activeComande.length === 0 ? (
                <EmptyState text="Nessuna comanda attiva al momento." />
              ) : (
                <div className="space-y-2">
                  {b.kitchen.activeComande.slice(0, 8).map((o) => (
                    <div key={o.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt/50 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-rw-ink">Tavolo {o.table} · {o.area}</p>
                        <StatusPill status={o.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-rw-muted">{o.items.slice(0, 4).join(", ")}{o.items.length > 4 ? "…" : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Magazzino + task */}
            <Section title="Merce e cose da fare" icon={<Package className="h-4 w-4" />}>
              <div className="space-y-3">
                {b.warehouse.lowStockCount > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" /> {b.warehouse.lowStockCount} prodotti sotto scorta
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {b.warehouse.lowStock.slice(0, 6).map((i) => (
                        <span key={i.name} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                          {i.name}: {i.qty}/{i.minStock} {i.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {b.warehouse.pendingOrdersCount > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-rw-muted">
                      <ShoppingBag className="h-3.5 w-3.5" /> Ordini fornitore in attesa
                    </p>
                    {b.warehouse.pendingOrders.map((po) => (
                      <p key={po.code} className="text-xs text-rw-soft">{po.code} — {po.supplier} ({po.status})</p>
                    ))}
                  </div>
                )}
                {b.tasks.items.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rw-muted">Notifiche da completare</p>
                    {b.tasks.items.map((t) => (
                      <div key={t.id} className="mb-1.5 rounded-lg border border-rw-line bg-rw-surfaceAlt/40 px-3 py-2">
                        <p className="text-xs font-semibold text-rw-ink">{t.title}</p>
                        {t.message && <p className="text-[11px] text-rw-muted">{t.message}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-rw-muted">Nessuna notifica in sospeso.</p>
                )}
              </div>
            </Section>
          </div>

          {/* Revenue + hotel row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Incasso stimato oggi</p>
              <p className="mt-1 text-2xl font-bold text-rw-ink">{euro(b.restaurant.revenueToday)}</p>
              <p className="text-xs text-rw-muted">{b.restaurant.completedToday} ordini completati</p>
            </div>
            {b.hotel && (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">Hotel</p>
                <p className="mt-1 text-lg font-bold text-rw-ink">
                  {b.hotel.occupiedRooms}/{b.hotel.totalRooms} camere occupate
                </p>
                <p className="text-xs text-rw-muted">
                  Arrivi: {b.hotel.arrivalsToday} · Partenze: {b.hotel.departuresToday} · HK: {b.hotel.housekeepingPending}
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Comande per area</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(b.restaurant.byArea).map(([area, count]) => (
                  <span key={area} className="rounded-full border border-rw-line bg-rw-surfaceAlt px-2.5 py-0.5 text-xs text-rw-soft">
                    {area}: {count}
                  </span>
                ))}
                {Object.keys(b.restaurant.byArea).length === 0 && (
                  <span className="text-xs text-rw-muted">Nessuna comanda attiva</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
      <div className="flex items-center gap-2 text-rw-muted">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="mt-2 text-2xl font-bold text-rw-ink">{value}</p>
      <p className="text-xs text-rw-muted">{sub}</p>
    </div>
  );
}

function Section({ title, icon, badge, children }: { title: string; icon: React.ReactNode; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-rw-ink">{icon}{title}</h2>
        {badge && <span className="rounded-full bg-rw-accent/15 px-2 py-0.5 text-[10px] font-semibold text-rw-accent">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-rw-muted">{text}</p>;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confermata: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    in_attesa: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    in_preparazione: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    pronto: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    servito: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", styles[status] ?? "border-rw-line bg-rw-surfaceAlt text-rw-muted")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
