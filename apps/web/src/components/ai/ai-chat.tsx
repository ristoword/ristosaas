"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AiMessage = { role: "user" | "assistant"; content: string; ts: number };

type AiResponse = {
  match: RegExp;
  reply: string;
};

const GENERIC_REPLIES = [
  "Analizzando i dati a disposizione, posso confermare che la situazione è nella norma. Vuoi un report dettagliato?",
  "Ho verificato le informazioni. Tutto sembra in ordine. Hai bisogno di altro?",
  "Basandomi sui dati disponibili, ti consiglio di controllare le scorte critiche. Vuoi che le elenchi?",
];

function simulateAI(input: string, context: string): string {
  const lower = input.toLowerCase();

  const contextRules: Record<string, AiResponse[]> = {
    cucina: [
      { match: /comand|ordin/i, reply: "Ci sono comande in attesa di preparazione. Ti consiglio di dare priorità ai tavoli che attendono da più di 10 minuti. Vuoi che li elenchi?" },
      { match: /temp|haccp|frigo/i, reply: "Le temperature registrate oggi sono nella norma. Frigo 1: 3°C, Frigo 2: 4°C, Abbattitore: -18°C. Tutto conforme HACCP." },
      { match: /ricett|ingredien|food cost/i, reply: "Posso aiutarti con il calcolo del food cost. Dimmi il nome del piatto e ti fornirò un'analisi dettagliata degli ingredienti e dei costi." },
      { match: /turni|personale|staff/i, reply: "Oggi sono presenti 3 cuochi su 4 previsti. Il turno serale inizia alle 17:00. Vuoi che verifichi la copertura?" },
    ],
    cassa: [
      { match: /incass|fattur|totale|chiusur/i, reply: "L'incasso attuale della giornata è nella media. Rispetto a ieri alla stessa ora siamo al +12%. Vuoi il dettaglio per metodo di pagamento?" },
      { match: /scontrino|ricevut/i, reply: "Scontrino medio oggi: €42.50. I tavoli con spesa più alta sono il T8 (€320) e il T3 (€210). Vuoi un'analisi dei piatti più ordinati?" },
      { match: /scont|promozione/i, reply: "Gli sconti applicati oggi ammontano a €45.50 su un totale lordo di €1,250. Il tasso di sconto è del 3.6%, nella norma." },
      { match: /storn|annull/i, reply: "Oggi ci sono stati 2 storni per un totale di €23.50. Il motivo principale è 'piatto errato'. Ti consiglio di verificare con il personale di sala." },
    ],
    supervisor: [
      { match: /report|andamento|performance/i, reply: "Report giornaliero: Incasso lordo €1,036.00, Storni €45.50, Netto €990.50. Coperti serviti: 32. Scontrino medio: €34.50. Il food cost si attesta al 28%, in linea con il target." },
      { match: /food cost|costo|spesa/i, reply: "Il food cost reale basato sugli scarichi di magazzino è del 28.5%. I piatti con food cost più alto sono: Tagliata di manzo (35%), Branzino al forno (33%). Ti suggerisco di rivedere il pricing." },
      { match: /personale|staff|turni/i, reply: "Presenti oggi 5 su 8 dipendenti. Costo personale stimato: €580. Rapporto costo personale/incasso: 58.5%. È leggermente alto, consiglio di ottimizzare i turni." },
      { match: /magazzino|scorte|sotto soglia/i, reply: "3 prodotti sotto soglia: Pomodori SM (3kg, min 5kg), Mozzarella bufala (2kg, min 5kg), Birra artigianale (4 casse, min 6). Ordine automatico consigliato." },
    ],
    magazzino: [
      { match: /ordine|ordina|riordino/i, reply: "Basandomi sui consumi degli ultimi 7 giorni, ti consiglio di ordinare: Pomodori SM 20kg, Mozzarella 15kg, Birra 6 casse. Vuoi che prepari l'ordine?" },
      { match: /scorta|sotto soglia|esaurit/i, reply: "3 prodotti sotto soglia minima: Pomodori SM, Mozzarella bufala, Birra artigianale. Ti consiglio un ordine urgente per domani mattina." },
      { match: /consumo|utilizzo|scaric/i, reply: "Consumo medio giornaliero: Farina 8kg, Mozzarella 5kg, Pomodori 6kg, Olio EVO 2L. A questo ritmo, la farina durerà 15 giorni." },
      { match: /lista.*spesa|spesa/i, reply: "Ecco la lista della spesa consigliata per domani: Mozzarella bufala 10kg (Caseificio Ferrara), Pomodori SM 15kg (Ortofrutticola Sud), Basilico 3kg. Totale stimato: €185." },
    ],
    prenotazioni: [
      { match: /marco rossi/i, reply: "Marco Rossi è un cliente abituale (12 visite negli ultimi 3 mesi). Spesa media: €85. Preferisce la sala principale. Nessuna allergia segnalata. Festeggia spesso compleanni qui." },
      { match: /giuseppe verdi/i, reply: "⚠️ Giuseppe Verdi ha un'intolleranza al glutine (celiachia). Cliente abituale (8 visite). Preferisce la sala privata per gruppi numerosi. Spesa media: €150." },
      { match: /allergi|intolleranz|celiac|glutine|lattosio/i, reply: "Clienti con allergie/intolleranze note: Giuseppe Verdi (celiachia), Laura Bianchi (lattosio). Assicurati che il personale di sala sia informato prima del servizio." },
      { match: /abituale|fedel|frequen/i, reply: "Clienti abituali top 5: 1) Marco Rossi (12 visite, €85 media), 2) Giuseppe Verdi (8 visite, €150), 3) Anna Neri (6 visite, €65), 4) Francesco Costa (5 visite, €200). Vuoi dettagli?" },
      { match: /walk.?in|passaggio/i, reply: "Oggi sono previsti 4 walk-in basandomi sulla media storica del sabato. Ti consiglio di tenere 2-3 tavoli liberi dopo le 20:30." },
    ],
    fornitori: [
      { match: /ordine|ordina/i, reply: "Basandomi sulle scorte e i consumi, ti suggerisco: Ordine urgente a Caseificio Ferrara (Mozzarella 15kg) e Ortofrutticola Sud (Pomodori 20kg, Basilico 5kg). Confermi?" },
      { match: /fornitur|prezzo|costo|confronto/i, reply: "Confronto prezzi mozzarella: Caseificio Ferrara €12.50/kg vs media mercato €10.80/kg (+15.7%). La qualità DOP giustifica il premium? Vuoi cercare alternative?" },
      { match: /pagament|scadenz|fattur/i, reply: "3 fatture in scadenza nei prossimi 7 giorni: Molino Rossi €91.50 (10/05), Oleificio Ferrante €178 (05/05), Cantina dei Colli €216 (03/07). Totale: €485.50." },
      { match: /ritardo|consegna|problema/i, reply: "Nessun ritardo nelle consegne questa settimana. Ortofrutticola Sud ha confermato la consegna giornaliera ore 6:00. Caseificio Ferrara: prossima consegna martedì." },
    ],
  };

  const rules = contextRules[context] || [];
  for (const rule of rules) {
    if (rule.match.test(lower)) return rule.reply;
  }

  return GENERIC_REPLIES[Math.floor(Math.random() * GENERIC_REPLIES.length)];
}

