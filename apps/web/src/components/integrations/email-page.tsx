"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";
import { useAuth } from "@/components/auth/auth-context";
import { api, type AdminEmailConfig, type AdminTenant } from "@/lib/api-client";
const tabs = [
  { id: "config", label: "Configurazione SMTP" },
  { id: "templates", label: "Template email" },
  { id: "log", label: "Invii recenti" },
];

/** Built-in transactional templates (preview only until a template engine ships). */
const BUILTIN_EMAIL_TEMPLATES = [
  {
    id: "tpl1",
    nome: "Attivazione account",
    subject: "Benvenuto in RistoSaaS!",
    preview:
      "Ciao {{nome}}, il tuo account è stato attivato con successo. Accedi alla dashboard per iniziare.",
  },
  {
    id: "tpl2",
    nome: "Conferma prenotazione",
    subject: "Prenotazione confermata — Tavolo {{tavolo}}",
    preview:
      "La tua prenotazione per il {{data}} alle {{ora}} è confermata. Tavolo {{tavolo}} per {{coperti}} persone.",
  },
  {
    id: "tpl3",
    nome: "Ricevuta ordine",
    subject: "Ricevuta ordine #{{ordine}}",
    preview: "Grazie per la tua visita! Totale: €{{totale}}. Dettaglio allegato.",
  },
] as const;

type SmtpDraft = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  secure: boolean;
};

const EMPTY_SMTP: SmtpDraft = {
  host: "",
  port: 587,
  username: "",
  password: "",
  fromAddress: "",
  secure: false,
};

