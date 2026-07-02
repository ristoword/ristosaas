import type { Customer, FolioAuditLogEntry, FolioDetail, GuestFolio, HotelReservation } from "@/lib/api-client";
import {
  boardTypeLabel,
  buildTimeline,
  computeEconomics,
  enrichCharge,
  type FolioChargeRow,
  type FolioTimelineEvent,
} from "@/lib/hotel/folio-utils";

export type FolioAiSeverity = "critical" | "warning" | "info";

export type FolioAiAnomaly = {
  id: string;
  severity: FolioAiSeverity;
  category: string;
  title: string;
  detail: string;
  suggestion?: string;
  chargeIds?: string[];
};

export type FolioAiRevenueSuggestion = {
  id: string;
  service: string;
  reason: string;
  estimatedValue?: number;
  priority: "high" | "medium" | "low";
};

export type FolioAiGuestSummary = {
  stayOverview: string;
  spending: { total: number; room: number; extras: number; paid: number; balance: number };
  preferences: string[];
  history: string;
  vip: boolean;
  allergies: string[];
  specialRequests: string[];
  issues: string[];
};

export type FolioAiPaymentAssistant = {
  balance: number;
  credit: number;
  paidTotal: number;
  dueTotal: number;
  paymentCount: number;
  suggestedActions: string[];
  splitSummary: Record<string, number>;
};

export type FolioAiCheckoutItem = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

export type FolioAiFraudAlert = {
  id: string;
  type: string;
  severity: FolioAiSeverity;
  detail: string;
  relatedIds?: string[];
};

export type FolioAiCustomerInsights = {
  avgSpend: number;
  visitFrequency: string;
  preferences: string[];
  servicesUsed: string[];
  customerValue: "high" | "medium" | "low";
  returnProbability: number;
};

export type FolioAiForecast = {
  projectedFinalSpend: number;
  estimatedRevenue: number;
  upsellProbability: number;
  notes: string[];
};

export type FolioAiTimelineEntry = FolioTimelineEvent & { aiSummary?: string };

export type FolioAiProposedAction = {
  id: string;
  type: "payment" | "note" | "checkout" | "email" | "pdf" | "charge";
  label: string;
  description: string;
  payload?: Record<string, unknown>;
  requiresConfirmation: true;
};

export type FolioAiAnalysis = {
  folioId: string;
  generatedAt: string;
  anomalies: FolioAiAnomaly[];
  revenueSuggestions: FolioAiRevenueSuggestion[];
  guestSummary: FolioAiGuestSummary;
  paymentAssistant: FolioAiPaymentAssistant;
  checkoutChecklist: FolioAiCheckoutItem[];
  fraudAlerts: FolioAiFraudAlert[];
  customerInsights: FolioAiCustomerInsights;
  forecast: FolioAiForecast;
  timeline: FolioAiTimelineEntry[];
  checkoutBlocked: boolean;
  checkoutBlockReasons: string[];
  proposedActions: FolioAiProposedAction[];
};

export type FolioAiContextInput = {
  detail: FolioDetail;
  reservation?: HotelReservation | null;
  customer?: Customer | null;
  locale?: string;
};

