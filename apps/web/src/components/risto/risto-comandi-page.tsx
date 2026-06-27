"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Mic,
  MicOff,
  Send,
  Bot,
  ChefHat,
  Package,
  Wine,
  Sparkles,
  ClipboardList,
  BarChart3,
  Trash2,
  CheckCircle2,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { useI18n } from "@/core/i18n/provider";
import { useAiStreamChat } from "@/hooks/use-ai-stream";

type AiMessage = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  isAction?: boolean;
  streaming?: boolean;
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

const SPEECH_LANG: Record<string, string> = {
  it: "it-IT",
  en: "en-US",
  nl: "nl-NL",
  pt: "pt-PT",
};

type LocaleCopy = {
  title: string;
  subtitle: string;
  newConversation: string;
  greeting: string;
  greetingSub: string;
  quickLabel: string;
  examplesLabel: string;
  actionDone: string;
  thinking: string;
  micStop: string;
  micSpeak: string;
  placeholderListening: string;
  placeholderIdle: string;
  micActive: string;
  sidebarTitle: string;
  tipTitle: string;
  tipText: string;
  quickCommands: { label: string; prompt: string }[];
  examples: string[];
  caps: {
    recipes: { title: string; items: string[] };
    warehouse: { title: string; items: string[] };
    cellar: { title: string; items: string[] };
    menu: { title: string; items: string[] };
    report: { title: string; items: string[] };
  };
};

