/** AI Cassa quick prompts — routed through existing AiChat / useAiStreamChat. */

export const CASSA_AI_SUGGESTIONS: { label: string; prompt: string }[] = [
  { label: "Upselling", prompt: "Suggerisci upselling per il conto corrente in cassa." },
  { label: "Vino", prompt: "Suggerisci un abbinamento vino per questo ordine." },
  { label: "Dessert", prompt: "Suggerisci dessert da proporre al tavolo." },
  { label: "Cliente abituale", prompt: "Il cliente è abituale? Suggerisci preferenze basate sui dati disponibili." },
  { label: "Promozioni", prompt: "Quali promozioni attive posso applicare in cassa?" },
  { label: "Esauriti", prompt: "Quali prodotti sono esauriti o in esaurimento oggi?" },
  { label: "Alternative", prompt: "Proponi alternative per piatti non disponibili." },
  { label: "Margine ordine", prompt: "Calcola e spiega il margine stimato di questo ordine." },
  { label: "Food Cost", prompt: "Analizza il food cost del conto corrente." },
  { label: "Drink Cost", prompt: "Analizza il drink cost delle bevande nel conto." },
  { label: "Allergeni", prompt: "Verifica allergeni e segnala rischi nel conto." },
  { label: "Tempi cucina", prompt: "Stima i tempi di uscita cucina per le comande aperte." },
  { label: "Incasso previsto", prompt: "Qual è l'incasso previsto per oggi?" },
  { label: "Chiusura prevista", prompt: "Previsione orario e importo chiusura giornata." },
  { label: "Anomalie", prompt: "Ci sono anomalie o pattern insoliti negli ordini di oggi?" },
  { label: "Pagamento", prompt: "Suggerisci il metodo di pagamento più adatto per questo conto." },
  { label: "Split conto", prompt: "Suggerisci come dividere il conto tra i commensali." },
  { label: "Rispondi con AI", prompt: "Dammi un riepilogo operativo della situazione cassa adesso." },
  { label: "Voice AI", prompt: "Come posso usare Voice AI per operazioni in cassa?" },
  { label: "Tool Calling", prompt: "Quali tool AI posso usare dal modulo cassa?" },
];
