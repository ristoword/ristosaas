"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save, Shield, Wifi } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { complianceApi, type ComplianceConfigDto } from "@/lib/api-client";

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 disabled:opacity-60";

const EMPTY: ComplianceConfigDto = {
  alloggiatiEnabled: false,
  alloggiatiUsername: "",
  alloggiatiPassword: "",
  alloggiatiWsKey: "",
  alloggiatiApartmentId: "",
  fiscalEnabled: false,
  fiscalVatNumber: "",
  fiscalBusinessName: "",
  fiscalPec: "",
  fiscalSdiRecipientCode: "0000000",
  fiscalRegimeFiscale: "RF01",
  lockEnabled: false,
  lockVendor: "generic",
  lockBridgeUrl: "",
  lockBridgeApiKey: "",
  autoPrintOrders: true,
  autoPrintBillClose: true,
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-rw-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

export function ComplianceIntegrationsPage() {
  const [config, setConfig] = useState<ComplianceConfigDto>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    complianceApi
      .get()
      .then(setConfig)
      .catch((e) => setError(e instanceof Error ? e.message : "Errore caricamento"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await complianceApi.update(config);
      setConfig(saved);
      setMessage("Configurazione salvata.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestAlloggiati() {
    setTesting(true);
    setError(null);
    setMessage(null);
    try {
      await complianceApi.update(config);
      const result = await complianceApi.testAlloggiati();
      setMessage(`Connessione Alloggiati OK — token ${result.tokenPreview ?? ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test fallito");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrazioni compliance"
        subtitle="Alloggiati Web, fatturazione elettronica SDI, bridge serrature e stampa automatica."
      />

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {message}
        </p>
      ) : null}

      <form onSubmit={handleSave} className="space-y-6">
        <Card
          title="Alloggiati Web (Questura)"
          description="Trasmissione schedine ospiti — credenziali del portale Polizia di Stato."
          headerRight={<Shield className="h-4 w-4 text-rw-muted" />}
        >
          <div className="mb-4">
            <Toggle
              checked={config.alloggiatiEnabled}
              onChange={(v) => setConfig((p) => ({ ...p, alloggiatiEnabled: v }))}
              label="Abilita trasmissione reale ad Alloggiati Web"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Username</label>
              <input className={inputCls} value={config.alloggiatiUsername} onChange={(e) => setConfig((p) => ({ ...p, alloggiatiUsername: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" className={inputCls} value={config.alloggiatiPassword} onChange={(e) => setConfig((p) => ({ ...p, alloggiatiPassword: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>WsKey</label>
              <input className={inputCls} value={config.alloggiatiWsKey} onChange={(e) => setConfig((p) => ({ ...p, alloggiatiWsKey: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>ID Appartamento</label>
              <input className={inputCls} value={config.alloggiatiApartmentId} onChange={(e) => setConfig((p) => ({ ...p, alloggiatiApartmentId: e.target.value }))} />
            </div>
          </div>
          <button type="button" onClick={() => void handleTestAlloggiati()} disabled={testing} className={`${btnPrimary} mt-4`}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Test connessione Alloggiati
          </button>
        </Card>

        <Card title="Fatturazione elettronica (FatturaPA + SDI)" description="Generazione XML e invio al Sistema di Interscambio.">
          <div className="mb-4">
            <Toggle
              checked={config.fiscalEnabled}
              onChange={(v) => setConfig((p) => ({ ...p, fiscalEnabled: v }))}
              label="Abilita fatturazione elettronica in chiusura cassa"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Partita IVA</label>
              <input className={inputCls} value={config.fiscalVatNumber} onChange={(e) => setConfig((p) => ({ ...p, fiscalVatNumber: e.target.value }))} placeholder="12345678901" />
            </div>
            <div>
              <label className={labelCls}>Ragione sociale</label>
              <input className={inputCls} value={config.fiscalBusinessName} onChange={(e) => setConfig((p) => ({ ...p, fiscalBusinessName: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>PEC</label>
              <input className={inputCls} value={config.fiscalPec} onChange={(e) => setConfig((p) => ({ ...p, fiscalPec: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Codice destinatario SDI</label>
              <input className={inputCls} value={config.fiscalSdiRecipientCode} onChange={(e) => setConfig((p) => ({ ...p, fiscalSdiRecipientCode: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Regime fiscale</label>
              <input className={inputCls} value={config.fiscalRegimeFiscale} onChange={(e) => setConfig((p) => ({ ...p, fiscalRegimeFiscale: e.target.value }))} />
            </div>
          </div>
        </Card>

        <Card title="Bridge serrature" description="Endpoint HTTP REST per encode/revoke (Salto, VingCard, bridge custom).">
          <div className="mb-4">
            <Toggle
              checked={config.lockEnabled}
              onChange={(v) => setConfig((p) => ({ ...p, lockEnabled: v }))}
              label="Abilita codifica keycard al check-in"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Vendor</label>
              <input className={inputCls} value={config.lockVendor} onChange={(e) => setConfig((p) => ({ ...p, lockVendor: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Bridge URL</label>
              <input className={inputCls} value={config.lockBridgeUrl} onChange={(e) => setConfig((p) => ({ ...p, lockBridgeUrl: e.target.value }))} placeholder="https://lock-bridge.example/encode" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>API Key</label>
              <input type="password" className={inputCls} value={config.lockBridgeApiKey} onChange={(e) => setConfig((p) => ({ ...p, lockBridgeApiKey: e.target.value }))} />
            </div>
          </div>
        </Card>

        <Card title="Stampa automatica" description="Richiede rotte hardware configurate in Hardware → Rotte stampa.">
          <div className="flex flex-wrap gap-6">
            <Toggle
              checked={config.autoPrintOrders}
              onChange={(v) => setConfig((p) => ({ ...p, autoPrintOrders: v }))}
              label="Stampa comande alla creazione ordine"
            />
            <Toggle
              checked={config.autoPrintBillClose}
              onChange={(v) => setConfig((p) => ({ ...p, autoPrintBillClose: v }))}
              label="Stampa ricevuta in chiusura conto"
            />
          </div>
        </Card>

        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salva configurazione
        </button>
      </form>
    </div>
  );
}