const COPY: Record<string, LocaleCopy> = {
  it: {
    title: "Risto Comandi",
    subtitle: "Parla o scrivi per gestire il ristorante con la voce",
    newConversation: "Nuova conversazione",
    greeting: "Ciao! Sono Risto",
    greetingSub: "Il tuo assistente vocale per gestire il ristorante. Parlami o scrivi, e io eseguirò le azioni direttamente nel gestionale.",
    quickLabel: "Comandi rapidi",
    examplesLabel: "Esempi di comandi vocali",
    actionDone: "Azione eseguita",
    thinking: "Risto sta lavorando…",
    micStop: "Ferma ascolto",
    micSpeak: "Parla con Risto",
    placeholderListening: "Sto ascoltando… parla pure",
    placeholderIdle: "Scrivi un comando o premi il microfono…",
    micActive: "Microfono attivo — sto ascoltando...",
    sidebarTitle: "Cosa può fare Risto",
    tipTitle: "Suggerimento",
    tipText: "Premi il pulsante del microfono e parla naturalmente. Risto capisce i comandi e li esegue in tempo reale. Puoi anche scrivere nella chat.",
    quickCommands: [
      { label: "Situazione oggi", prompt: "Risto, dammi la situazione attuale di oggi" },
      { label: "Crea ricetta", prompt: "Risto, crea una nuova ricetta" },
      { label: "Controlla scorte", prompt: "Risto, come stiamo con le scorte?" },
      { label: "Aggiungi vino", prompt: "Risto, aggiungi un nuovo vino in cantina" },
      { label: "Lista ordine", prompt: "Risto, prepara la lista ordine fornitore" },
      { label: "Riepilogo giornata", prompt: "Risto, dammi il riepilogo di oggi" },
    ],
    examples: [
      "Risto crea una ricetta per la carbonara con guanciale, uova, pecorino e pepe nero",
      "Risto inserisci ricetta tiramisù con passaggi e dosi per spiegarla ai cuochi",
      "Risto segna 10 kg di filetto per l'ordine di stasera",
      "Risto carica questa bolla: 5 kg farina, 3 L olio, 2 kg pomodori",
      "Risto aggiungi un Brunello di Montalcino 2018 in cantina a 45 euro",
      "Risto prepara lista verdure pronta per l'ordine al fornitore",
      "Risto quanta mozzarella abbiamo in magazzino?",
      "Risto come stiamo oggi? Riepilogo completo",
    ],
    caps: {
      recipes: { title: "Ricette", items: ["Creare ricette con ingredienti e dosi", "Inserire passaggi di preparazione", "Calcolare food cost automatico"] },
      warehouse: { title: "Magazzino", items: ["Caricare e scaricare merci", "Registrare bolle e consegne", "Cercare prodotti e giacenze", "Preparare liste ordine fornitore"] },
      cellar: { title: "Cantina", items: ["Aggiungere vini con tutti i dettagli", "Aggiornare stock bottiglie", "Controllare giacenze cantina"] },
      menu: { title: "Menu", items: ["Aggiungere piatti al menu", "Collegare ricette ai piatti"] },
      report: { title: "Briefing", items: ["Situazione completa del giorno", "Prenotazioni, staff, cucina, magazzino", "Cose da fare e notifiche"] },
    },
  },
  en: {
    title: "Risto Commands",
    subtitle: "Speak or type to manage the restaurant with your voice",
    newConversation: "New conversation",
    greeting: "Hi! I'm Risto",
    greetingSub: "Your voice assistant for managing the restaurant. Talk to me or type, and I'll execute actions directly in the system.",
    quickLabel: "Quick commands",
    examplesLabel: "Voice command examples",
    actionDone: "Action completed",
    thinking: "Risto is working…",
    micStop: "Stop listening",
    micSpeak: "Talk to Risto",
    placeholderListening: "Listening… go ahead",
    placeholderIdle: "Type a command or press the microphone…",
    micActive: "Microphone active — listening...",
    sidebarTitle: "What Risto can do",
    tipTitle: "Tip",
    tipText: "Press the microphone button and speak naturally. Risto understands commands and executes them in real time. You can also type in the chat.",
    quickCommands: [
      { label: "Create recipe", prompt: "Risto, create a new recipe" },
      { label: "Check stock", prompt: "Risto, how are we doing with stock?" },
      { label: "Add wine", prompt: "Risto, add a new wine to the cellar" },
      { label: "Supplier order", prompt: "Risto, prepare the supplier order list" },
      { label: "Daily summary", prompt: "Risto, give me today's summary" },
      { label: "Update stock", prompt: "Risto, log today's delivery" },
    ],
    examples: [
      "Risto create a carbonara recipe with guanciale, eggs, pecorino and black pepper",
      "Risto add a tiramisu recipe with steps and doses for the cooks",
      "Risto log 10 kg of fillet for tonight's order",
      "Risto load this delivery: 5 kg flour, 3 L oil, 2 kg tomatoes",
      "Risto add a Brunello di Montalcino 2018 to the cellar at 45 euros",
      "Risto prepare the vegetable list for the supplier order",
      "Risto how much mozzarella do we have in stock?",
      "Risto how are we doing today? Full summary",
    ],
    caps: {
      recipes: { title: "Recipes", items: ["Create recipes with ingredients and doses", "Add preparation steps", "Auto-calculate food cost"] },
      warehouse: { title: "Warehouse", items: ["Load and unload goods", "Register deliveries", "Search products and stock", "Prepare supplier order lists"] },
      cellar: { title: "Wine Cellar", items: ["Add wines with full details", "Update bottle stock", "Check cellar inventory"] },
      menu: { title: "Menu", items: ["Add dishes to the menu", "Link recipes to dishes"] },
      report: { title: "Reports", items: ["Complete daily summary", "Stock status and alerts"] },
    },
  },
  nl: {
    title: "Risto Commando's",
    subtitle: "Spreek of typ om het restaurant met je stem te beheren",
    newConversation: "Nieuw gesprek",
    greeting: "Hallo! Ik ben Risto",
    greetingSub: "Je spraakassistent voor het beheren van het restaurant. Praat tegen me of typ, en ik voer acties direct uit in het systeem.",
    quickLabel: "Snelle commando's",
    examplesLabel: "Voorbeelden spraakcommando's",
    actionDone: "Actie voltooid",
    thinking: "Risto is aan het werk…",
    micStop: "Stop met luisteren",
    micSpeak: "Praat met Risto",
    placeholderListening: "Ik luister… ga je gang",
    placeholderIdle: "Typ een commando of druk op de microfoon…",
    micActive: "Microfoon actief — ik luister...",
    sidebarTitle: "Wat Risto kan doen",
    tipTitle: "Tip",
    tipText: "Druk op de microfoonknop en spreek natuurlijk. Risto begrijpt commando's en voert ze in realtime uit. Je kunt ook typen in de chat.",
    quickCommands: [
      { label: "Maak recept", prompt: "Risto, maak een nieuw recept" },
      { label: "Controleer voorraad", prompt: "Risto, hoe staat het met de voorraad?" },
      { label: "Voeg wijn toe", prompt: "Risto, voeg een nieuwe wijn toe aan de kelder" },
      { label: "Leveranciersbestelling", prompt: "Risto, bereid de leveranciersbestellijst voor" },
      { label: "Dagoverzicht", prompt: "Risto, geef me het overzicht van vandaag" },
      { label: "Werk voorraad bij", prompt: "Risto, registreer de levering van vandaag" },
    ],
    examples: [
      "Risto maak een carbonara recept met guanciale, eieren, pecorino en zwarte peper",
      "Risto voeg een tiramisu recept toe met stappen en doseringen voor de koks",
      "Risto registreer 10 kg filet voor de bestelling van vanavond",
      "Risto laad deze levering: 5 kg meel, 3 L olie, 2 kg tomaten",
      "Risto voeg een Brunello di Montalcino 2018 toe aan de kelder voor 45 euro",
      "Risto bereid de groentelijst voor de leveranciersbestelling",
      "Risto hoeveel mozzarella hebben we op voorraad?",
      "Risto hoe gaat het vandaag? Volledig overzicht",
    ],
    caps: {
      recipes: { title: "Recepten", items: ["Maak recepten met ingrediënten en doseringen", "Voeg bereidingsstappen toe", "Bereken automatisch food cost"] },
      warehouse: { title: "Magazijn", items: ["Laad en los goederen", "Registreer leveringen", "Zoek producten en voorraad", "Bereid leveranciersbestellijsten voor"] },
      cellar: { title: "Wijnkelder", items: ["Voeg wijnen toe met alle details", "Werk flessenvoorraad bij", "Controleer kelderinventaris"] },
      menu: { title: "Menu", items: ["Voeg gerechten toe aan het menu", "Koppel recepten aan gerechten"] },
      report: { title: "Rapporten", items: ["Volledig dagelijks overzicht", "Voorraadstatus en waarschuwingen"] },
    },
  },
  pt: {
    title: "Risto Comandos",
    subtitle: "Fale ou digite para gerenciar o restaurante com a voz",
    newConversation: "Nova conversa",
    greeting: "Olá! Eu sou o Risto",
    greetingSub: "Seu assistente de voz para gerenciar o restaurante. Fale comigo ou digite, e eu executarei as ações diretamente no sistema.",
    quickLabel: "Comandos rápidos",
    examplesLabel: "Exemplos de comandos de voz",
    actionDone: "Ação concluída",
    thinking: "Risto está trabalhando…",
    micStop: "Parar de ouvir",
    micSpeak: "Falar com Risto",
    placeholderListening: "Ouvindo… pode falar",
    placeholderIdle: "Digite um comando ou pressione o microfone…",
    micActive: "Microfone ativo — ouvindo...",
    sidebarTitle: "O que Risto pode fazer",
    tipTitle: "Dica",
    tipText: "Pressione o botão do microfone e fale naturalmente. Risto entende comandos e os executa em tempo real. Você também pode digitar no chat.",
    quickCommands: [
      { label: "Criar receita", prompt: "Risto, crie uma nova receita" },
      { label: "Verificar estoque", prompt: "Risto, como estamos com o estoque?" },
      { label: "Adicionar vinho", prompt: "Risto, adicione um novo vinho à adega" },
      { label: "Pedido fornecedor", prompt: "Risto, prepare a lista de pedidos ao fornecedor" },
      { label: "Resumo do dia", prompt: "Risto, me dê o resumo de hoje" },
      { label: "Atualizar estoque", prompt: "Risto, registre a entrega de hoje" },
    ],
    examples: [
      "Risto crie uma receita de carbonara com guanciale, ovos, pecorino e pimenta preta",
      "Risto adicione uma receita de tiramisu com etapas e doses para os cozinheiros",
      "Risto registre 10 kg de filé para o pedido de hoje à noite",
      "Risto carregue esta entrega: 5 kg de farinha, 3 L de óleo, 2 kg de tomates",
      "Risto adicione um Brunello di Montalcino 2018 à adega por 45 euros",
      "Risto prepare a lista de legumes para o pedido ao fornecedor",
      "Risto quanta mozzarella temos no estoque?",
      "Risto como estamos hoje? Resumo completo",
    ],
    caps: {
      recipes: { title: "Receitas", items: ["Criar receitas com ingredientes e doses", "Adicionar etapas de preparação", "Calcular food cost automaticamente"] },
      warehouse: { title: "Estoque", items: ["Carregar e descarregar mercadorias", "Registrar entregas", "Pesquisar produtos e estoque", "Preparar listas de pedido ao fornecedor"] },
      cellar: { title: "Adega", items: ["Adicionar vinhos com todos os detalhes", "Atualizar estoque de garrafas", "Verificar inventário da adega"] },
      menu: { title: "Menu", items: ["Adicionar pratos ao menu", "Vincular receitas aos pratos"] },
      report: { title: "Relatórios", items: ["Resumo diário completo", "Status do estoque e alertas"] },
    },
  },
};

