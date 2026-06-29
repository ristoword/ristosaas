export const HOTEL_AI_SUGGESTIONS: { label: string; prompt: string }[] = [
  { label: "Camere da pulire", prompt: "Quali camere richiedono pulizia prioritaria oggi?" },
  { label: "Upgrade", prompt: "Suggerisci upgrade camera disponibili per gli arrivi di oggi." },
  { label: "Late checkout", prompt: "Quali ospiti hanno richiesto late checkout e come gestirli?" },
  { label: "Ospiti VIP", prompt: "Identifica ospiti VIP o high-value in casa o in arrivo." },
  { label: "Camere ferme", prompt: "Elenca camere fuori servizio o in manutenzione e impatto occupazione." },
  { label: "ADR basso", prompt: "L'ADR è sotto target? Analizza cause e suggerimenti pricing." },
  { label: "RevPAR", prompt: "Analizza RevPAR attuale vs benchmark e azioni consigliate." },
  { label: "Forecast", prompt: "Previsione occupazione e ricavi prossimi 7 giorni." },
  { label: "Anomalie", prompt: "Ci sono anomalie operative o revenue da segnalare oggi?" },
];
