"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useAuth } from "@/components/auth/auth-context";
import { api, type AdminEmailConfig, type InboundEmailMessageRow } from "@/lib/api-client";

const CONFIG_ROLES = new Set(["owner", "supervisor", "super_admin"]);
const SYNC_ROLES = new Set(["owner", "supervisor", "super_admin", "sala", "reception"]);

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";

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

function bindConfig(cfg: AdminEmailConfig | null): EmailDraft {
  if (!cfg) return EMPTY;
  return {
    host: cfg.host || "smtps.aruba.it",
    port: cfg.port || 465,
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

export function bookingMailboxAddress(cfg: AdminEmailConfig | null): string {
  if (!cfg) return "";
  const from = cfg.fromAddress.trim();
  const wrapped = from.match(/<([^>]+)>/);
  if (wrapped?.[1]) return wrapped[1].trim().toLowerCase();
  if (from.includes("@")) return from.toLowerCase();
  return cfg.username.trim().toLowerCase();
}

function exampleBookingText(email: string): string {
  return `Oggetto: Prenotazione tavolo

Buongiorno,
vorrei prenotare un tavolo per 4 persone sabato alle 20:30.
Nome: Mario Rossi
Telefono: +39 333 1234567
Email: mario@esempio.it

Grazie!`;
}

type Props = {
  onBookingsChanged?: () => void | Promise<void>;
};

export function BookingEmailPanel({ onBookingsChanged }: Props) {
  const { user } = useAuth();
  const canConfigure = user?.role ? CONFIG_ROLES.has(user.role) : false;
  const canSync = user?.role ? SYNC_ROLES.has(user.role) : false;

  const [config, setConfig] = useState<AdminEmailConfig | null>(null);
  const [draft, setDraft] = useState<EmailDraft>(EMPTY);
  const [messages, setMessages] = useState<InboundEmailMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [copied, setCopied] = useState<"email" | "example" | null>(null);

  const mailbox = useMemo(() => bookingMailboxAddress(config), [config]);
  const bookingEmails = useMemo(
    () =>
      messages.filter(
        (m) => m.parsedType === "booking" || m.status === "pending" || m.linkedBookingId,
      ),
    [messages],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, inbox] = await Promise.all([
        api.tenantEmailConfig.get(),
        api.emailInbox.list({ limit: 40 }),
      ]);
      setConfig(cfg);
      setDraft(bindConfig(cfg));
      setMessages(inbox);
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Errore caricamento email" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyText(kind: "email" | "example", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setToast({ kind: "err", message: "Copia non riuscita" });
    }
  }

  async function handleSave() {
    setBusy("save");
    setToast(null);
    try {
      const from = draft.fromAddress.trim();
      const wrapped = from.match(/<([^>]+)>/);
      const email = (wrapped?.[1] ?? from).trim().toLowerCase();
      const payload = {
        ...draft,
        fromAddress: from || email,
        username: draft.username.trim() || email,
      };
      const saved = await api.tenantEmailConfig.save(payload);
      setConfig(saved);
      setDraft((d) => ({ ...d, password: "" }));
      setToast({ kind: "ok", message: "Casella prenotazioni salvata." });
      setConfigOpen(false);
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Salvataggio fallito" });
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
        message: `Sincronizzate ${res.fetched} email, ${res.processed} prenotazioni create.`,
      });
      await load();
      if (res.processed > 0) await onBookingsChanged?.();
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
      if (res.status === "processed" && res.parsedType === "booking") {
        setToast({ kind: "ok", message: "Prenotazione creata da email." });
        await onBookingsChanged?.();
      } else if (res.status === "processed") {
        setToast({ kind: "ok", message: "Email elaborata." });
      } else {
        setToast({ kind: "err", message: res.errorMessage || "Elaborazione non riuscita" });
      }
      await load();
    } catch (e) {
      setToast({ kind: "err", message: e instanceof Error ? e.message : "Errore elaborazione" });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <Card title="Prenotazioni via email" description="Caricamento casella…">
        <div className="flex items-center gap-2 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Attendere…
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Prenotazioni via email"
      description="I clienti scrivono alla tua casella; le richieste diventano prenotazioni."
      headerRight={<Mail className="h-4 w-4 text-rw-accent" />}
    >
      <div className="space-y-4">
        {toast ? (
          <div
            className={cn(
              "rounded-xl border px-3 py-2 text-xs",
              toast.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300",
            )}
          >
            {toast.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Chip
            label="IMAP"
            value={config?.imapEnabled ? "Attivo" : "Non attivo"}
            tone={config?.imapEnabled ? "success" : "warn"}
          />
          {config?.imapLastSyncAt ? (
            <Chip
              label="Ultima sync"
              value={new Date(config.imapLastSyncAt).toLocaleString("it-IT", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
              tone="info"
            />
          ) : null}
        </div>

        {mailbox ? (
          <div className="rounded-xl border border-rw-accent/25 bg-rw-accent/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-rw-muted">Casella per le prenotazioni</p>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`mailto:${mailbox}`} className="text-sm font-semibold text-rw-accent break-all">
                {mailbox}
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-rw-line px-2 py-1 text-[11px] font-semibold text-rw-soft hover:text-rw-ink"
                onClick={() => void copyText("email", mailbox)}
              >
                {copied === "email" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === "email" ? "Copiata" : "Copia"}
              </button>
            </div>
            <p className="text-xs text-rw-muted">
              Comunica questo indirizzo ai clienti o sul sito. Le email con data, ora e coperti vengono lette
              automaticamente ogni 10 minuti.
            </p>
          </div>
        ) : (
          <p className="text-sm text-amber-300">
            {canConfigure
              ? "Configura la casella email del locale per ricevere prenotazioni."
              : "La casella email non è ancora configurata. Chiedi all'owner di impostarla."}
          </p>
        )}

        <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-rw-muted">Testo da inviare ai clienti</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rw-accent"
              onClick={() => void copyText("example", exampleBookingText(mailbox || "prenotazioni@tuoristorante.it"))}
            >
              {copied === "example" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied === "example" ? "Copiato" : "Copia esempio"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-rw-soft font-sans">
            {exampleBookingText(mailbox || "prenotazioni@tuoristorante.it")}
          </pre>
        </div>

        {canConfigure ? (
          <div className="rounded-xl border border-rw-line">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-rw-ink"
              onClick={() => setConfigOpen((v) => !v)}
            >
              <span>Configura casella email</span>
              {configOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {configOpen ? (
              <div className="space-y-3 border-t border-rw-line px-3 py-3">
                <div>
                  <label className={labelCls}>Email prenotazioni (mittente / casella)</label>
                  <input
                    className={inputCls}
                    placeholder="prenotazioni@tuoristorante.it"
                    value={draft.fromAddress}
                    onChange={(e) => setDraft((d) => ({ ...d, fromAddress: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Utente (se diverso dall&apos;indirizzo)</label>
                  <input
                    className={inputCls}
                    placeholder="stesso indirizzo email"
                    value={draft.username}
                    onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Password casella</label>
                  <input
                    className={inputCls}
                    type="password"
                    placeholder={config ? "Lascia vuoto per non cambiare" : "Password"}
                    value={draft.password}
                    onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-rw-soft">
                  <input
                    type="checkbox"
                    checked={draft.imapEnabled}
                    onChange={(e) => setDraft((d) => ({ ...d, imapEnabled: e.target.checked }))}
                  />
                  Ricevi prenotazioni via email (IMAP)
                </label>
                {draft.imapEnabled ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Host IMAP</label>
                      <input
                        className={inputCls}
                        value={draft.imapHost}
                        onChange={(e) => setDraft((d) => ({ ...d, imapHost: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Porta</label>
                      <input
                        className={inputCls}
                        type="number"
                        value={draft.imapPort}
                        onChange={(e) => setDraft((d) => ({ ...d, imapPort: Number(e.target.value) || 993 }))}
                      />
                    </div>
                  </div>
                ) : null}
                <p className="text-[11px] text-rw-muted">
                  Aruba: SMTP <code>smtps.aruba.it:465</code> · IMAP <code>imaps.aruba.it:993</code>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    onClick={() => void handleSave()}
                    disabled={!!busy}
                  >
                    {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Salva
                  </button>
                  {draft.imapEnabled ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-xs font-semibold text-rw-ink disabled:opacity-60"
                      onClick={() => void handleTestImap()}
                      disabled={!!busy}
                    >
                      {busy === "imap" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Server className="h-3.5 w-3.5" />}
                      Test IMAP
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {canSync ? (
          <div className="space-y-2">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm font-semibold text-rw-ink disabled:opacity-60"
              onClick={() => void handlePoll()}
              disabled={!!busy || !config?.imapEnabled}
            >
              {busy === "poll" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizza email ora
            </button>
            {!config?.imapEnabled ? (
              <p className="text-xs text-rw-muted">Abilita IMAP nella configurazione per ricevere le email.</p>
            ) : null}
          </div>
        ) : null}

        {bookingEmails.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-rw-muted">Email prenotazioni recenti</p>
            {bookingEmails.slice(0, 5).map((row) => (
              <div key={row.id} className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-rw-ink truncate">{row.fromName || row.fromEmail}</p>
                    <p className="text-rw-muted truncate">{row.subject || "Senza oggetto"}</p>
                    <p className="text-[10px] text-rw-muted mt-0.5">
                      {new Date(row.receivedAt).toLocaleString("it-IT")} · {row.status}
                    </p>
                  </div>
                  {row.status === "pending" || row.status === "failed" ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-md border border-rw-line px-2 py-1 font-semibold text-rw-ink disabled:opacity-50"
                      disabled={!!busy}
                      onClick={() => void handleProcess(row.id)}
                    >
                      {busy === `process-${row.id}` ? "…" : "Crea"}
                    </button>
                  ) : row.linkedBookingId ? (
                    <span className="shrink-0 text-emerald-400 font-semibold">OK</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : config?.imapEnabled ? (
          <p className="text-xs text-rw-muted">Nessuna email prenotazione in coda.</p>
        ) : null}
      </div>
    </Card>
  );
}