export type FolioChargeExplanation = {
  chargeId: string;
  origin: string;
  department: string;
  operator: string;
  date: string;
  time: string;
  vatPct: number;
  total: number;
  description: string;
  narrative: string;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function findDuplicates(rows: FolioChargeRow[]): FolioAiAnomaly[] {
  const seen = new Map<string, FolioChargeRow[]>();
  for (const row of rows) {
    if (row.status === "void" || row.source === "payment") continue;
    const key = `${row.source}|${row.description}|${row.amount.toFixed(2)}|${row.date}`;
    const list = seen.get(key) ?? [];
    list.push(row);
    seen.set(key, list);
  }
  const anomalies: FolioAiAnomaly[] = [];
  for (const [, group] of seen) {
    if (group.length < 2) continue;
    anomalies.push({
      id: uid("dup"),
      severity: "warning",
      category: "duplicati",
      title: "Possibile addebito duplicato",
      detail: `"${group[0].description}" (€ ${group[0].amount.toFixed(2)}) compare ${group.length} volte il ${group[0].date}.`,
      suggestion: "Verificare se si tratta di duplicazione operatore o addebiti legittimi distinti.",
      chargeIds: group.map((g) => g.id),
    });
  }
  return anomalies;
}

function checkMissingCharges(
  rows: FolioChargeRow[],
  reservation: HotelReservation | null | undefined,
): FolioAiAnomaly[] {
  const anomalies: FolioAiAnomaly[] = [];
  if (!reservation || reservation.status !== "in_casa") return anomalies;

  const roomCharges = rows.filter((r) => r.section === "CAMERA" && r.status !== "void");
  const expectedNights = Math.max(1, reservation.nights);
  if (roomCharges.length === 0 && reservation.rate > 0) {
    anomalies.push({
      id: uid("miss-room"),
      severity: "critical",
      category: "addebiti",
      title: "Addebiti camera mancanti",
      detail: `Nessun addebito camera trovato per soggiorno di ${expectedNights} notti (tariffa € ${reservation.rate}/notte).`,
      suggestion: "Verificare post check-in o addebitare manualmente le notti mancanti.",
    });
  }

  const cityTax = rows.filter((r) => r.section === "TASSA_DI_SOGGIORNO" && r.status !== "void");
  if (cityTax.length === 0 && reservation.guests > 0) {
    anomalies.push({
      id: uid("miss-tax"),
      severity: "warning",
      category: "tassa_soggiorno",
      title: "Tassa di soggiorno non addebitata",
      detail: `Nessuna voce tassa di soggiorno per ${reservation.guests} ospiti.`,
      suggestion: "Applicare la tassa di soggiorno prima del checkout.",
    });
  }

  return anomalies;
}

function checkBalance(rows: FolioChargeRow[], folio: GuestFolio): FolioAiAnomaly[] {
  const computed = rows.filter((r) => r.status !== "void").reduce((s, r) => s + r.amount, 0);
  const diff = Math.abs(computed - folio.balance);
  if (diff > 0.02) {
    return [{
      id: uid("bal"),
      severity: "critical",
      category: "saldo",
      title: "Incongruenza saldo folio",
      detail: `Saldo registrato € ${folio.balance.toFixed(2)} vs somma movimenti € ${computed.toFixed(2)} (Δ € ${diff.toFixed(2)}).`,
      suggestion: "Ricalcolare il saldo o verificare movimenti void/non sincronizzati.",
    }];
  }
  return [];
}

function checkVat(rows: FolioChargeRow[]): FolioAiAnomaly[] {
  const anomalies: FolioAiAnomaly[] = [];
  for (const row of rows) {
    if (row.status === "void" || row.source === "payment" || row.section === "TASSA_DI_SOGGIORNO") continue;
    if (row.vatPct == null || (row.vatPct !== 0 && row.vatPct !== 4 && row.vatPct !== 10 && row.vatPct !== 22)) {
      anomalies.push({
        id: uid("vat"),
        severity: "info",
        category: "iva",
        title: "Aliquota IVA non standard",
        detail: `"${row.description}": IVA ${row.vatPct}% — verificare correttezza.`,
        chargeIds: [row.id],
      });
    }
  }
  return anomalies.slice(0, 5);
}

function detectFraud(rows: FolioChargeRow[], auditLogs: FolioAuditLogEntry[]): FolioAiFraudAlert[] {
  const alerts: FolioAiFraudAlert[] = [];

  const voids = rows.filter((r) => r.status === "void");
  if (voids.length >= 3) {
    alerts.push({
      id: uid("fraud-void"),
      type: "storni_ripetuti",
      severity: "warning",
      detail: `${voids.length} movimenti annullati/stornati sul folio.`,
      relatedIds: voids.map((v) => v.id),
    });
  }

  const discounts = rows.filter((r) => r.amount < 0 && r.source !== "payment" && r.source !== "meal_plan_credit");
  const totalDiscount = discounts.reduce((s, r) => s + Math.abs(r.amount), 0);
  if (totalDiscount > 200) {
    alerts.push({
      id: uid("fraud-disc"),
      type: "sconti_eccessivi",
      severity: "warning",
      detail: `Sconti/rettifiche per € ${totalDiscount.toFixed(2)} — verificare autorizzazione.`,
      relatedIds: discounts.map((d) => d.id),
    });
  }

  const suspiciousAudit = auditLogs.filter(
    (a) => a.action.includes("void") || a.action.includes("transfer") || a.action.includes("split"),
  );
  if (suspiciousAudit.length >= 5) {
    alerts.push({
      id: uid("fraud-audit"),
      type: "modifiche_sospette",
      severity: "info",
      detail: `${suspiciousAudit.length} operazioni di modifica/trasferimento nelle ultime 24h.`,
      relatedIds: suspiciousAudit.slice(0, 5).map((a) => a.id),
    });
  }

  const largePayments = rows.filter((r) => r.source === "payment" && Math.abs(r.amount) > 2000);
  for (const p of largePayments) {
    alerts.push({
      id: uid("fraud-pay"),
      type: "pagamento_anomalo",
      severity: "info",
      detail: `Pagamento elevato € ${Math.abs(p.amount).toFixed(2)} — ${p.description}.`,
      relatedIds: [p.id],
    });
  }

  return alerts;
}

function buildRevenueSuggestions(
  rows: FolioChargeRow[],
  reservation: HotelReservation | null | undefined,
  customer: Customer | null | undefined,
): FolioAiRevenueSuggestion[] {
  const suggestions: FolioAiRevenueSuggestion[] = [];
  const sections = new Set(rows.map((r) => r.section));

  if (!sections.has("MINIBAR")) {
    suggestions.push({
      id: uid("rev-minibar"),
      service: "Minibar",
      reason: "Nessun consumo minibar registrato — verificare o proporre refill.",
      estimatedValue: 25,
      priority: "medium",
    });
  }
  if (!sections.has("SPA")) {
    suggestions.push({
      id: uid("rev-spa"),
      service: "SPA",
      reason: "Ospite senza utilizzo SPA — proporre trattamento benessere.",
      estimatedValue: 80,
      priority: customer?.type === "vip" ? "high" : "medium",
    });
  }
  if (reservation?.boardType === "room_only") {
    suggestions.push({
      id: uid("rev-bfast"),
      service: "Colazione",
      reason: "Pernottamento senza board — upgrade colazione disponibile.",
      estimatedValue: 18 * (reservation.guests || 1),
      priority: "high",
    });
  }
  if (!sections.has("ROOM_SERVICE") && !sections.has("RISTORANTE")) {
    suggestions.push({
      id: uid("rev-rs"),
      service: "Room Service / Ristorante",
      reason: "Nessun consumo F&B — proporire menu o room service.",
      estimatedValue: 45,
      priority: "medium",
    });
  }
  if (!sections.has("PARCHEGGIO")) {
    suggestions.push({
      id: uid("rev-park"),
      service: "Parcheggio",
      reason: "Parcheggio non addebitato — verificare veicolo ospite.",
      estimatedValue: 15,
      priority: "low",
    });
  }
  if (reservation && reservation.status === "in_casa") {
    suggestions.push({
      id: uid("rev-lco"),
      service: "Late check-out",
      reason: "Soggiorno attivo — valutare late check-out a pagamento.",
      estimatedValue: reservation.rate * 0.5,
      priority: "medium",
    });
    suggestions.push({
      id: uid("rev-upg"),
      service: "Upgrade camera",
      reason: "Opportunità upgrade camera superiore se disponibilità.",
      estimatedValue: reservation.rate * 0.3,
      priority: customer?.type === "vip" ? "high" : "low",
    });
  }

  return suggestions.slice(0, 8);
}

function buildGuestSummary(
  folio: GuestFolio,
  rows: FolioChargeRow[],
  reservation: HotelReservation | null | undefined,
  customer: Customer | null | undefined,
  economics: ReturnType<typeof computeEconomics>,
): FolioAiGuestSummary {
  const prefs: string[] = [];
  if (customer?.preferences?.trim()) prefs.push(customer.preferences);
  if (reservation) prefs.push(`Board: ${boardTypeLabel(reservation.boardType)}`);

  const sections = [...new Set(rows.filter((r) => r.source !== "payment").map((r) => r.section))];
  const issues: string[] = [];
  if (economics.balance > 500) issues.push(`Saldo elevato: € ${economics.balance.toFixed(2)}`);
  if (folio.locked) issues.push("Folio attualmente bloccato");

  const stayOverview = reservation
    ? `${reservation.guestName} · Camera ${folio.roomCode ?? "—"} · ${reservation.nights} notti · ${stayStatus(reservation.status)}`
    : `${folio.guestName ?? "Ospite"} · Folio ${folio.status}`;

  return {
    stayOverview,
    spending: {
      total: economics.roomTotal + economics.extraTotal + economics.taxTotal,
      room: economics.roomTotal,
      extras: economics.extraTotal,
      paid: economics.paidTotal,
      balance: economics.balance,
    },
    preferences: prefs,
    history: customer
      ? `${customer.visits} soggiorni · spesa totale € ${customer.totalSpent.toFixed(0)} · ultima visita ${customer.lastVisit || "—"}`
      : "Cliente non collegato al CRM",
    vip: customer?.type === "vip",
    allergies: customer?.allergies?.trim() ? customer.allergies.split(/[,;]/).map((a) => a.trim()).filter(Boolean) : [],
    specialRequests: customer?.notes?.trim() ? [customer.notes] : [],
    issues,
  };
}

function stayStatus(status: HotelReservation["status"]): string {
  const map: Record<HotelReservation["status"], string> = {
    in_attesa: "In attesa di conferma",
    confermata: "Confermata",
    in_casa: "In casa",
    check_out: "Check-out effettuato",
    cancellata: "Cancellata",
    no_show: "No show",
  };
  return map[status] ?? status;
}

function buildCheckoutChecklist(
  rows: FolioChargeRow[],
  folio: GuestFolio,
  reservation: HotelReservation | null | undefined,
  economics: ReturnType<typeof computeEconomics>,
  anomalies: FolioAiAnomaly[],
): FolioAiCheckoutItem[] {
  const sections = new Set(rows.map((r) => r.section));
  const critical = anomalies.filter((a) => a.severity === "critical");

  const items: FolioAiCheckoutItem[] = [
    {
      id: "balance",
      label: "Saldo",
      status: economics.balance <= 0.005 ? "ok" : economics.balance > 0 ? "fail" : "ok",
      detail: economics.balance <= 0.005 ? "Saldo a zero o a credito" : `Saldo aperto € ${economics.balance.toFixed(2)}`,
    },
    {
      id: "payments",
      label: "Pagamenti",
      status: rows.some((r) => r.source === "payment") || economics.balance <= 0 ? "ok" : "warn",
      detail: `${rows.filter((r) => r.source === "payment").length} pagamenti registrati`,
    },
    {
      id: "city_tax",
      label: "Tassa soggiorno",
      status: sections.has("TASSA_DI_SOGGIORNO") || !reservation ? "ok" : "warn",
      detail: sections.has("TASSA_DI_SOGGIORNO") ? "Addebitata" : "Non trovata — verificare",
    },
    {
      id: "minibar",
      label: "Minibar",
      status: "ok",
      detail: sections.has("MINIBAR") ? "Consumi registrati" : "Nessun addebito — verificare controllo camera",
    },
    {
      id: "room_service",
      label: "Room service",
      status: "ok",
      detail: sections.has("ROOM_SERVICE") ? "Ordini presenti" : "Nessun ordine pendente",
    },
    {
      id: "laundry",
      label: "Lavanderia",
      status: "ok",
      detail: sections.has("LAVANDERIA") ? "Addebiti lavanderia presenti" : "Nessun addebito lavanderia",
    },
    {
      id: "spa",
      label: "SPA",
      status: "ok",
      detail: sections.has("SPA") ? "Trattamenti registrati" : "Nessun trattamento SPA",
    },
    {
      id: "deposit",
      label: "Caparra / Deposito",
      status: rows.some((r) => r.description.toLowerCase().includes("caparra") || r.description.toLowerCase().includes("deposito"))
        ? "ok"
        : "warn",
      detail: "Verificare caparra e deposito cauzionale",
    },
    {
      id: "invoice",
      label: "Fattura / Documento",
      status: folio.status === "closed" ? "ok" : "warn",
      detail: folio.status === "closed" ? "Folio chiuso" : "Documento fiscale da emettere al checkout",
    },
    {
      id: "consumptions",
      label: "Consumazioni",
      status: critical.some((c) => c.category === "duplicati") ? "warn" : "ok",
      detail: `${rows.filter((r) => r.source !== "payment" && r.status !== "void").length} movimenti attivi`,
    },
  ];

  if (critical.length > 0) {
    items.push({
      id: "ai_critical",
      label: "Anomalie critiche AI",
      status: "fail",
      detail: critical.map((c) => c.title).join("; "),
    });
  }

  return items;
}

function buildCustomerInsights(
  customer: Customer | null | undefined,
  rows: FolioChargeRow[],
): FolioAiCustomerInsights {
  const servicesUsed = [...new Set(rows.filter((r) => r.source !== "payment").map((r) => r.section))];
  const currentSpend = rows.filter((r) => r.source !== "payment" && r.amount > 0).reduce((s, r) => s + r.amount, 0);

  let customerValue: "high" | "medium" | "low" = "low";
  if (customer) {
    if (customer.type === "vip" || customer.totalSpent > 5000) customerValue = "high";
    else if (customer.totalSpent > 1000 || customer.visits > 3) customerValue = "medium";
  }

  const returnProb = customer
    ? Math.min(0.95, 0.3 + customer.visits * 0.08 + (customer.type === "vip" ? 0.2 : 0))
    : 0.25;

  return {
    avgSpend: customer?.avgSpend ?? currentSpend,
    visitFrequency: customer ? (customer.visits > 5 ? "Frequente" : customer.visits > 1 ? "Occasionale" : "Prima visita") : "Sconosciuto",
    preferences: customer?.preferences ? [customer.preferences] : [],
    servicesUsed,
    customerValue,
    returnProbability: Math.round(returnProb * 100) / 100,
  };
}

function buildForecast(
  economics: ReturnType<typeof computeEconomics>,
  reservation: HotelReservation | null | undefined,
  revenueSuggestions: FolioAiRevenueSuggestion[],
): FolioAiForecast {
  const base = economics.roomTotal + economics.extraTotal + economics.taxTotal;
  const upsellEst = revenueSuggestions.reduce((s, r) => s + (r.estimatedValue ?? 0) * 0.3, 0);
  const remainingNights = reservation?.status === "in_casa" ? 1 : 0;
  const projectedRoom = remainingNights * (reservation?.rate ?? 0);

  return {
    projectedFinalSpend: Math.round((base + projectedRoom + upsellEst) * 100) / 100,
    estimatedRevenue: Math.round((base + upsellEst) * 100) / 100,
    upsellProbability: revenueSuggestions.length > 0 ? 0.45 : 0.15,
    notes: [
      `Saldo attuale € ${economics.balance.toFixed(2)}`,
      upsellEst > 0 ? `Potenziale upsell stimato € ${upsellEst.toFixed(0)}` : "Nessun upsell prioritario",
    ],
  };
}

function buildProposedActions(
  folio: GuestFolio,
  economics: ReturnType<typeof computeEconomics>,
  reservation: HotelReservation | null | undefined,
  customer: Customer | null | undefined,
): FolioAiProposedAction[] {
  const actions: FolioAiProposedAction[] = [];

  if (economics.balance > 0.005 && reservation) {
    actions.push({
      id: uid("act-pay"),
      type: "payment",
      label: "Registra pagamento saldo",
      description: `Registrare pagamento di € ${economics.balance.toFixed(2)} per saldare il folio.`,
      payload: { amount: economics.balance, reservationId: reservation.id },
      requiresConfirmation: true,
    });
  }

  if (customer?.email) {
    actions.push({
      id: uid("act-email"),
      type: "email",
      label: "Invia folio PDF via email",
      description: `Inviare riepilogo a ${customer.email}.`,
      payload: { toEmail: customer.email },
      requiresConfirmation: true,
    });
  }

  actions.push({
    id: uid("act-pdf"),
    type: "pdf",
    label: "Genera report PDF",
    description: "Scaricare il report folio enterprise in PDF.",
    requiresConfirmation: true,
  });

  if (economics.balance <= 0.005 && reservation && folio.status === "open") {
    actions.push({
      id: uid("act-co"),
      type: "checkout",
      label: "Prepara checkout",
      description: "Avviare procedura checkout con saldo verificato.",
      payload: { reservationId: reservation.id },
      requiresConfirmation: true,
    });
  }

  return actions;
}

function enrichTimeline(events: FolioTimelineEvent[]): FolioAiTimelineEntry[] {
  return events.map((ev) => ({
    ...ev,
    aiSummary:
      ev.kind === "payment"
        ? `Incasso registrato${ev.amount != null ? ` per € ${Math.abs(ev.amount).toFixed(2)}` : ""}`
        : ev.kind === "consumption"
          ? `Consumazione ${ev.title}`
          : ev.kind === "check_in"
            ? "Inizio soggiorno"
            : ev.kind === "check_out"
              ? "Fine soggiorno"
              : `Movimento ${ev.title}`,
  }));
}

export function explainCharge(row: FolioChargeRow): FolioChargeExplanation {
  const originMap: Record<FolioChargeRow["source"], string> = {
    hotel: "PMS — Tariffa camera / soggiorno",
    restaurant: "Ristorante — Addebito F&B",
    manual: "Reception — Addebito manuale",
    city_tax: "Front Office — Tassa di soggiorno comunale",
    payment: "Cassa — Registrazione pagamento",
    meal_plan_credit: "PMS — Credito board / meal plan",
    room_service: "Room Service — Ordine in camera",
  };

  const narrative = [
    `Addebito "${row.description}" per € ${Math.abs(row.amount).toFixed(2)}.`,
    `Origine: ${originMap[row.source] ?? row.source}.`,
    `Reparto: ${row.department}. Operatore: ${row.operator}.`,
    `Data ${row.date} ore ${row.time}. IVA ${row.vatPct}%.`,
    row.status === "void" ? "ATTENZIONE: movimento annullato." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    chargeId: row.id,
    origin: originMap[row.source] ?? row.source,
    department: row.department,
    operator: row.operator,
    date: row.date,
    time: row.time,
    vatPct: row.vatPct,
    total: row.total,
    description: row.description,
    narrative,
  };
}

export function analyzeFolio(input: FolioAiContextInput): FolioAiAnalysis {
  const { detail, reservation, customer } = input;
  const { folio, charges, auditLogs } = detail;
  const rows = charges.map(enrichCharge);

  const economics = computeEconomics(rows, folio, reservation ?? null);
  const timeline = enrichTimeline(buildTimeline(rows, reservation ?? null));

  const anomalies: FolioAiAnomaly[] = [
    ...checkMissingCharges(rows, reservation),
    ...findDuplicates(rows),
    ...checkBalance(rows, folio),
    ...checkVat(rows),
  ];

  if (economics.balance > 0.005 && folio.status === "open" && reservation?.status === "check_out") {
    anomalies.push({
      id: uid("miss-pay"),
      severity: "critical",
      category: "pagamenti",
      title: "Pagamento mancante al checkout",
      detail: `Saldo € ${economics.balance.toFixed(2)} non saldato nonostante checkout.`,
      suggestion: "Registrare pagamento prima di chiudere il folio.",
    });
  }

  const revenueSuggestions = buildRevenueSuggestions(rows, reservation, customer);
  const guestSummary = buildGuestSummary(folio, rows, reservation, customer, economics);
  const fraudAlerts = detectFraud(rows, auditLogs);
  const customerInsights = buildCustomerInsights(customer, rows);
  const forecast = buildForecast(economics, reservation, revenueSuggestions);
  const checkoutChecklist = buildCheckoutChecklist(rows, folio, reservation, economics, anomalies);

  const splitSummary: Record<string, number> = {};
  for (const row of rows) {
    if (row.source === "payment" || row.status === "void") continue;
    const split = row.split ?? "A";
    splitSummary[split] = (splitSummary[split] ?? 0) + row.amount;
  }

  const paymentAssistant: FolioAiPaymentAssistant = {
    balance: economics.balance,
    credit: economics.creditTotal,
    paidTotal: economics.paidTotal,
    dueTotal: economics.dueTotal,
    paymentCount: rows.filter((r) => r.source === "payment").length,
    suggestedActions: [
      economics.balance > 0 ? `Incassare € ${economics.balance.toFixed(2)}` : "Saldo OK",
      Object.keys(splitSummary).length > 1 ? "Verificare split folio prima della chiusura" : "",
      economics.creditTotal > 0 ? `Credito disponibile € ${economics.creditTotal.toFixed(2)}` : "",
    ].filter(Boolean),
    splitSummary,
  };

  const criticalAnomalies = anomalies.filter((a) => a.severity === "critical");
  const checkoutFails = checkoutChecklist.filter((c) => c.status === "fail");
  const checkoutBlocked = criticalAnomalies.length > 0 || checkoutFails.some((c) => c.id === "balance" || c.id === "ai_critical");
  const checkoutBlockReasons = [
    ...criticalAnomalies.map((a) => a.title),
    ...checkoutFails.filter((c) => c.status === "fail").map((c) => c.label),
  ];

  const proposedActions = buildProposedActions(folio, economics, reservation, customer);

  return {
    folioId: folio.id,
    generatedAt: new Date().toISOString(),
    anomalies,
    revenueSuggestions,
    guestSummary,
    paymentAssistant,
    checkoutChecklist,
    fraudAlerts,
    customerInsights,
    forecast,
    timeline,
    checkoutBlocked,
    checkoutBlockReasons,
    proposedActions,
  };
}

export function buildFolioAiPromptContext(input: FolioAiContextInput): string {
  const analysis = analyzeFolio(input);
  const { detail, reservation, customer } = input;
  const rows = detail.charges.map(enrichCharge);

  const chargeSummary = rows
    .slice(0, 40)
    .map(
      (r) =>
        `- [${r.id}] ${r.date} ${r.section} | ${r.description} | € ${r.amount.toFixed(2)} | ${r.operator} | IVA ${r.vatPct}%`,
    )
    .join("\n");

  return [
    "=== CONTESTO GUEST FOLIO (dati reali PMS) ===",
    `Folio ID: ${detail.folio.id}`,
    `Ospite: ${detail.folio.guestName ?? customer?.name ?? "—"}`,
    `Camera: ${detail.folio.roomCode ?? "—"}`,
    `Stato folio: ${detail.folio.status}${detail.folio.locked ? " (BLOCCATO)" : ""}`,
    `Saldo: € ${detail.folio.balance.toFixed(2)} ${detail.folio.currency}`,
    reservation
      ? `Prenotazione: ${reservation.guestName} · ${reservation.checkInDate} → ${reservation.checkOutDate} · ${reservation.nights} notti · ${reservation.status}`
      : "",
    customer ? `CRM: ${customer.type} · ${customer.visits} visite · allergie: ${customer.allergies || "nessuna"}` : "",
    "",
    "Anomalie rilevate:",
    analysis.anomalies.length
      ? analysis.anomalies.map((a) => `- [${a.severity}] ${a.title}: ${a.detail}`).join("\n")
      : "- Nessuna anomalia",
    "",
    "Suggerimenti revenue:",
    analysis.revenueSuggestions.map((s) => `- ${s.service}: ${s.reason}`).join("\n") || "- Nessuno",
    "",
    "Checklist checkout:",
    analysis.checkoutChecklist.map((c) => `- [${c.status}] ${c.label}: ${c.detail}`).join("\n"),
    "",
    "Movimenti (max 40):",
    chargeSummary || "- Nessun movimento",
    "",
    "Regole: rispondi SOLO usando questi dati. Per azioni operative (pagamenti, checkout, email) proponi sempre conferma umana.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function translateFolioText(text: string, locale: string): string {
  if (locale === "it" || !text.trim()) return text;
  const dict: Record<string, Record<string, string>> = {
    en: {
      Camera: "Room",
      Ristorante: "Restaurant",
      "Tassa di soggiorno": "City tax",
      Pagamento: "Payment",
      Saldo: "Balance",
      Minibar: "Minibar",
      Lavanderia: "Laundry",
    },
    nl: {
      Camera: "Kamer",
      Ristorante: "Restaurant",
      "Tassa di soggiorno": "Toeristenbelasting",
      Pagamento: "Betaling",
      Saldo: "Saldo",
    },
  };
  const map = dict[locale];
  if (!map) return text;
  let out = text;
  for (const [from, to] of Object.entries(map)) {
    out = out.replaceAll(from, to);
  }
  return out;
}
