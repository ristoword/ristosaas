"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit2,
  Mail,
  RotateCcw,
  Save,
  Send,
  Server,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  FileText,
  Settings2,
  Loader2,
  X,
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

/**
 * Esempi di testo per anteprima in UI. L'invio di prova e la configurazione SMTP
 * usano le API reali (`TenantEmailConfig`); questi contenuti non sono ancora
 * modellati come template editabili lato database.
 */
const BUILTIN_EMAIL_TEMPLATES = [
  {
    id: "tpl1",
    nome: "Attivazione account",
    subject: "Benvenuto in RistoSimply!",
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

type DbTemplate = {
  slug: string; subject: string; body: string; variables: string; customized: boolean; updatedAt: string | null;
};

const TEMPLATE_NAMES: Record<string, string> = {
  prenotazione_confermata: "Conferma prenotazione ristorante",
  prenotazione_annullata: "Annullamento prenotazione",
  checkin_benvenuto: "Benvenuto al check-in hotel",
  checkout_riepilogo: "Riepilogo al check-out",
  ordine_asporto: "Conferma ordine asporto",
};

const inputCls = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<DbTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/email-templates").then((r) => r.json()).then((d) => setTemplates(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function openEdit(t: DbTemplate) {
    setEditSlug(t.slug); setEditSubject(t.subject); setEditBody(t.body);
  }

  async function handleSave() {
    if (!editSlug) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/email-templates/${editSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates((prev) => prev.map((t) => t.slug === editSlug ? { ...t, ...updated, customized: true } : t));
        setSavedSlug(editSlug);
        setEditSlug(null);
        setTimeout(() => setSavedSlug(null), 2500);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleReset(slug: string) {
    if (!confirm("Ripristinare il template predefinito?")) return;
    await fetch(`/api/email-templates/${slug}`, { method: "DELETE" });
    const res = await fetch("/api/email-templates").then((r) => r.json()).catch(() => templates);
    setTemplates(res);
  }

  if (loading) return <div className="flex items-center gap-2 py-8 text-sm text-rw-muted"><Loader2 className="h-4 w-4 animate-spin" />Caricamento template…</div>;

  return (
    <Card title="Template email" description="Personalizza i messaggi transazionali. Usa {{variabile}} per i segnaposto.">
      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t.slug} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-rw-ink">
                  <FileText className="h-4 w-4 text-rw-accent" />
                  {TEMPLATE_NAMES[t.slug] ?? t.slug}
                  {t.customized && <span className="rounded-full bg-rw-accent/15 px-2 py-0.5 text-[10px] font-semibold text-rw-accent">Personalizzato</span>}
                  {savedSlug === t.slug && <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="h-3 w-3" />Salvato</span>}
                </p>
                {t.variables && <p className="mt-1 text-xs text-rw-muted">Variabili: <span className="font-mono">{t.variables}</span></p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {t.customized && (
                  <button type="button" onClick={() => void handleReset(t.slug)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rw-line px-2 py-1.5 text-xs text-rw-muted hover:text-red-400 transition">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
                <button type="button" onClick={() => editSlug === t.slug ? setEditSlug(null) : openEdit(t)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rw-line bg-rw-surface px-3 py-1.5 text-xs font-semibold text-rw-ink hover:border-rw-accent/40 transition">
                  {editSlug === t.slug ? <><X className="h-3.5 w-3.5" /> Annulla</> : <><Edit2 className="h-3.5 w-3.5" /> Modifica</>}
                </button>
              </div>
            </div>

            {editSlug === t.slug ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-rw-muted mb-1">Oggetto</label>
                  <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rw-muted mb-1">Corpo del messaggio</label>
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} className={inputCls + " resize-y font-mono text-xs"} />
                </div>
                <button type="button" onClick={() => void handleSave()} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rw-accent/90 disabled:opacity-50 transition">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Salvataggio…" : "Salva template"}
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-rw-line bg-rw-surface p-3">
                <p className="text-xs text-rw-muted mb-1 font-semibold">Oggetto: {t.subject}</p>
                <pre className="text-xs text-rw-soft whitespace-pre-wrap font-sans line-clamp-4">{t.body}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

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

  const [emailLogs, setEmailLogs] = useState<Array<{ id: string; toEmail: string; subject: string; templateSlug: string; status: string; sentAt: string }>>([]);

  useEffect(() => {
    if (tab !== "log") return;
    fetch("/api/email-logs?limit=50").then((r) => r.ok ? r.json() : []).then((d) => setEmailLogs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [tab]);

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
        <EmailTemplatesTab />
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
              {emailLogs.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-rw-muted">Log invii reali dal DB ({emailLogs.length})</p>
                  <DataTable
                    columns={[
                      { key: "sentAt", header: "Data/ora", render: (r) => <span className="text-xs text-rw-ink">{new Date(r.sentAt).toLocaleString("it-IT")}</span> },
                      { key: "toEmail", header: "Destinatario", render: (r) => <span className="text-xs">{r.toEmail}</span> },
                      { key: "subject", header: "Oggetto", render: (r) => <span className="text-xs text-rw-soft truncate max-w-xs block">{r.subject}</span> },
                      { key: "templateSlug", header: "Template", render: (r) => <span className="text-xs text-rw-muted">{r.templateSlug || "—"}</span> },
                      { key: "status", header: "Stato", render: (r) => <Chip label={r.status} tone={r.status === "sent" ? "success" : "danger"} /> },
                    ]}
                    data={emailLogs}
                    keyExtractor={(r) => r.id}
                    emptyMessage="Nessun invio registrato."
                  />
                </div>
              )}
              {logRows.length === 0 && emailLogs.length === 0 && (
                <p className="mt-4 text-center text-sm text-rw-muted">
                  Nessun invio registrato. Gli invii email verranno tracciati automaticamente qui.
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
