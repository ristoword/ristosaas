"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Loader2,
  Monitor,
  Plus,
  Printer,
  Route,
  Trash2,
  Usb,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";
import { Chip } from "@/components/shared/chip";
import {
  hardwareApi,
  type HardwareDepartment,
  type HardwareDevice,
  type HardwareDeviceConnection,
  type HardwareDeviceStatus,
  type HardwareDeviceType,
  type PrintRouteEvent,
  type PrintRouteRecord,
} from "@/lib/api-client";

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98] disabled:opacity-50";

const tabs = [
  { id: "dispositivi", label: "Dispositivi" },
  { id: "rotte", label: "Rotte stampa" },
];

const DEVICE_TYPE_LABELS: Record<HardwareDeviceType, string> = {
  stampante_termica: "Stampante termica",
  stampante_fiscale: "Stampante fiscale",
  display_kds: "Display KDS",
  lettore_keycard: "Lettore keycard",
  cassetto_denaro: "Cassetto denaro",
  altro: "Altro",
};

const DEPARTMENT_LABELS: Record<HardwareDepartment, string> = {
  cucina: "Cucina",
  pizzeria: "Pizzeria",
  bar: "Bar",
  cassa: "Cassa",
  sala: "Sala",
  reception: "Reception",
  housekeeping: "Housekeeping",
  magazzino: "Magazzino",
  altro: "Altro",
};

const CONNECTION_LABELS: Record<HardwareDeviceConnection, string> = {
  tcp_ip: "TCP/IP",
  usb: "USB",
  bluetooth: "Bluetooth",
  hdmi: "HDMI",
  altro: "Altro",
};

const STATUS_LABELS: Record<HardwareDeviceStatus, string> = {
  online: "Online",
  offline: "Offline",
  manutenzione: "Manutenzione",
};

const PRINT_EVENT_LABELS: Record<PrintRouteEvent, string> = {
  nuova_comanda: "Nuova comanda",
  ordine_bevande: "Ordine bevande",
  chiusura_conto: "Chiusura conto",
  preconto: "Preconto",
  nota_cucina: "Nota cucina",
  keycard_emessa: "Keycard emessa",
};

function DeviceIcon({ type, status }: { type: HardwareDeviceType; status: HardwareDeviceStatus }) {
  const Icon =
    type === "display_kds"
      ? Monitor
      : type === "lettore_keycard"
      ? KeyRound
      : type === "cassetto_denaro"
      ? Wrench
      : Printer;
  const tone =
    status === "online"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "manutenzione"
      ? "bg-amber-500/15 text-amber-400"
      : "bg-red-500/15 text-red-400";
  return (
    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone)}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function ConnectionIcon({ connection }: { connection: HardwareDeviceConnection }) {
  if (connection === "tcp_ip") return <Wifi className="h-3.5 w-3.5 text-rw-muted" />;
  if (connection === "usb") return <Usb className="h-3.5 w-3.5 text-rw-muted" />;
  if (connection === "bluetooth") return <Wifi className="h-3.5 w-3.5 text-rw-muted" />;
  return <Wifi className="h-3.5 w-3.5 text-rw-muted" />;
}

