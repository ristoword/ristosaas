"use client";

import { useState } from "react";
import {
  Mail,
  Send,
  Server,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  FileText,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";

const tabs = [
  { id: "config", label: "Configurazione SMTP" },
  { id: "templates", label: "Template email" },
  { id: "log", label: "Invii recenti" },
];

const mockTemplates = [
  { id: "tpl1", nome: "Attivazione account", subject: "Benvenuto in RistoSaaS!", preview: "Ciao {{nome}}, il tuo account è stato attivato con successo. Accedi alla dashboard per iniziare." },
  { id: "tpl2", nome: "Conferma prenotazione", subject: "Prenotazione confermata — Tavolo {{tavolo}}", preview: "La tua prenotazione per il {{data}} alle {{ora}} è confermata. Tavolo {{tavolo}} per {{coperti}} persone." },
  { id: "tpl3", nome: "Ricevuta ordine", subject: "Ricevuta ordine #{{ordine}}", preview: "Grazie per la tua visita! Totale: €{{totale}}. Dettaglio allegato." },
];

const mockSentEmails = [
  { id: "em1", to: "mario.rossi@email.it", subject: "Benvenuto in RistoSaaS!", stato: "inviato", data: "2026-04-11 14:30" },
  { id: "em2", to: "info@azienda.it", subject: "Prenotazione confermata — Tavolo 5", stato: "inviato", data: "2026-04-11 12:15" },
  { id: "em3", to: "cliente@test.com", subject: "Ricevuta ordine #ORD-005", stato: "inviato", data: "2026-04-10 21:00" },
  { id: "em4", to: "bounce@fake.it", subject: "Benvenuto in RistoSaaS!", stato: "fallito", data: "2026-04-10 18:45" },
  { id: "em5", to: "sara@email.it", subject: "Prenotazione confermata — Tavolo 3", stato: "inviato", data: "2026-04-09 10:20" },
];

export function EmailPage() {
  const [tab, setTab] = useState("config");
  const [smtpHost, setSmtpHost] = useState("smtp.ristodemo.it");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("noreply@ristodemo.it");
  const [smtpPass, setSmtpPass] = useState("••••••••••••");
  const [smtpFrom, setSmtpFrom] = useState("RistoSaaS <noreply@ristodemo.it>");
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [previewTpl, setPreviewTpl] = useState<string | null>(null);

  function sendTest() {
    setTestResult(null);
    setTimeout(() => setTestResult("ok"), 1200);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Email / SMTP" subtitle="Configurazione invio email e template" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "config" && (
        <Card title="Impostazioni SMTP" description="Configura il server di posta in uscita">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Host</span>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 text-sm text-rw-ink" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Porta</span>
              <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Utente</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 text-sm text-rw-ink" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Password</span>
              <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Mittente (From)</span>
              <input type="text" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white shadow-rw">
              <Settings2 className="h-4 w-4" /> Salva configurazione
            </button>
            <button type="button" onClick={sendTest} className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-5 py-2.5 text-sm font-semibold text-rw-ink">
              <Send className="h-4 w-4" /> Invia email di test
            </button>
            {testResult === "ok" && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Test riuscito
              </span>
            )}
            {testResult === "fail" && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
                <XCircle className="h-4 w-4" /> Test fallito
              </span>
            )}
          </div>
        </Card>
      )}

      {tab === "templates" && (
        <Card title="Template email">
          <div className="space-y-3">
            {mockTemplates.map((t) => (
              <div key={t.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-rw-ink">
                      <FileText className="h-4 w-4 text-rw-accent" /> {t.nome}
                    </p>
                    <p className="mt-1 text-xs text-rw-muted">Oggetto: {t.subject}</p>
                  </div>
                  <button type="button" onClick={() => setPreviewTpl(previewTpl === t.id ? null : t.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-rw-line bg-rw-surface px-3 py-1.5 text-xs font-semibold text-rw-ink">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                </div>
                {previewTpl === t.id && (
                  <div className="mt-3 rounded-lg border border-rw-line bg-rw-surface p-3 text-sm text-rw-soft">
                    {t.preview}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "log" && (
        <Card title="Invii recenti">
          <DataTable
            columns={[
              { key: "data", header: "Data", render: (r) => <span className="flex items-center gap-1.5 text-rw-ink"><Clock className="h-3.5 w-3.5 text-rw-muted" />{r.data}</span> },
              { key: "to", header: "Destinatario", render: (r) => <span className="text-rw-ink">{r.to}</span> },
              { key: "subject", header: "Oggetto", render: (r) => <span className="text-rw-soft">{r.subject}</span> },
              { key: "stato", header: "Stato", render: (r) => <Chip label={r.stato} tone={r.stato === "inviato" ? "success" : "danger"} /> },
            ]}
            data={mockSentEmails}
            keyExtractor={(r) => r.id}
          />
        </Card>
      )}
    </div>
  );
}
