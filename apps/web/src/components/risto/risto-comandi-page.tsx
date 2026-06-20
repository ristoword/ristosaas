"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Send,
  Bot,
  Loader2,
  ChefHat,
  Package,
  Wine,
  Sparkles,
  ClipboardList,
  BarChart3,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { aiApi } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";

type AiMessage = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  isAction?: boolean;
};

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onspeechend: (() => void) | null;
};

type SpeechRecognitionResultList = {
  [index: number]: { [index: number]: { transcript: string }; isFinal: boolean };
  length: number;
};

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionType;
    webkitSpeechRecognition?: new () => SpeechRecognitionType;
  };
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

const QUICK_COMMANDS = [
  { icon: ChefHat, label: "Crea ricetta", prompt: "Risto, crea una nuova ricetta", color: "text-orange-400" },
  { icon: Package, label: "Controlla scorte", prompt: "Risto, come stiamo con le scorte?", color: "text-blue-400" },
  { icon: Wine, label: "Aggiungi vino", prompt: "Risto, aggiungi un nuovo vino in cantina", color: "text-purple-400" },
  { icon: ClipboardList, label: "Lista ordine", prompt: "Risto, prepara la lista ordine fornitore", color: "text-emerald-400" },
  { icon: BarChart3, label: "Riepilogo giornata", prompt: "Risto, dammi il riepilogo di oggi", color: "text-amber-400" },
  { icon: ChefHat, label: "Aggiorna stock", prompt: "Risto, segna il carico di oggi", color: "text-cyan-400" },
];

const EXAMPLE_COMMANDS = [
  "Risto crea una ricetta per la carbonara con guanciale, uova, pecorino e pepe nero",
  "Risto inserisci ricetta tiramisù con passaggi e dosi per spiegarla ai cuochi",
  "Risto segna 10 kg di filetto per l'ordine di stasera",
  "Risto carica questa bolla: 5 kg farina, 3 L olio, 2 kg pomodori",
  "Risto aggiungi un Brunello di Montalcino 2018 in cantina a 45 euro",
  "Risto prepara lista verdure pronta per l'ordine al fornitore",
  "Risto quanta mozzarella abbiamo in magazzino?",
  "Risto come stiamo oggi? Riepilogo completo",
];

