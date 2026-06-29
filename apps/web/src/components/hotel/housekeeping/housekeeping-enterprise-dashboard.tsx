"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Calendar,
  Check,
  ClipboardCheck,
  Loader2,
  Play,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { KpiTile } from "@/components/shared/kpi-tile";
import { Modal } from "@/components/shared/modal";
import { TabBar } from "@/components/shared/tab-bar";
import { BTN_OUTLINE, KPI_GRID } from "@/components/shared/ui-classes";
import { useHotel } from "@/components/hotel/hotel-context";
import { useHousekeepingStream } from "@/components/hotel/housekeeping/use-housekeeping-stream";
import { housekeepingApi, type HkDashboard, type HkRoomBoardItem } from "@/lib/api-client";
import { useI18n } from "@/core/i18n/provider";

type Tab = "board" | "tasks" | "calendar" | "maintenance" | "analytics" | "ai";

export function HousekeepingEnterpriseDashboard() {
  const { housekeeping, refresh } = useHotel();
  const { t } = useI18n();
  const [dashboard, setDashboard] = useState<HkDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("board");
  const [selectedRoom, setSelectedRoom] = useState<HkRoomBoardItem | null>(null);
  const [maintenance, setMaintenance] = useState<Array<{ id: string; title: string; status: string; room: { code: string } }>>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dash, maint] = await Promise.all([
        housekeepingApi.dashboard(),
        housekeepingApi.listMaintenance(),
      ]);
      setDashboard(dash);
      setMaintenance(maint.tickets as typeof maintenance);
    } catch {
      /* keep partial state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useHousekeepingStream(() => {
    void load();
    void refresh();
  });

  const kpi = dashboard?.kpi;

  const floors = useMemo(() => {
    if (!dashboard) return [];
    const set = new Set(dashboard.roomBoard.map((r) => r.floor));
    return [...set].sort((a, b) => a - b);
  }, [dashboard]);

  const handleStartTask = async (room: HkRoomBoardItem) => {
    if (!room.taskId) return;
    setBusy(true);
    try {
      await housekeepingApi.updateTask(room.taskId, { action: "start" });
      await load();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteTask = async (room: HkRoomBoardItem) => {
    if (!room.taskId) return;
    setBusy(true);
    try {
      await housekeepingApi.updateTask(room.taskId, { action: "complete" });
      await load();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleInspect = async (room: HkRoomBoardItem, level: number) => {
    if (!room.taskId) return;
    setBusy(true);
    try {
      await housekeepingApi.updateTask(room.taskId, { action: "inspect", inspectionLevel: level, approved: true });
      await load();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRoomStatus = async (room: HkRoomBoardItem, code: HkRoomBoardItem["pmsCode"]) => {
    setBusy(true);
    try {
      await housekeepingApi.updateRoom(room.id, { hkPmsCode: code });
      await load();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-rw-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Caricamento dashboard housekeeping…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {kpi && (
        <div className={KPI_GRID}>
          <KpiTile label="Occupate" value={kpi.occupied} />
          <KpiTile label="Libere" value={kpi.vacant} />
          <KpiTile label="Arrivi oggi" value={kpi.arrivalsToday} tone="info" />
          <KpiTile label="Partenze oggi" value={kpi.departuresToday} tone="warn" />
          <KpiTile label="Sporche" value={kpi.dirty} tone="warn" />
          <KpiTile label="Pulite" value={kpi.clean} tone="success" />
          <KpiTile label="Ispezionate" value={kpi.inspected} />
          <KpiTile label="Pronte" value={kpi.ready} tone="success" />
          <KpiTile label="Fuori servizio" value={kpi.outOfOrder} tone="danger" />
          <KpiTile label="Bloccate" value={kpi.blocked} />
          <KpiTile label="Manutenzione" value={kpi.maintenance} tone="danger" />
          <KpiTile label="Prioritarie" value={kpi.priority} tone="warn" />
          <KpiTile label="Tempo medio" value={`${kpi.avgCleanMin}m`} />
          <KpiTile label="HK attivi" value={kpi.activeHousekeepers} />
          <KpiTile label="Task aperti" value={kpi.openTasks} tone="warn" />
          <KpiTile label="Completati" value={kpi.completedTasks} tone="success" />
          <KpiTile label="% Pronte" value={`${kpi.readyPct}%`} tone={kpi.readyPct >= 80 ? "success" : "warn"} highlight />
        </div>
      )}

      <TabBar
        tabs={[
          { id: "board", label: "Planning" },
          { id: "tasks", label: "Task" },
          { id: "calendar", label: "Calendario" },
          { id: "maintenance", label: "Manutenzione" },
          { id: "analytics", label: "Analytics" },
          { id: "ai", label: "AI" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === "board" && dashboard && (
        <div className="space-y-4">
          {floors.map((floor) => (
            <Card key={floor} title={`Piano ${floor}`} description={`${dashboard.roomBoard.filter((r) => r.floor === floor).length} camere`}>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {dashboard.roomBoard
                  .filter((r) => r.floor === floor)
                  .map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition hover:scale-[1.02]",
                        room.colorClass,
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg font-bold">{room.code}</span>
                        {room.vipReady && <span className="text-[9px] font-bold text-amber-300">VIP</span>}
                        {room.maintenance && <Wrench className="h-3.5 w-3.5" />}
                      </div>
                      <p className="mt-1 text-[10px] font-semibold uppercase">{room.pmsCode}</p>
                      <p className="text-[10px] opacity-80">{room.roomType}</p>
                      {room.guestName && <p className="mt-1 truncate text-[10px]">{room.guestName}</p>}
                      {room.departure && <p className="text-[10px] opacity-70">Out: {room.departure}</p>}
                      <p className="mt-1 text-[10px]">~{room.estimatedCleanMin} min</p>
                    </button>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "tasks" && (
        <Card title="Coda task housekeeping" description="Gestione operativa pulizie">
          <DataTable
            stickyHeader
            columns={[
              { key: "room", header: "Camera", render: (row) => row.roomId },
              { key: "assigned", header: "Assegnato", render: (row) => row.assignedTo },
              { key: "date", header: "Data", render: (row) => row.scheduledFor },
              { key: "status", header: "Stato", render: (row) => <Chip label={row.status} tone={row.status === "done" ? "success" : row.status === "in_progress" ? "info" : "warn"} /> },
              { key: "inspect", header: "Ispezione", render: (row) => row.inspected ? "OK" : "Pending" },
            ]}
            data={housekeeping}
            keyExtractor={(r) => r.id}
          />
        </Card>
      )}

      {tab === "calendar" && dashboard && (
        <Card title="Calendario operativo — Oggi" description="Timeline arrivi/partenze e task">
          <ul className="space-y-2">
            {dashboard.roomBoard
              .filter((r) => r.arrival || r.departure || r.taskStatus)
              .map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm">
                  <Calendar className="h-4 w-4 text-rw-accent" />
                  <span className="font-semibold">{r.code}</span>
                  {r.arrival && <span className="text-xs text-emerald-400">Arrivo {r.arrival}</span>}
                  {r.departure && <span className="text-xs text-amber-400">Partenza {r.departure}</span>}
                  {r.taskStatus && <Chip label={r.taskStatus} tone="info" />}
                </li>
              ))}
          </ul>
        </Card>
      )}

      {tab === "maintenance" && (
        <Card title="Ticket manutenzione" description="Guasti e interventi tecnici">
          {maintenance.length === 0 ? (
            <p className="py-4 text-sm text-rw-muted">Nessun ticket aperto.</p>
          ) : (
            <ul className="space-y-2">
              {maintenance.map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-rw-ink">{ticket.title}</p>
                    <p className="text-xs text-rw-muted">Camera {ticket.room.code} · {ticket.status}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void housekeepingApi.updateMaintenance(ticket.id, { status: "resolved" }).then(load)}
                    className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-400"
                  >
                    Risolvi
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "analytics" && kpi && (
        <Card title="Analytics housekeeping">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile label="Produttività" value={`${kpi.completedTasks} task`} />
            <KpiTile label="Tempo medio pulizia" value={`${kpi.avgCleanMin} min`} />
            <KpiTile label="Ritardi stimati" value={String(dashboard?.ai.delayRiskRooms.length ?? 0)} tone="warn" />
            <KpiTile label="Qualità (% pronte)" value={`${kpi.readyPct}%`} tone="success" />
          </div>
        </Card>
      )}

      {tab === "ai" && dashboard?.ai && (
        <Card title="AI Housekeeping Assistant">
          <p className="mb-3 text-sm text-rw-soft">{dashboard.ai.summary}</p>
          {dashboard.ai.suggestions.map((s) => (
            <div key={s.id} className="mb-2 rounded-xl border border-rw-accent/20 bg-rw-accent/5 px-3 py-2 text-sm">
              <p className="flex items-center gap-2 font-semibold text-rw-ink">
                <Sparkles className="h-4 w-4 text-rw-accent" /> {s.title}
              </p>
              <p className="text-xs text-rw-muted">{s.detail}</p>
              {s.roomCodes && <p className="mt-1 text-xs text-rw-soft">Camere: {s.roomCodes.join(", ")}</p>}
            </div>
          ))}
          {dashboard.ai.optimalOrder.length > 0 && (
            <div className="mt-3 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-xs">
              <p className="font-semibold text-rw-ink">Ordine ottimale pulizie</p>
              <p className="text-rw-muted">{dashboard.ai.optimalOrder.join(" → ")}</p>
            </div>
          )}
        </Card>
      )}

      <Modal
        open={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom ? `Camera ${selectedRoom.code}` : ""}
        subtitle={selectedRoom ? `${selectedRoom.pmsLabel} · Piano ${selectedRoom.floor}` : undefined}
      >
        {selectedRoom && (
          <>
            {selectedRoom.guestName && <p className="mb-3 text-sm text-rw-soft">Ospite: {selectedRoom.guestName}</p>}
            <div className="flex flex-wrap gap-2">
              {selectedRoom.taskId && selectedRoom.taskStatus === "todo" && (
                <ActionBtn icon={Play} label="Inizia" onClick={() => void handleStartTask(selectedRoom)} disabled={busy} />
              )}
              {selectedRoom.taskId && selectedRoom.taskStatus === "in_progress" && (
                <ActionBtn icon={Check} label="Completa" onClick={() => void handleCompleteTask(selectedRoom)} disabled={busy} />
              )}
              {selectedRoom.taskId && (
                <ActionBtn icon={ClipboardCheck} label="Ispezione" onClick={() => void handleInspect(selectedRoom, 2)} disabled={busy} />
              )}
              <ActionBtn icon={BedDouble} label="VC" onClick={() => void handleRoomStatus(selectedRoom, "VC")} disabled={busy} />
              <ActionBtn icon={AlertTriangle} label="OOO" onClick={() => void handleRoomStatus(selectedRoom, "OOO")} disabled={busy} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function ActionBtn({ label, icon: Icon, onClick, disabled }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn(BTN_OUTLINE, "px-3 py-2 text-sm")}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
