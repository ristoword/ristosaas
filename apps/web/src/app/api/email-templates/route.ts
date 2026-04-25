import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["owner", "super_admin"] as const;

const DEFAULT_TEMPLATES = [
  {
    slug: "prenotazione_confermata",
    subject: "Prenotazione confermata — {{tenantName}}",
    body: `Gentile {{customerName}},\n\nLa sua prenotazione è confermata!\n\nDettagli:\n- Data: {{date}}\n- Orario: {{time}}\n- Persone: {{guests}}\n- Tavolo: {{table}}\n\nIn caso di necessità può contattarci.\n\nA presto,\n{{tenantName}}`,
    variables: "customerName, date, time, guests, table, tenantName",
  },
  {
    slug: "prenotazione_annullata",
    subject: "Prenotazione annullata — {{tenantName}}",
    body: `Gentile {{customerName}},\n\nLa sua prenotazione del {{date}} alle {{time}} è stata annullata.\n\nSiamo spiacenti per l'inconveniente.\n\nA presto,\n{{tenantName}}`,
    variables: "customerName, date, time, tenantName",
  },
  {
    slug: "checkin_benvenuto",
    subject: "Benvenuto a {{tenantName}}!",
    body: `Gentile {{guestName}},\n\nBenvenuto/a presso {{tenantName}}!\n\nCamera: {{roomCode}}\nCheck-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\n\nBuon soggiorno!\n{{tenantName}}`,
    variables: "guestName, roomCode, checkInDate, checkOutDate, tenantName",
  },
  {
    slug: "checkout_riepilogo",
    subject: "Riepilogo soggiorno — {{tenantName}}",
    body: `Gentile {{guestName}},\n\nGrazie per aver soggiornato presso {{tenantName}}.\n\nCamera: {{roomCode}}\nDurata: {{nights}} notti\nTotale: {{total}}\n\nSperiamo di rivederla presto!\n{{tenantName}}`,
    variables: "guestName, roomCode, nights, total, tenantName",
  },
  {
    slug: "ordine_asporto",
    subject: "Ordine asporto confermato — {{tenantName}}",
    body: `Gentile {{customerName}},\n\nIl tuo ordine è confermato!\n\nRitiro previsto: {{pickupTime}}\nTotale: {{total}}\n\nA presto,\n{{tenantName}}`,
    variables: "customerName, pickupTime, total, tenantName",
  },
];

/** GET /api/email-templates — lista template (con default se non esiste in DB) */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();

  const saved = await prisma.emailTemplate.findMany({
    where: { tenantId },
    select: { slug: true, subject: true, body: true, variables: true, updatedAt: true },
  });
  const savedMap = new Map(saved.map((t) => [t.slug, t]));

  const templates = DEFAULT_TEMPLATES.map((def) => {
    const db = savedMap.get(def.slug);
    return {
      slug: def.slug,
      subject: db?.subject ?? def.subject,
      body: db?.body ?? def.body,
      variables: db?.variables ?? def.variables,
      customized: !!db,
      updatedAt: db?.updatedAt?.toISOString() ?? null,
    };
  });

  return ok(templates);
}
