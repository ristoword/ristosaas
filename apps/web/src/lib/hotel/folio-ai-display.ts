import { tf } from "@/core/i18n/interpolate";
import type { FolioAiAnalysis, FolioAiProposedAction } from "@/lib/api-client";
import type { Customer, GuestFolio, HotelReservation } from "@/lib/api-client";
import { folioStayStatusKey } from "@/lib/hotel/folio-utils";

type TranslateFn = (key: string) => string;
type ChecklistItem = FolioAiAnalysis["checkoutChecklist"][number];
type FraudAlert = FolioAiAnalysis["fraudAlerts"][number];

export function localizeStayOverview(
  folio: GuestFolio,
  reservation: HotelReservation | null,
  t: TranslateFn,
): string {
  if (reservation) {
    return tf(t, "hotel.folio.ai.overview.withReservation", {
      name: reservation.guestName,
      room: folio.roomCode ?? "—",
      nights: String(reservation.nights),
      status: t(folioStayStatusKey(reservation.status)),
    });
  }
  return tf(t, "hotel.folio.ai.overview.folioOnly", {
    name: folio.guestName ?? t("hotel.folio.guest.default"),
    status: folio.status,
  });
}

export function localizeChecklistItem(
  item: ChecklistItem,
  analysis: FolioAiAnalysis,
  t: TranslateFn,
  formatCurrency: (n: number) => string,
): { label: string; detail: string } {
  const label = t(`hotel.folio.ai.checklist.${item.id}.label`);
  const spending = analysis.guestSummary.spending;
  const paymentCount = analysis.paymentAssistant.paymentCount;

  const detailKey = `hotel.folio.ai.checklist.${item.id}.detail.${item.status}`;
  const params: Record<string, string> = {
    balance: formatCurrency(spending.balance),
    count: String(paymentCount),
    movements: item.detail.match(/(\d+)/)?.[1] ?? "0",
  };

  const translated = tf(t, detailKey, params);
  if (translated !== detailKey) {
    return { label: label.startsWith("hotel.") ? item.label : label, detail: translated };
  }
  return { label: label.startsWith("hotel.") ? item.label : label, detail: item.detail };
}

export function localizeProposedAction(
  action: FolioAiProposedAction,
  t: TranslateFn,
  formatCurrency: (n: number) => string,
): { label: string; description: string } {
  const labelKey = `hotel.folio.ai.action.${action.type}.label`;
  const descKey = `hotel.folio.ai.action.${action.type}.description`;
  const amount =
    typeof action.payload === "object" && action.payload && "amount" in action.payload
      ? formatCurrency(Number(action.payload.amount))
      : "";
  const email =
    typeof action.payload === "object" && action.payload && "toEmail" in action.payload
      ? String(action.payload.toEmail ?? "")
      : "";

  const label = t(labelKey);
  const description = tf(t, descKey, { amount, email });

  return {
    label: label.startsWith("hotel.") ? action.label : label,
    description: description.startsWith("hotel.") ? action.description : description,
  };
}

export function localizeFraudAlert(
  alert: FraudAlert,
  t: TranslateFn,
  formatCurrency: (n: number) => string,
): string {
  const key = `hotel.folio.ai.fraud.${alert.type}`;
  const translated = tf(t, key, { n: String((alert as { relatedIds?: string[] }).relatedIds?.length ?? 0) });
  return translated.startsWith("hotel.") ? alert.detail : translated;
}

export function localizePaymentSuggestion(
  suggestion: string,
  analysis: FolioAiAnalysis,
  t: TranslateFn,
  formatCurrency: (n: number) => string,
): string {
  const balance = analysis.paymentAssistant.balance;
  const credit = analysis.paymentAssistant.credit;
  if (suggestion.includes("Saldo OK") || suggestion.toLowerCase().includes("balance ok")) {
    return t("hotel.folio.ai.payment.balanceOk");
  }
  if (suggestion.includes("Incassare") || suggestion.toLowerCase().includes("collect")) {
    return tf(t, "hotel.folio.ai.payment.collect", { amount: formatCurrency(balance) });
  }
  if (suggestion.includes("split folio") || suggestion.includes("split")) {
    return t("hotel.folio.ai.payment.verifySplit");
  }
  if (suggestion.includes("Credito") || suggestion.toLowerCase().includes("credit")) {
    return tf(t, "hotel.folio.ai.payment.credit", { amount: formatCurrency(credit) });
  }
  return suggestion;
}

export function localizeGuestHistory(customer: Customer | null, t: TranslateFn, formatCurrency: (n: number) => string): string {
  if (!customer) return t("hotel.folio.ai.history.noCrm");
  return tf(t, "hotel.folio.ai.history.crm", {
    visits: String(customer.visits),
    amount: formatCurrency(customer.totalSpent),
    lastVisit: customer.lastVisit || "—",
  });
}

export function localizeGuestIssue(issue: string, t: TranslateFn, formatCurrency: (n: number) => string): string {
  if (issue.startsWith("Saldo elevato")) {
    const match = issue.match(/€\s*([\d.,]+)/);
    return tf(t, "hotel.folio.ai.issue.highBalance", { amount: match ? `€ ${match[1]}` : formatCurrency(0) });
  }
  if (issue.includes("bloccato") || issue.toLowerCase().includes("locked")) {
    return t("hotel.folio.ai.issue.folioLocked");
  }
  return issue;
}

export function localizeForecastNote(
  note: string,
  analysis: FolioAiAnalysis,
  t: TranslateFn,
  formatCurrency: (n: number) => string,
): string {
  if (note.startsWith("Saldo attuale")) {
    return tf(t, "hotel.folio.ai.forecast.currentBalance", { amount: formatCurrency(analysis.paymentAssistant.balance) });
  }
  if (note.includes("upsell") || note.includes("Upsell")) {
    if (note.includes("Nessun")) return t("hotel.folio.ai.forecast.noUpsell");
    const match = note.match(/€\s*([\d.,]+)/);
    return tf(t, "hotel.folio.ai.forecast.upsell", { amount: match ? `€ ${match[1]}` : "" });
  }
  return note;
}

export function localizeCheckoutBlockReason(
  reason: string,
  analysis: FolioAiAnalysis,
  t: TranslateFn,
): string {
  const checklist = analysis.checkoutChecklist.find((c) => c.label === reason);
  if (checklist) {
    const label = t(`hotel.folio.ai.checklist.${checklist.id}.label`);
    if (!label.startsWith("hotel.")) return label;
  }
  const anomaly = analysis.anomalies.find((a) => a.title === reason);
  if (anomaly) {
    const title = t(`hotel.folio.ai.anomaly.${anomaly.category}.title`);
    if (!title.startsWith("hotel.")) return title;
  }
  return reason;
}
