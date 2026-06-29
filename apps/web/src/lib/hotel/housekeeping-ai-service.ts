import type { HkDashboardKpi } from "@/lib/hotel/housekeeping-service";

export type HkAiSuggestion = {
  id: string;
  type: "priority" | "assignment" | "route" | "delay" | "inspection" | "vip" | "critical";
  title: string;
  detail: string;
  roomCodes?: string[];
  priority: "high" | "medium" | "low";
};

export type HkAiAnalysis = {
  generatedAt: string;
  suggestions: HkAiSuggestion[];
  optimalOrder: string[];
  delayRiskRooms: string[];
  inspectQueue: string[];
  summary: string;
};

type RoomBoardItem = {
  code: string;
  pmsCode: string;
  priority: number;
  estimatedCleanMin: number;
  departure: string | null;
  arrival: string | null;
  occupied: boolean;
  vipReady: boolean;
  taskStatus: string | null;
};

export function analyzeHousekeepingOps(input: {
  kpi: HkDashboardKpi;
  roomBoard: RoomBoardItem[];
}): HkAiAnalysis {
  const { kpi, roomBoard } = input;
  const suggestions: HkAiSuggestion[] = [];

  const dirtyRooms = roomBoard.filter((r) =>
    ["VD", "DIRTY", "OD", "PICKUP"].includes(r.pmsCode) || r.taskStatus === "todo",
  );
  const vipRooms = roomBoard.filter((r) => r.vipReady || r.pmsCode === "VIP_READY");
  const departures = roomBoard.filter((r) => r.departure === new Date().toISOString().slice(0, 10));
  const arrivals = roomBoard.filter((r) => r.arrival === new Date().toISOString().slice(0, 10));

  if (kpi.readyPct < 70 && kpi.arrivalsToday > 0) {
    suggestions.push({
      id: "delay-risk",
      type: "delay",
      title: "Rischio ritardo check-in",
      detail: `Solo ${kpi.readyPct}% camere pronte con ${kpi.arrivalsToday} arrivi oggi.`,
      priority: "high",
    });
  }

  if (vipRooms.length > 0) {
    suggestions.push({
      id: "vip-priority",
      type: "vip",
      title: "Camere VIP da preparare",
      detail: `${vipRooms.length} camere VIP richiedono attenzione prioritaria.`,
      roomCodes: vipRooms.map((r) => r.code),
      priority: "high",
    });
  }

  if (kpi.openTasks > kpi.activeHousekeepers * 3 && kpi.activeHousekeepers > 0) {
    suggestions.push({
      id: "staff-overload",
      type: "assignment",
      title: "Sovraccarico personale",
      detail: `${kpi.openTasks} task aperti vs ${kpi.activeHousekeepers} housekeeper attivi.`,
      priority: "high",
    });
  }

  const critical = dirtyRooms
    .filter((r) => r.priority > 0 || departures.some((d) => d.code === r.code))
    .sort((a, b) => b.priority - a.priority);

  if (critical.length > 0) {
    suggestions.push({
      id: "critical-rooms",
      type: "critical",
      title: "Camere critiche",
      detail: "Partenze e priorità alta — pulizia urgente.",
      roomCodes: critical.slice(0, 8).map((r) => r.code),
      priority: "high",
    });
  }

  const inspectQueue = roomBoard
    .filter((r) => r.pmsCode === "INSPECTED" || (r.taskStatus === "done" && r.pmsCode !== "VC"))
    .map((r) => r.code);

  if (inspectQueue.length > 0) {
    suggestions.push({
      id: "inspect-queue",
      type: "inspection",
      title: "Camere da ispezionare",
      detail: `${inspectQueue.length} camere in attesa di ispezione supervisor.`,
      roomCodes: inspectQueue,
      priority: "medium",
    });
  }

  const optimalOrder = [...dirtyRooms]
    .sort((a, b) => {
      let scoreA = a.priority * 10;
      let scoreB = b.priority * 10;
      if (departures.some((d) => d.code === a.code)) scoreA += 50;
      if (departures.some((d) => d.code === b.code)) scoreB += 50;
      if (arrivals.some((x) => x.code === a.code)) scoreA += 30;
      if (arrivals.some((x) => x.code === b.code)) scoreB += 30;
      return scoreB - scoreA;
    })
    .map((r) => r.code);

  const delayRiskRooms = dirtyRooms
    .filter((r) => arrivals.some((a) => a.code === r.code))
    .map((r) => r.code);

  return {
    generatedAt: new Date().toISOString(),
    suggestions,
    optimalOrder,
    delayRiskRooms,
    inspectQueue,
    summary: `${kpi.openTasks} task aperti, ${kpi.readyPct}% camere pronte, ${kpi.avgCleanMin} min medi pulizia.`,
  };
}