export function RistoComandiPage() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionType | null>(null);

  useEffect(() => {
    const r = getSpeechRecognition();
    if (!r) {
      setVoiceSupported(false);
      return;
    }
    r.continuous = true;
    r.interimResults = true;
    r.lang = "it-IT";
    recRef.current = r;
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, liveTranscript]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setInput("");
      setLiveTranscript("");

      const userMsg: AiMessage = { role: "user", content: trimmed, ts: Date.now() };
      setMessages((p) => [...p, userMsg]);
      setLoading(true);

      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

      aiApi
        .chat({ context: "risto", message: trimmed, history, enableTools: true })
        .then((data) => {
          const reply = String(data.reply || "").trim();
          if (!reply) throw new Error("Risposta vuota");

          const hasActions = data.actions && data.actions.length > 0;
          setMessages((p) => [
            ...p,
            { role: "assistant", content: reply, ts: Date.now(), isAction: hasActions },
          ]);
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "Errore";
          setMessages((p) => [
            ...p,
            { role: "assistant", content: `Errore: ${msg}`, ts: Date.now() },
          ]);
        })
        .finally(() => setLoading(false));
    },
    [loading, messages],
  );

  const startListening = useCallback(() => {
    const r = recRef.current;
    if (!r) return;

    setLiveTranscript("");
    setListening(true);

    r.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setInput(final);
        setLiveTranscript("");
      } else {
        setLiveTranscript(interim);
      }
    };

    r.onend = () => {
      setListening(false);
      setLiveTranscript((prev) => {
        if (prev) {
          setInput((curInput) => {
            const combined = (curInput + " " + prev).trim();
            return combined;
          });
        }
        return "";
      });
    };

    r.onerror = () => {
      setListening(false);
      setLiveTranscript("");
    };

    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setLiveTranscript("");
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title="Risto Comandi"
        subtitle="Parla o scrivi per gestire il ristorante con la voce"
      >
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-medium text-rw-muted hover:text-rw-ink transition"
          >
            <Trash2 className="h-3.5 w-3.5" /> Nuova conversazione
          </button>
        )}
      </PageHeader>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Chat Area */}
        <div className="flex flex-1 flex-col rounded-2xl border border-rw-line bg-rw-surface/50 overflow-hidden">
          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && !listening && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rw-accent/20 to-purple-500/20 border border-rw-accent/20">
                    <Bot className="h-10 w-10 text-rw-accent" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-rw-accent text-white">
                    <Mic className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-rw-ink">
                    Ciao! Sono Risto
                  </h3>
                  <p className="text-sm text-rw-muted mt-1 max-w-md">
                    Il tuo assistente vocale per gestire il ristorante. Parlami o scrivi,
                    e io eseguirò le azioni direttamente nel gestionale.
                  </p>
                </div>

                <div className="w-full max-w-2xl mt-4">
                  <p className="text-xs font-semibold text-rw-soft uppercase tracking-wider mb-3">
                    Comandi rapidi
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {QUICK_COMMANDS.map((cmd) => {
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.label}
                          type="button"
                          onClick={() => sendMessage(cmd.prompt)}
                          className="flex items-center gap-2.5 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2.5 text-left text-sm text-rw-soft transition hover:border-rw-accent/30 hover:text-rw-ink hover:bg-rw-accent/5"
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", cmd.color)} />
                          {cmd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full max-w-2xl mt-4">
                  <p className="text-xs font-semibold text-rw-soft uppercase tracking-wider mb-3">
                    Esempi di comandi vocali
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {EXAMPLE_COMMANDS.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => sendMessage(ex)}
                        className="rounded-xl border border-rw-line/30 bg-rw-bg/50 px-3 py-2 text-left text-xs text-rw-muted transition hover:border-rw-accent/20 hover:text-rw-soft"
                      >
                        &ldquo;{ex}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.ts}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-rw-accent text-white"
                      : m.isAction
                        ? "border-2 border-emerald-500/30 bg-emerald-500/5 text-rw-ink"
                        : "border border-rw-line bg-rw-surfaceAlt text-rw-ink",
                  )}
                >
                  {m.role === "assistant" && m.isAction && (
                    <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold mb-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Azione eseguita
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}

            {liveTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-rw-accent/20 border border-rw-accent/30 px-4 py-3 text-sm text-rw-accent italic">
                  <Mic className="inline h-3.5 w-3.5 mr-1.5 animate-pulse" />
                  {liveTranscript}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Risto sta lavorando…
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="border-t border-rw-line px-4 py-3 bg-rw-surface">
            <div className="flex items-center gap-2">
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition",
                    listening
                      ? "border-red-500/40 bg-red-500/15 text-red-400 animate-pulse"
                      : "border-rw-line bg-rw-surfaceAlt text-rw-soft hover:text-rw-ink hover:border-rw-accent/30",
                  )}
                  title={listening ? "Ferma ascolto" : "Parla con Risto"}
                >
                  {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={listening ? "Sto ascoltando… parla pure" : 'Scrivi un comando o premi il microfono…'}
                className="flex-1 rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-2 focus:ring-rw-accent/50"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rw-accent text-white transition hover:bg-rw-accent/85 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {listening && (
              <p className="mt-2 text-center text-xs text-red-400 animate-pulse">
                <Mic className="inline h-3 w-3 mr-1" />
                Microfono attivo — sto ascoltando...
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Capabilities — desktop only */}
        <div className="hidden lg:block w-72 shrink-0 space-y-4 overflow-y-auto">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-rw-accent" />
              <h3 className="text-sm font-semibold text-rw-ink">Cosa può fare Risto</h3>
            </div>
            <div className="space-y-3">
              <CapabilityGroup
                icon={ChefHat}
                title="Ricette"
                color="text-orange-400"
                items={[
                  "Creare ricette con ingredienti e dosi",
                  "Inserire passaggi di preparazione",
                  "Calcolare food cost automatico",
                ]}
              />
              <CapabilityGroup
                icon={Package}
                title="Magazzino"
                color="text-blue-400"
                items={[
                  "Caricare e scaricare merci",
                  "Registrare bolle e consegne",
                  "Cercare prodotti e giacenze",
                  "Preparare liste ordine fornitore",
                ]}
              />
              <CapabilityGroup
                icon={Wine}
                title="Cantina"
                color="text-purple-400"
                items={[
                  "Aggiungere vini con tutti i dettagli",
                  "Aggiornare stock bottiglie",
                  "Controllare giacenze cantina",
                ]}
              />
              <CapabilityGroup
                icon={ClipboardList}
                title="Menu"
                color="text-emerald-400"
                items={[
                  "Aggiungere piatti al menu",
                  "Collegare ricette ai piatti",
                ]}
              />
              <CapabilityGroup
                icon={BarChart3}
                title="Report"
                color="text-amber-400"
                items={[
                  "Riepilogo giornaliero completo",
                  "Stato scorte e allerte",
                ]}
              />
            </div>
          </Card>

          <Card className="p-4 border-rw-accent/20 bg-rw-accent/5">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="h-4 w-4 text-rw-accent" />
              <h3 className="text-sm font-semibold text-rw-accent">Suggerimento</h3>
            </div>
            <p className="text-xs text-rw-soft leading-relaxed">
              Premi il pulsante del microfono e parla naturalmente.
              Risto capisce i comandi in italiano e li esegue in tempo reale.
              Puoi anche scrivere i comandi nella chat.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CapabilityGroup({
  icon: Icon,
  title,
  color,
  items,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-xs font-semibold text-rw-ink">{title}</span>
      </div>
      <div className="space-y-0.5 pl-5">
        {items.map((item) => (
          <p key={item} className="text-xs text-rw-muted">
            • {item}
          </p>
        ))}
      </div>
    </div>
  );
}
