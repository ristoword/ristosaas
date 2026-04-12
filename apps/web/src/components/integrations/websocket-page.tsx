"use client";

import { useState, useEffect, useRef } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Monitor,
  Smartphone,
  Radio,
  ArrowDown,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";

type WsMessage = { id: string; ts: string; channel: string; payload: string; direction: "in" | "out" };
type WsClient = { id: string; user: string; device: string; channel: string; connectedAt: string };

const mockClients: WsClient[] = [
  { id: "c1", user: "admin@ristodemo.it", device: "Desktop", channel: "sala", connectedAt: "08:15" },
  { id: "c2", user: "marco.r@ristodemo.it", device: "Tablet", channel: "sala", connectedAt: "11:30" },
  { id: "c3", user: "sara.l@ristodemo.it", device: "Mobile", channel: "kds", connectedAt: "12:00" },
  { id: "c4", user: "cucina@ristodemo.it", device: "Desktop", channel: "kds", connectedAt: "07:45" },
];

const channels = ["sala", "kds", "cassa", "prenotazioni"];

function generateMessages(): WsMessage[] {
  const payloads = [
    { ch: "sala", payload: 'table.update { id: "t2", stato: "aperto" }' },
    { ch: "kds", payload: 'order.new { id: "ORD-088", tavolo: "3" }' },
    { ch: "sala", payload: 'table.update { id: "t5", stato: "conto" }' },
    { ch: "cassa", payload: 'receipt.print { id: "REC-042" }' },
    { ch: "kds", payload: 'course.ready { ordine: "ORD-085", corso: 2 }' },
    { ch: "prenotazioni", payload: 'booking.new { nome: "Rossi", coperti: 4 }' },
    { ch: "sala", payload: 'table.update { id: "t8", stato: "libero" }' },
    { ch: "kds", payload: 'order.new { id: "ORD-089", tavolo: "7" }' },
    { ch: "sala", payload: "ping" },
    { ch: "cassa", payload: 'payment.received { importo: 42.50 }' },
    { ch: "kds", payload: 'course.ready { ordine: "ORD-087", corso: 1 }' },
    { ch: "prenotazioni", payload: 'booking.cancel { id: "BK-12" }' },
    { ch: "sala", payload: 'table.update { id: "t10", stato: "aperto" }' },
    { ch: "kds", payload: 'order.update { id: "ORD-086", stato: "pronto" }' },
    { ch: "sala", payload: "pong" },
    { ch: "cassa", payload: 'z.close { totale: 3842.50 }' },
    { ch: "kds", payload: 'order.new { id: "ORD-090", tavolo: "1" }' },
    { ch: "sala", payload: 'table.update { id: "t4", stato: "libero" }' },
    { ch: "prenotazioni", payload: 'booking.remind { id: "BK-15" }' },
    { ch: "cassa", payload: 'receipt.print { id: "REC-043" }' },
  ];
  const now = Date.now();
  return payloads.map((p, i) => ({
    id: `m${i}`,
    ts: new Date(now - (payloads.length - i) * 8000).toLocaleTimeString("it-IT"),
    channel: p.ch,
    payload: p.payload,
    direction: i % 3 === 0 ? "out" : "in",
  }));
}

export function WebsocketPage() {
  const [connected, setConnected] = useState(true);
  const [messages] = useState<WsMessage[]>(generateMessages);
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set(channels));
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [messages]);

  function toggleChannel(ch: string) {
    setSubscribedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  const filteredMessages = messages.filter((m) => subscribedChannels.has(m.channel));

  return (
    <div className="space-y-6">
      <PageHeader title="WebSocket monitor" subtitle="Stato connessione e traffico real-time">
        <button
          type="button"
          onClick={() => setConnected((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
            connected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400",
          )}
        >
          {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {connected ? "Connesso" : "Disconnesso"}
        </button>
        {!connected && (
          <button type="button" onClick={() => setConnected(true)} className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink">
            <RefreshCw className="h-4 w-4" /> Riconnetti
          </button>
        )}
      </PageHeader>

      {/* stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
          <div className="flex items-center gap-2 text-rw-muted"><Users className="h-4 w-4 text-rw-accent" /><span className="text-xs font-semibold uppercase tracking-wide">Client connessi</span></div>
          <p className="mt-2 font-display text-2xl font-bold text-rw-ink">{mockClients.length}</p>
        </div>
        <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
          <div className="flex items-center gap-2 text-rw-muted"><Radio className="h-4 w-4 text-blue-400" /><span className="text-xs font-semibold uppercase tracking-wide">Canali attivi</span></div>
          <p className="mt-2 font-display text-2xl font-bold text-rw-ink">{subscribedChannels.size}</p>
        </div>
        <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
          <div className="flex items-center gap-2 text-rw-muted"><Zap className="h-4 w-4 text-amber-400" /><span className="text-xs font-semibold uppercase tracking-wide">Messaggi (ultimi 20)</span></div>
          <p className="mt-2 font-display text-2xl font-bold text-rw-ink">{filteredMessages.length}</p>
        </div>
      </div>

      {/* channels */}
      <Card title="Canali" description="Filtra i messaggi per canale">
        <div className="flex flex-wrap gap-2">
          {channels.map((ch) => (
            <button key={ch} type="button" onClick={() => toggleChannel(ch)} className={cn("rounded-xl px-4 py-2 text-sm font-semibold transition", subscribedChannels.has(ch) ? "bg-rw-accent/15 text-rw-accent" : "border border-rw-line bg-rw-surfaceAlt text-rw-muted")}>
              {ch}
            </button>
          ))}
        </div>
      </Card>

      {/* connected clients */}
      <Card title="Client connessi">
        <div className="space-y-2">
          {mockClients.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
              {c.device === "Desktop" ? <Monitor className="h-5 w-5 text-rw-accent" /> : <Smartphone className="h-5 w-5 text-rw-accent" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rw-ink">{c.user}</p>
                <p className="text-xs text-rw-muted">{c.device} · da {c.connectedAt}</p>
              </div>
              <Chip label={c.channel} tone="info" />
            </div>
          ))}
        </div>
      </Card>

      {/* message log */}
      <Card title="Log messaggi" headerRight={<span className="flex items-center gap-1.5 text-xs text-rw-muted"><ArrowDown className="h-3.5 w-3.5" /> Auto-scroll</span>}>
        <div ref={logRef} className="max-h-80 space-y-1 overflow-y-auto font-mono text-xs">
          {filteredMessages.length === 0 && <p className="py-6 text-center text-sm text-rw-muted">Nessun messaggio per i canali selezionati.</p>}
          {filteredMessages.map((m) => (
            <div key={m.id} className="flex gap-3 rounded-lg px-2 py-1.5 hover:bg-rw-surfaceAlt">
              <span className="shrink-0 text-rw-muted">{m.ts}</span>
              <span className={cn("shrink-0 font-semibold", m.direction === "in" ? "text-emerald-400" : "text-blue-400")}>
                {m.direction === "in" ? "←" : "→"}
              </span>
              <span className="shrink-0 font-semibold text-rw-accent">[{m.channel}]</span>
              <span className="min-w-0 break-all text-rw-soft">{m.payload}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
