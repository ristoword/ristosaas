import type { AiProposal, CommandCenterDashboard } from "@/lib/api-client";

export type AiSuggestion = {
  id: string;
  level: "warning" | "info";
  title: string;
  message: string;
  module: string;
  proposalId?: string;
  query?: string;
};

export function deriveAiSuggestions(
  dashboard: CommandCenterDashboard | null,
  proposals: AiProposal[],
): AiSuggestion[] {
  const out: AiSuggestion[] = [];
  const seen = new Set<string>();

  const push = (s: AiSuggestion) => {
    const key = s.id;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  for (const p of proposals.filter((x) => x.status === "pending_review" || x.status === "draft")) {
    push({
      id: `proposal-${p.id}`,
      level: "warning",
      title: p.title,
      message: p.summary,
      module: p.type,
      proposalId: p.id,
    });
  }

  if (!dashboard) return out.slice(0, 8);

  if (dashboard.kpis.workflowsPending > 0) {
    push({
      id: "wf-pending",
      level: "warning",
      title: "Workflow in attesa",
      message: `${dashboard.kpis.workflowsPending} workflow richiedono attenzione o approvazione.`,
      module: "supervisor",
      query: "Quali workflow AI sono in attesa e cosa devo approvare?",
    });
  }

  for (const d of dashboard.decisions.slice(0, 6)) {
    if (d.confidence != null && d.confidence < 0.65) {
      push({
        id: `dec-low-${d.id}`,
        level: "warning",
        title: "Decisione a bassa confidence",
        message: d.decision,
        module: d.module,
        query: `Spiega la decisione AI: ${d.decision}. Motivazione: ${d.motivation}`,
      });
    }
  }

  for (const ev of dashboard.timeline.filter((t) => t.level === "warning" || t.level === "error").slice(0, 4)) {
    push({
      id: `tl-${ev.id}`,
      level: "warning",
      title: ev.level === "error" ? "Errore AI" : "Attenzione richiesta",
      message: ev.message,
      module: ev.module ?? "dashboard",
    });
  }

  const typeHints: Array<{ match: string; title: string; query: string }> = [
    { match: "food_cost", title: "Margini bassi", query: "Quali piatti hanno margini sotto target oggi?" },
    { match: "warehouse", title: "Scorte in esaurimento", query: "Quali prodotti sono sotto scorta minima?" },
    { match: "reorder", title: "Riordini suggeriti", query: "Suggerisci riordini urgenti per il magazzino." },
    { match: "staff", title: "Personale insufficiente", query: "Analizza copertura turni e personale insufficiente." },
    { match: "prenotazioni", title: "Prenotazioni elevate", query: "Analizza prenotazioni elevate e impatto operativo." },
    { match: "menu", title: "Piatti poco redditizi", query: "Quali piatti sono poco redditizi e cosa fare?" },
    { match: "haccp", title: "HACCP da verificare", query: "Verifica conformità HACCP e criticità aperte." },
  ];

  for (const hint of typeHints) {
    const hit = dashboard.decisions.some((d) => d.module.includes(hint.match) || d.decision.toLowerCase().includes(hint.match));
    if (hit) {
      push({
        id: `hint-${hint.match}`,
        level: "warning",
        title: hint.title,
        message: hint.title,
        module: hint.match,
        query: hint.query,
      });
    }
  }

  return out.slice(0, 10);
}
