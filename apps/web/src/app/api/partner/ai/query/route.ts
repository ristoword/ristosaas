import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { getPartnerDashboardMetrics } from "@/lib/db/repositories/partner.repository";
import { recordPartnerAudit } from "@/lib/observability/partner-audit";

function answerFromMetrics(question: string, m: Awaited<ReturnType<typeof getPartnerDashboardMetrics>>): string {
  const q = question.toLowerCase();
  if (q.includes("mrr")) return `MRR attuale: € ${m.revenue.mrr.toFixed(2)} (ARR € ${m.revenue.arr.toFixed(2)}).`;
  if (q.includes("licenze") && q.includes("attiv")) return `Licenze attive: ${m.licenses.active} su ${m.licenses.total} totali.`;
  if (q.includes("trial") && q.includes("scad")) return `Trial in scadenza questa settimana: ${m.licenses.trialsExpiringWeek}.`;
  if (q.includes("fattur") || q.includes("incasso")) return `Incasso mensile stimato: € ${m.revenue.monthly.toFixed(2)}. Previsione: € ${m.revenue.forecast.toFixed(2)}.`;
  if (q.includes("tenant")) return `Tenant registrati: ${m.platform.tenants} (${m.platform.hotels} hotel, ${m.platform.restaurants} ristoranti).`;
  if (q.includes("dealer")) return `Dealer attivi: ${m.platform.dealers}. Partner commerciali: ${m.platform.partners}.`;
  if (q.includes("crescita")) return `Nuove licenze questo mese: ${m.licenses.newMonth}. Settimana: ${m.licenses.newWeek}.`;
  return `Panoramica: ${m.licenses.active} licenze attive, MRR € ${m.revenue.mrr.toFixed(2)}, ${m.platform.tenants} tenant, ${m.platform.users} utenti.`;
}

export async function POST(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;
  const { user } = guard;
  if (!user) return err("Unauthorized", 401);

  try {
    const body = (await req.json()) as { question?: string };
    const question = body.question?.trim();
    if (!question) return err("Domanda obbligatoria.", 400);

    const metrics = await getPartnerDashboardMetrics();
    const reply = answerFromMetrics(question, metrics);

    void recordPartnerAudit({
      action: "partner.ai.query",
      actor: user,
      req,
      metadata: { question: question.slice(0, 200) },
    });

    return ok({ reply, metrics });
  } catch (error) {
    console.error("[partner/ai/query POST]", error);
    return err("Impossibile elaborare la richiesta AI.", 500);
  }
}