function DevicesPanel({
  devices,
  loading,
  onReload,
}: {
  devices: HardwareDevice[];
  loading: boolean;
  onReload: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<HardwareDeviceType>("stampante_termica");
  const [department, setDepartment] = useState<HardwareDepartment>("cucina");
  const [connection, setConnection] = useState<HardwareDeviceConnection>("tcp_ip");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<HardwareDeviceStatus>("offline");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await hardwareApi.createDevice({
        name: name.trim(),
        type,
        department,
        connection,
        ipAddress: ip.trim() || null,
        port: port.trim() ? Number.parseInt(port, 10) || null : null,
        status,
        notes: notes.trim(),
      });
      setName("");
      setIp("");
      setPort("");
      setNotes("");
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore creazione dispositivo");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusToggle(device: HardwareDevice, next: HardwareDeviceStatus) {
    try {
      await hardwareApi.updateDevice(device.id, { status: next });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore aggiornamento stato");
    }
  }

  async function handleDelete(device: HardwareDevice) {
    if (!window.confirm(`Eliminare "${device.name}"?`)) return;
    try {
      await hardwareApi.deleteDevice(device.id);
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore eliminazione");
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Aggiungi dispositivo" headerRight={<Plus className="h-4 w-4 text-rw-accent" />}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleAdd}>
          <div>
            <label className={labelCls}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Stampante Cucina"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as HardwareDeviceType)}
              className={inputCls}
            >
              {(Object.keys(DEVICE_TYPE_LABELS) as HardwareDeviceType[]).map((t) => (
                <option key={t} value={t}>
                  {DEVICE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reparto</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as HardwareDepartment)}
              className={inputCls}
            >
              {(Object.keys(DEPARTMENT_LABELS) as HardwareDepartment[]).map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tipo connessione</label>
            <select
              value={connection}
              onChange={(e) => setConnection(e.target.value as HardwareDeviceConnection)}
              className={inputCls}
            >
              {(Object.keys(CONNECTION_LABELS) as HardwareDeviceConnection[]).map((c) => (
                <option key={c} value={c}>
                  {CONNECTION_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Indirizzo IP</label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.xxx"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Porta</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="9100"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Stato iniziale</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as HardwareDeviceStatus)}
              className={inputCls}
            >
              {(Object.keys(STATUS_LABELS) as HardwareDeviceStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Modello, posizione..."
              className={inputCls}
            />
          </div>
          {error ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className={btnPrimary} disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Aggiungi dispositivo
            </button>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento dispositivi…
        </div>
      ) : devices.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rw-line px-6 py-8 text-center text-sm text-rw-muted">
          Nessun dispositivo configurato. Aggiungine uno per iniziare.
        </p>
      ) : (
        <div className="space-y-3">
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-rw-line bg-rw-surface p-4 transition hover:border-rw-accent/25"
            >
              <DeviceIcon type={d.type} status={d.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-rw-ink">{d.name}</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      d.status === "online"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : d.status === "manutenzione"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-red-500/15 text-red-400",
                    )}
                  >
                    {d.status === "online" ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    {STATUS_LABELS[d.status]}
                  </span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-rw-soft">
                  <span>{DEVICE_TYPE_LABELS[d.type]}</span>
                  <span aria-hidden>·</span>
                  <span>{DEPARTMENT_LABELS[d.department]}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <ConnectionIcon connection={d.connection} />
                    {CONNECTION_LABELS[d.connection]}
                  </span>
                  {d.ipAddress ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="font-mono">
                        {d.ipAddress}
                        {d.port ? `:${d.port}` : ""}
                      </span>
                    </>
                  ) : null}
                </p>
                {d.notes ? <p className="mt-1 text-xs text-rw-muted">{d.notes}</p> : null}
              </div>
              <select
                value={d.status}
                onChange={(e) => handleStatusToggle(d, e.target.value as HardwareDeviceStatus)}
                className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-xs text-rw-ink"
                title="Cambia stato"
              >
                {(Object.keys(STATUS_LABELS) as HardwareDeviceStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleDelete(d)}
                className="shrink-0 rounded-lg p-1.5 text-rw-muted hover:bg-red-500/10 hover:text-red-400"
                title="Elimina"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoutesPanel({
  devices,
  routes,
  loading,
  onReload,
}: {
  devices: HardwareDevice[];
  routes: PrintRouteRecord[];
  loading: boolean;
  onReload: () => Promise<void>;
}) {
  const [event, setEvent] = useState<PrintRouteEvent>("nuova_comanda");
  const [department, setDepartment] = useState<HardwareDepartment>("cucina");
  const [deviceId, setDeviceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId && devices.length > 0) setDeviceId(devices[0].id);
  }, [devices, deviceId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId) {
      setError("Seleziona un dispositivo");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await hardwareApi.createRoute({ event, department, deviceId });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore creazione rotta");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(route: PrintRouteRecord) {
    if (!window.confirm("Eliminare questa rotta?")) return;
    try {
      await hardwareApi.deleteRoute(route.id);
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore eliminazione rotta");
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Aggiungi rotta" headerRight={<Route className="h-4 w-4 text-rw-accent" />} description="Collega un evento (nuova comanda, chiusura conto, preconto...) a un dispositivo di stampa per reparto.">
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleAdd}>
          <div>
            <label className={labelCls}>Evento</label>
            <select
              value={event}
              onChange={(e) => setEvent(e.target.value as PrintRouteEvent)}
              className={inputCls}
            >
              {(Object.keys(PRINT_EVENT_LABELS) as PrintRouteEvent[]).map((ev) => (
                <option key={ev} value={ev}>
                  {PRINT_EVENT_LABELS[ev]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reparto</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as HardwareDepartment)}
              className={inputCls}
            >
              {(Object.keys(DEPARTMENT_LABELS) as HardwareDepartment[]).map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Dispositivo</label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className={inputCls}
              required
            >
              {devices.length === 0 ? <option value="">— Nessun dispositivo —</option> : null}
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({DEPARTMENT_LABELS[d.department]})
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <div className="sm:col-span-3">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          ) : null}
          <div className="sm:col-span-3">
            <button
              type="submit"
              className={btnPrimary}
              disabled={busy || devices.length === 0}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Aggiungi rotta
            </button>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento rotte…
        </div>
      ) : routes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rw-line px-6 py-8 text-center text-sm text-rw-muted">
          Nessuna rotta configurata. Configura almeno una rotta per ogni evento che vuoi stampare.
        </p>
      ) : (
        <DataTable<PrintRouteRecord>
          columns={[
            {
              key: "event",
              header: "Evento",
              render: (r) => <span className="font-semibold text-rw-ink">{PRINT_EVENT_LABELS[r.event]}</span>,
            },
            {
              key: "department",
              header: "Reparto",
              render: (r) => DEPARTMENT_LABELS[r.department],
            },
            {
              key: "device",
              header: "Dispositivo",
              render: (r) => (
                <span className="inline-flex items-center gap-1.5">
                  <Printer className="h-3.5 w-3.5 text-rw-muted" />
                  {r.deviceName ?? "—"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                >
                  Elimina
                </button>
              ),
            },
          ]}
          data={routes}
          keyExtractor={(r) => r.id}
        />
      )}
    </div>
  );
}

export function HardwarePage() {
  const [activeTab, setActiveTab] = useState("dispositivi");
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [routes, setRoutes] = useState<PrintRouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devs, rts] = await Promise.all([
        hardwareApi.listDevices(),
        hardwareApi.listRoutes(),
      ]);
      setDevices(devs);
      setRoutes(rts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onlineCount = useMemo(() => devices.filter((d) => d.status === "online").length, [devices]);

  return (
    <div className="space-y-6">
      <PageHeader title="Hardware" subtitle="Configurazione stampanti, display KDS e rotte di stampa per tenant">
        <div className="flex items-center gap-2">
          {onlineCount > 0 ? (
            <Wifi className="h-4 w-4 text-emerald-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-rw-muted" />
          )}
          <span className="text-sm text-rw-soft">
            {onlineCount}/{devices.length} online
          </span>
          <Chip label="Rotte" value={routes.length} tone="default" />
        </div>
      </PageHeader>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === "dispositivi" ? (
          <DevicesPanel devices={devices} loading={loading} onReload={load} />
        ) : (
          <RoutesPanel devices={devices} routes={routes} loading={loading} onReload={load} />
        )}
      </div>
    </div>
  );
}
