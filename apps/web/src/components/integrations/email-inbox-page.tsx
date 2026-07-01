"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, Mail, RefreshCw, Save, Send, Server } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { TabBar } from "@/components/shared/tab-bar";
import { api, type AdminEmailConfig, type InboundEmailMessageRow } from "@/lib/api-client";

type EmailDraft = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  secure: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapEnabled: boolean;
  imapMailbox: string;
};

const EMPTY: EmailDraft = {
  host: "smtps.aruba.it",
  port: 465,
  username: "",
  password: "",
  fromAddress: "",
  secure: true,
  imapHost: "imaps.aruba.it",
  imapPort: 993,
  imapSecure: true,
  imapEnabled: false,
  imapMailbox: "INBOX",
};

const tabs = [
  { id: "config", label: "Configurazione" },
  { id: "inbox", label: "Posta in arrivo" },
];

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

function bindConfig(cfg: AdminEmailConfig | null): EmailDraft {
  if (!cfg) return EMPTY;
  return {
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: "",
    fromAddress: cfg.fromAddress,
    secure: cfg.secure,
    imapHost: cfg.imapHost || "imaps.aruba.it",
    imapPort: cfg.imapPort || 993,
    imapSecure: cfg.imapSecure,
    imapEnabled: cfg.imapEnabled,
    imapMailbox: cfg.imapMailbox || "INBOX",
  };
}

