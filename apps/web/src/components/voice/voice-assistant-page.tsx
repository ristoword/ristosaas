"use client";

import { Mic, MicOff, Send, Square, Bot, Sparkles } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";

export function VoiceAssistantPage() {
  const { locale } = useI18n();
  const [textInput, setTextInput] = useState("");
  const {
    messages,
    isListening,
    isProcessing,
    statusText,
    interimTranscript,
    voiceSupported,
    startListening,
    stopListening,
    sendTranscript,
    stopProcessing,
    resetConversation,
  } = useVoiceAssistant({ locale, autoSpeak: true, useOpenAiTts: false });

  const handleSend = () => {
    const t = textInput.trim();
    if (!t) return;
    setTextInput("");
    void sendTranscript(t);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice Assistant"
        subtitle="Parla naturalmente: coperti, ordini, food cost, magazzino e tutti i moduli AI"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void resetConversation()}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Nuova conversazione
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="flex min-h-[520px] flex-col p-4">
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                <Sparkles className="h-10 w-10 opacity-40" />
                <p className="max-w-md text-sm">
                  Prova: &quot;Quanti coperti ho domani?&quot;, &quot;Ordina il pesce&quot;, &quot;Mostrami il food cost&quot;
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.ts}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {m.content || (m.streaming ? "…" : "")}
              </div>
            ))}
            {interimTranscript && (
              <p className="text-xs italic text-muted-foreground">🎤 {interimTranscript}</p>
            )}
            {statusText && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="h-3 w-3 animate-pulse" /> {statusText}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            {voiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full",
                  isListening ? "bg-red-500 text-white" : "bg-primary text-primary-foreground",
                )}
                aria-label={isListening ? "Ferma ascolto" : "Parla"}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isListening ? "Sto ascoltando…" : "Scrivi o usa il microfono…"}
              className="flex-1 rounded-xl border bg-background px-4 py-2 text-sm"
              disabled={isProcessing}
            />
            {isProcessing ? (
              <button type="button" onClick={stopProcessing} className="rounded-xl border p-2">
                <Square className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!textInput.trim()}
                className="rounded-xl bg-primary p-2 text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>
        </Card>

        <Card className="space-y-3 p-4 text-sm">
          <h3 className="font-semibold">Capacità</h3>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>Speech-to-Text (browser)</li>
            <li>Tool calling operativo</li>
            <li>Streaming risposta</li>
            <li>Text-to-Speech</li>
            <li>Memoria conversazione</li>
            <li>Tutti i moduli AI integrati</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Il parser vocale ordini (/api/ai/parse-order) resta invariato. Questo assistente gestisce dialogo naturale multi-modulo.
          </p>
        </Card>
      </div>
    </div>
  );
}