type Props = {
  context: string;
  open: boolean;
  onClose: () => void;
  title?: string;
  onAction?: (action: string, data: Record<string, unknown>) => void;
};

export function AiChat({ context, open, onClose, title, onAction }: Props) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: AiMessage = { role: "user", content: text, ts: Date.now() };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    setTimeout(() => {
      const reply = simulateAI(text, context);
      setMessages((p) => [...p, { role: "assistant", content: reply, ts: Date.now() }]);
      setLoading(false);
    }, 600 + Math.random() * 800);
  }, [input, loading, context]);

  const addVoiceText = useCallback((text: string) => {
    setInput(text);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 max-w-full flex-col border-l border-rw-line bg-rw-surface shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rw-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rw-accent" />
          <span className="font-display text-sm font-semibold text-rw-ink">{title || "AI Assistant"}</span>
        </div>
        <button type="button" onClick={onClose} className="text-rw-muted hover:text-rw-ink">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-rw-muted">
            <Bot className="h-10 w-10 opacity-30" />
            <p className="text-sm">Chiedimi qualsiasi cosa.</p>
            <p className="text-xs">Posso aiutarti con analisi, suggerimenti e operazioni.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.ts} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "bg-rw-accent text-white"
                : "border border-rw-line bg-rw-surfaceAlt text-rw-ink",
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-3.5 py-2.5 text-sm text-rw-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Sto pensando…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-rw-line px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Scrivi o usa il microfono…"
            className="flex-1 rounded-xl border border-rw-line bg-rw-bg px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent"
          />
          <button type="button" onClick={send} disabled={loading || !input.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-accent text-white transition hover:bg-rw-accent/85 disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AiToggleButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm font-semibold text-rw-accent transition hover:bg-rw-accent/20">
      <Sparkles className="h-4 w-4" /> {label || "AI Assistant"}
    </button>
  );
}