export function EmailInboxPage() {
  const [tab, setTab] = useState("config");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AdminEmailConfig | null>(null);
  const [draft, setDraft] = useState<EmailDraft>(EMPTY);
  const [messages, setMessages] = useState<InboundEmailMessageRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; message: string } | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await api.tenantEmailConfig.get();
      setConfig(cfg);
      setDraft(bindConfig(cfg));
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Errore caricamento" });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInbox = useCallback(async () => {
    try {
      const rows = await api.emailInbox.list({ limit: 80 });
      setMessages(rows);
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Errore inbox" });
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (tab === "inbox") void loadInbox();
  }, [tab, loadInbox]);

  async function handleSave() {
    setBusy("save");
    setToast(null);
    try {
      const saved = await api.tenantEmailConfig.save(draft);
      setConfig(saved);
      setDraft((d) => ({ ...d, password: "" }));
      setToast({ kind: "ok", message: "Configurazione email salvata." });
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Salvataggio fallito" });
    } finally {
      setBusy(null);
    }
  }

  async function handleTestSmtp() {
    setBusy("smtp");
    setToast(null);
    try {
      const res = await api.tenantEmailConfig.testSmtp(draft.fromAddress || undefined);
      setToast({ kind: "ok", message: `Test SMTP inviato a ${res.recipient}` });
      await loadConfig();
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Test SMTP fallito" });
    } finally {
      setBusy(null);
    }
  }

  async function handleTestImap() {
    setBusy("imap");
    setToast(null);
    try {
      await api.tenantEmailConfig.testImap();
      setToast({ kind: "ok", message: "Connessione IMAP riuscita." });
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Test IMAP fallito" });
    } finally {
      setBusy(null);
    }
  }

  async function handlePoll() {
    setBusy("poll");
    setToast(null);
    try {
      const res = await api.emailInbox.poll();
      setToast({
        kind: "ok",
        message: `Sincronizzate ${res.fetched} email, ${res.processed} elaborate in prenotazioni/ordini.`,
      });
      await loadInbox();
      await loadConfig();
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Sincronizzazione fallita" });
    } finally {
      setBusy(null);
    }
  }

  async function handleProcess(id: string) {
    setBusy(`process-${id}`);
    try {
      const res = await api.emailInbox.process(id);
      if (res.status === "processed") {
        setToast({
          kind: "ok",
          message: res.parsedType === "order" ? "Ordine creato da email." : "Prenotazione creata da email.",
        });
      } else {
        setToast({ kind: "err", message: res.errorMessage || "Elaborazione non riuscita" });
      }
      await loadInbox();
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Errore elaborazione" });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-rw-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email, ordini e prenotazioni"
        subtitle="Configura la casella del locale e trasforma le email in prenotazioni tavolo o ordini."
      >
        {config?.imapLastSyncAt ? (
          <Chip
            label="Ultima sync"
            value={new Date(config.imapLastSyncAt).toLocaleString("it-IT")}
            tone="info"
          />
        ) : null}
      </PageHeader>

      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "config" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Invio (SMTP)" description="Per conferme, PDF e notifiche dal gestionale.">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={`${inputCls} sm:col-span-2`} placeholder="Indirizzo mittente" value={draft.fromAddress} onChange={(e) => setDraft((d) => ({ ...d, fromAddress: e.target.value }))} />
              <input className={inputCls} placeholder="Utente SMTP" value={draft.username} onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))} />
              <input className={inputCls} type="password" placeholder={config ? "Password (lascia vuoto per non cambiare)" : "Password"} value={draft.password} onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))} />
              <input className={inputCls} placeholder="Host SMTP" value={draft.host} onChange={(e) => setDraft((d) => ({ ...d, host: e.target.value }))} />
              <input className={inputCls} type="number" placeholder="Porta" value={draft.port} onChange={(e) => setDraft((d) => ({ ...d, port: Number(e.target.value) || 465 }))} />
              <label className="flex items-center gap-2 text-sm text-rw-soft sm:col-span-2">
                <input type="checkbox" checked={draft.secure} onChange={(e) => setDraft((d) => ({ ...d, secure: e.target.checked }))} />
                SSL/TLS attivo (consigliato, porta 465)
              </label>
            </div>
          </Card>

          <Card title="Ricezione (IMAP)" description="Legge la posta in arrivo e crea prenotazioni o ordini.">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-rw-soft sm:col-span-2">
                <input type="checkbox" checked={draft.imapEnabled} onChange={(e) => setDraft((d) => ({ ...d, imapEnabled: e.target.checked }))} />
                Abilita lettura email in arrivo (IMAP)
              </label>
              <input className={inputCls} placeholder="Host IMAP" value={draft.imapHost} onChange={(e) => setDraft((d) => ({ ...d, imapHost: e.target.value }))} />
              <input className={inputCls} type="number" placeholder="Porta IMAP" value={draft.imapPort} onChange={(e) => setDraft((d) => ({ ...d, imapPort: Number(e.target.value) || 993 }))} />
              <input className={`${inputCls} sm:col-span-2`} placeholder="Cartella (es. INBOX)" value={draft.imapMailbox} onChange={(e) => setDraft((d) => ({ ...d, imapMailbox: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-rw-soft sm:col-span-2">
                <input type="checkbox" checked={draft.imapSecure} onChange={(e) => setDraft((d) => ({ ...d, imapSecure: e.target.checked }))} />
                SSL IMAP attivo (porta 993)
              </label>
              <p className="sm:col-span-2 text-xs text-rw-muted">
                Usa le stesse credenziali SMTP sopra. Aruba: <code>smtps.aruba.it:465</code> + <code>imaps.aruba.it:993</code>.
              </p>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2 xl:col-span-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void handleSave()} disabled={!!busy}>
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva configurazione
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink disabled:opacity-60" onClick={() => void handleTestSmtp()} disabled={!!busy}>
              {busy === "smtp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Test invio SMTP
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink disabled:opacity-60" onClick={() => void handleTestImap()} disabled={!!busy || !draft.imapEnabled}>
              {busy === "imap" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
              Test ricezione IMAP
            </button>
          </div>
        </div>
      ) : (
        <Card
          title="Posta in arrivo"
          description="Le email con richieste di prenotazione o ordine vengono elaborate automaticamente. Le altre restano in attesa."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void handlePoll()} disabled={!!busy || !config?.imapEnabled}>
              {busy === "poll" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizza ora
            </button>
            {!config?.imapEnabled ? (
              <span className="text-sm text-amber-300">Abilita IMAP nella scheda Configurazione.</span>
            ) : null}
          </div>
          <DataTable
            data={messages}
            keyExtractor={(row) => row.id}
            emptyMessage="Nessuna email sincronizzata. Premi Sincronizza ora."
            columns={[
              {
                key: "from",
                header: "Da",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-rw-ink">{row.fromName || row.fromEmail}</p>
                    <p className="text-xs text-rw-muted">{row.fromEmail}</p>
                  </div>
                ),
              },
              { key: "subject", header: "Oggetto", render: (row) => <span className="text-rw-soft">{row.subject || "—"}</span> },
              {
                key: "type",
                header: "Tipo",
                render: (row) => (
                  <span className="text-xs font-semibold uppercase text-rw-muted">
                    {row.parsedType === "booking" ? "Prenotazione" : row.parsedType === "order" ? "Ordine" : row.parsedType ?? "—"}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Stato",
                render: (row) => (
                  <Chip
                    label={row.status}
                    tone={row.status === "processed" ? "success" : row.status === "failed" ? "danger" : row.status === "pending" ? "warn" : "default"}
                  />
                ),
              },
              {
                key: "receivedAt",
                header: "Ricevuta",
                render: (row) => <span className="text-xs text-rw-muted">{new Date(row.receivedAt).toLocaleString("it-IT")}</span>,
              },
              {
                key: "actions",
                header: "",
                render: (row) =>
                  row.status === "pending" || row.status === "failed" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-rw-line px-2 py-1 text-xs font-semibold text-rw-ink disabled:opacity-50"
                      disabled={!!busy}
                      onClick={() => void handleProcess(row.id)}
                    >
                      {busy === `process-${row.id}` ? "…" : "Elabora"}
                    </button>
                  ) : row.linkedBookingId ? (
                    <a href="/prenotazioni" className="text-xs font-semibold text-rw-accent">Prenotazioni →</a>
                  ) : row.linkedOrderId ? (
                    <a href="/ordini" className="text-xs font-semibold text-rw-accent">Ordini →</a>
                  ) : null,
              },
            ]}
          />
        </Card>
      )}

      <Card title="Come funziona" description="Suggerimenti per i clienti che scrivono via email.">
        <div className="grid gap-3 md:grid-cols-2 text-sm text-rw-soft">
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
            <p className="font-semibold text-rw-ink flex items-center gap-2"><Mail className="h-4 w-4" /> Prenotazione tavolo</p>
            <p className="mt-2">Parole chiave: prenotazione, tavolo, persone, data e ora. Es: «Prenotazione per 4 persone sabato 20:30».</p>
          </div>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
            <p className="font-semibold text-rw-ink flex items-center gap-2"><Inbox className="h-4 w-4" /> Ordine / asporto</p>
            <p className="mt-2">Parole chiave: ordine, asporto. Righe tipo «2x Margherita» vengono convertite in righe ordine.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