export function EmailPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [tab, setTab] = useState("config");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [configs, setConfigs] = useState<AdminEmailConfig[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [smtp, setSmtp] = useState<SmtpDraft>(EMPTY_SMTP);

  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [testRecipient, setTestRecipient] = useState("");

  const [previewTpl, setPreviewTpl] = useState<string | null>(null);

  const bindConfigToForm = useCallback((cfg: AdminEmailConfig | undefined) => {
    if (!cfg) {
      setSmtp(EMPTY_SMTP);
      return;
    }
    setSmtp({
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      password: "",
      fromAddress: cfg.fromAddress,
      secure: cfg.secure,
    });
  }, []);

  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [tenantRows, cfgRows] = await Promise.all([
        api.admin.tenants.list(),
        api.admin.emailConfig.list(),
      ]);
      setTenants(tenantRows);
      setConfigs(cfgRows);
      const firstId = tenantRows[0]?.id ?? "";
      setTenantId(firstId);
      bindConfigToForm(cfgRows.find((c) => c.tenantId === firstId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, bindConfigToForm]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!tenantId) return;
    const cfg = configs.find((c) => c.tenantId === tenantId);
    bindConfigToForm(cfg);
  }, [tenantId, configs, bindConfigToForm]);

  const selectedConfig = useMemo(
    () => configs.find((c) => c.tenantId === tenantId),
    [configs, tenantId],
  );

  const logRows = useMemo(() => {
    if (!selectedConfig?.lastTestedAt) return [];
    const ok = selectedConfig.lastTestStatus === "ok";
    const data =
      typeof selectedConfig.lastTestedAt === "string"
        ? new Date(selectedConfig.lastTestedAt).toLocaleString("it-IT")
        : "—";
    return [
      {
        id: "smtp-test",
        data,
        to: "—",
        subject: "Verifica SMTP (test piattaforma)",
        stato: ok ? ("inviato" as const) : ("fallito" as const),
      },
    ];
  }, [selectedConfig]);

  async function handleSave() {
    if (!tenantId) return;
    setBusy("save");
    setToast(null);
    try {
      const updated = await api.admin.emailConfig.save(tenantId, smtp);
      setToast({ kind: "ok", message: "Configurazione salvata." });
      setConfigs((prev) => {
        const rest = prev.filter((c) => c.tenantId !== updated.tenantId);
        return [updated, ...rest];
      });
      setSmtp((s) => ({ ...s, password: "" }));
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Errore salvataggio" });
    } finally {
      setBusy(null);
    }
  }

  async function handleTest() {
    if (!tenantId) return;
    setBusy("test");
    setToast(null);
    try {
      const response = await api.admin.emailConfig.test(tenantId, testRecipient.trim() || undefined);
      const {
        messageId,
        recipient,
        error: testError,
        ...configPart
      } = response as typeof response & { messageId?: string; recipient?: string; error?: string };
      if (testError) {
        setToast({
          kind: "err",
          message: `Invio fallito: ${testError}`,
        });
      } else {
        setToast({
          kind: "ok",
          message: `Email di test inviata${recipient ? ` a ${recipient}` : ""}${messageId ? ` (messageId: ${messageId.slice(0, 24)}...)` : ""}.`,
        });
      }
      setConfigs((prev) => {
        const rest = prev.filter((c) => c.tenantId !== configPart.tenantId);
        return [configPart as AdminEmailConfig, ...rest];
      });
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Errore test" });
    } finally {
      setBusy(null);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Email / SMTP" subtitle="Accesso riservato" />
        <Card title="Permesso negato">
          <p className="text-sm text-rw-soft">Questa pagina è disponibile solo per il ruolo super admin.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Email / SMTP" subtitle="Configurazione SMTP per tenant e template integrati" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento…
        </div>
      )}
      {loadError && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{loadError}</p>
      )}

      {tab === "config" && (
        <Card title="Impostazioni SMTP" description="Salvate in TenantEmailConfig per il tenant selezionato">
          <div className="mb-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Tenant</span>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink"
              >
                {tenants.length === 0 && <option value="">Nessun tenant</option>}
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.plan})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Host</span>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input
                  type="text"
                  value={smtp.host}
                  onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                  className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 text-sm text-rw-ink"
                  placeholder="smtp.provider.com"
                  disabled={!tenantId}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Porta</span>
              <input
                type="number"
                min={1}
                max={65535}
                value={smtp.port || ""}
                onChange={(e) => setSmtp((s) => ({ ...s, port: parseInt(e.target.value, 10) || 0 }))}
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink"
                disabled={!tenantId}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Utente</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input
                  type="text"
                  value={smtp.username}
                  onChange={(e) => setSmtp((s) => ({ ...s, username: e.target.value }))}
                  className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 text-sm text-rw-ink"
                  disabled={!tenantId}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Password</span>
              <input
                type="password"
                value={smtp.password}
                onChange={(e) => setSmtp((s) => ({ ...s, password: e.target.value }))}
                placeholder={selectedConfig ? "Lascia vuoto per non modificare" : "Obbligatoria per nuova configurazione"}
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink"
                disabled={!tenantId}
                autoComplete="new-password"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-rw-ink">Mittente (From)</span>
              <input
                type="text"
                value={smtp.fromAddress}
                onChange={(e) => setSmtp((s) => ({ ...s, fromAddress: e.target.value }))}
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink"
                disabled={!tenantId}
              />
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={smtp.secure}
                onChange={(e) => setSmtp((s) => ({ ...s, secure: e.target.checked }))}
                disabled={!tenantId}
              />
              <span className="text-sm text-rw-ink">TLS / SSL (secure)</span>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-rw-muted">Destinatario test (opzionale, default mittente)</span>
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={smtp.fromAddress || "email@example.com"}
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink"
                disabled={!tenantId}
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy === "save" || !tenantId}
              className="inline-flex items-center gap-2 self-end rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white shadow-rw disabled:opacity-50"
            >
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
              Salva configurazione
            </button>
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={busy === "test" || !tenantId || !selectedConfig}
              className="inline-flex items-center gap-2 self-end rounded-xl border border-rw-line bg-rw-surfaceAlt px-5 py-2.5 text-sm font-semibold text-rw-ink disabled:opacity-50"
              title={!selectedConfig ? "Salva prima una configurazione SMTP per questo tenant" : undefined}
            >
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Invia email di test
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {toast?.kind === "ok" && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {toast.message}
              </span>
            )}
            {toast?.kind === "err" && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
                <XCircle className="h-4 w-4" /> {toast.message}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-rw-muted">
            Il pulsante &quot;Invia email di test&quot; invia un messaggio reale tramite SMTP del tenant e aggiorna <code className="rounded bg-rw-surfaceAlt px-1">lastTestStatus</code>.
          </p>
        </Card>
      )}

      {tab === "templates" && (
        <Card title="Template email" description="Anteprime dei messaggi transazionali previsti (variabili {{nome}}, …). Editing persistente non ancora disponibile.">
          <div className="space-y-3">
            {BUILTIN_EMAIL_TEMPLATES.map((t) => (
              <div key={t.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-rw-ink">
                      <FileText className="h-4 w-4 text-rw-accent" /> {t.nome}
                    </p>
                    <p className="mt-1 text-xs text-rw-muted">Oggetto: {t.subject}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewTpl(previewTpl === t.id ? null : t.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rw-line bg-rw-surface px-3 py-1.5 text-xs font-semibold text-rw-ink"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                </div>
                {previewTpl === t.id && (
                  <div className="mt-3 rounded-lg border border-rw-line bg-rw-surface p-3 text-sm text-rw-soft">{t.preview}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "log" && (
        <Card
          title="Invii recenti"
          description="Lo storico applicativo degli invii non è persistito nel DB. Qui compare solo l’ultimo esito del test SMTP del tenant selezionato."
        >
          {!tenantId ? (
            <p className="text-sm text-rw-muted">Seleziona un tenant nella tab Configurazione.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-rw-muted">
                Tenant: <span className="font-semibold text-rw-ink">{selectedConfig?.tenantName ?? tenants.find((x) => x.id === tenantId)?.name}</span>
              </p>
              <DataTable
                columns={[
                  {
                    key: "data",
                    header: "Data",
                    render: (r) => (
                      <span className="flex items-center gap-1.5 text-rw-ink">
                        <Clock className="h-3.5 w-3.5 text-rw-muted" />
                        {r.data}
                      </span>
                    ),
                  },
                  { key: "to", header: "Destinatario", render: (r) => <span className="text-rw-ink">{r.to}</span> },
                  {
                    key: "subject",
                    header: "Oggetto",
                    render: (r) => <span className="text-rw-soft">{r.subject}</span>,
                  },
                  {
                    key: "stato",
                    header: "Stato",
                    render: (r) => <Chip label={r.stato} tone={r.stato === "inviato" ? "success" : "danger"} />,
                  },
                ]}
                data={logRows}
                keyExtractor={(r) => r.id}
              />
              {logRows.length === 0 && (
                <p className="mt-4 text-center text-sm text-rw-muted">
                  Nessun test SMTP registrato per questo tenant. Usa &quot;Registra test SMTP&quot; dopo aver salvato la configurazione.
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