const QUICK_ICONS = [ChefHat, Package, Wine, ClipboardList, BarChart3, ChefHat];
const QUICK_COLORS = ["text-orange-400", "text-blue-400", "text-purple-400", "text-emerald-400", "text-amber-400", "text-cyan-400"];

export function RistoComandiPage() {
  const { locale } = useI18n();
  const c = COPY[locale] ?? COPY.it;
  const speechLang = SPEECH_LANG[locale] || "it-IT";

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const { streamChat, stop, isStreaming, statusText } = useAiStreamChat();
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
    r.lang = speechLang;
    recRef.current = r;
  }, [speechLang]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, liveTranscript]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      setInput("");
      setLiveTranscript("");

      const userMsg: AiMessage = { role: "user", content: trimmed, ts: Date.now() };
      const assistantTs = Date.now() + 1;
      const history = messages
        .filter((m) => !m.streaming)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((p) => [
        ...p,
        userMsg,
        { role: "assistant", content: "", ts: assistantTs, streaming: true },
      ]);

      void streamChat(
        { context: "risto", message: trimmed, history, enableTools: true, locale },
        (fullText) => {
          setMessages((p) =>
            p.map((m) => (m.ts === assistantTs ? { ...m, content: fullText } : m)),
          );
        },
        ({ reply, actions }) => {
          const hasActions = Boolean(actions && actions.length > 0);
          setMessages((p) =>
            p.map((m) =>
              m.ts === assistantTs
                ? { role: "assistant", content: reply, ts: assistantTs, isAction: hasActions, streaming: false }
                : m,
            ),
          );
        },
        (msg) => {
          setMessages((p) =>
            p.map((m) =>
              m.ts === assistantTs
                ? { role: "assistant", content: `Error: ${msg}`, ts: assistantTs, streaming: false }
                : m,
            ),
          );
        },
      );
    },
    [isStreaming, messages, locale, streamChat],
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
          setInput((curInput) => (curInput + " " + prev).trim());
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
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setLiveTranscript("");
  }, []);

  const capGroups = useMemo(() => [
    { icon: ChefHat, color: "text-orange-400", ...c.caps.recipes },
    { icon: Package, color: "text-blue-400", ...c.caps.warehouse },
    { icon: Wine, color: "text-purple-400", ...c.caps.cellar },
    { icon: ClipboardList, color: "text-emerald-400", ...c.caps.menu },
    { icon: BarChart3, color: "text-amber-400", ...c.caps.report },
  ], [c]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader title={c.title} subtitle={c.subtitle}>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-medium text-rw-muted hover:text-rw-ink transition"
          >
            <Trash2 className="h-3.5 w-3.5" /> {c.newConversation}
          </button>
        )}
      </PageHeader>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="flex flex-1 flex-col rounded-2xl border border-rw-line bg-rw-surface/50 overflow-hidden">
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
                  <h3 className="font-display text-lg font-bold text-rw-ink">{c.greeting}</h3>
                  <p className="text-sm text-rw-muted mt-1 max-w-md">{c.greetingSub}</p>
                </div>

                <div className="w-full max-w-2xl mt-4">
                  <p className="text-xs font-semibold text-rw-soft uppercase tracking-wider mb-3">{c.quickLabel}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {c.quickCommands.map((cmd, idx) => {
                      const Icon = QUICK_ICONS[idx] || ChefHat;
                      return (
                        <button
                          key={cmd.label}
                          type="button"
                          onClick={() => sendMessage(cmd.prompt)}
                          className="flex items-center gap-2.5 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2.5 text-left text-sm text-rw-soft transition hover:border-rw-accent/30 hover:text-rw-ink hover:bg-rw-accent/5"
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", QUICK_COLORS[idx])} />
                          {cmd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full max-w-2xl mt-4">
                  <p className="text-xs font-semibold text-rw-soft uppercase tracking-wider mb-3">{c.examplesLabel}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {c.examples.map((ex) => (
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
              <div key={m.ts} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
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
                      <CheckCircle2 className="h-3.5 w-3.5" /> {c.actionDone}
                    </div>
                  )}
                  {m.content}
                  {m.streaming && m.content.length > 0 && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-rw-accent align-middle" />
                  )}
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

            {isStreaming && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-rw-accent/20 bg-rw-accent/5 px-4 py-3 text-xs text-rw-muted">
                  {statusText || c.thinking}
                </div>
              </div>
            )}
          </div>

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
                  title={listening ? c.micStop : c.micSpeak}
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
                placeholder={listening ? c.placeholderListening : c.placeholderIdle}
                className="flex-1 rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-2 focus:ring-rw-accent/50"
              />
              <button
                type="button"
                onClick={() => (isStreaming ? stop() : sendMessage(input))}
                disabled={!isStreaming && !input.trim()}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40",
                  isStreaming
                    ? "border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "bg-rw-accent text-white hover:bg-rw-accent/85",
                )}
              >
                {isStreaming ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            {listening && (
              <p className="mt-2 text-center text-xs text-red-400 animate-pulse">
                <Mic className="inline h-3 w-3 mr-1" />
                {c.micActive}
              </p>
            )}
          </div>
        </div>

        <div className="hidden lg:block w-72 shrink-0 space-y-4 overflow-y-auto">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-rw-accent" />
              <h3 className="text-sm font-semibold text-rw-ink">{c.sidebarTitle}</h3>
            </div>
            <div className="space-y-3">
              {capGroups.map((g) => (
                <CapabilityGroup key={g.title} icon={g.icon} title={g.title} color={g.color} items={g.items} />
              ))}
            </div>
          </Card>

          <Card className="p-4 border-rw-accent/20 bg-rw-accent/5">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="h-4 w-4 text-rw-accent" />
              <h3 className="text-sm font-semibold text-rw-accent">{c.tipTitle}</h3>
            </div>
            <p className="text-xs text-rw-soft leading-relaxed">{c.tipText}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CapabilityGroup({ icon: Icon, title, color, items }: { icon: React.ElementType; title: string; color: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-xs font-semibold text-rw-ink">{title}</span>
      </div>
      <div className="space-y-0.5 pl-5">
        {items.map((item) => (
          <p key={item} className="text-xs text-rw-muted">• {item}</p>
        ))}
      </div>
    </div>
  );
}
