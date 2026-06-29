import type { HousekeepingPmsCode, HousekeepingPriority, HousekeepingTaskType, HotelRoomStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { emitHousekeepingEvent } from "@/lib/hotel/housekeeping-event-bus";

export type HkActor = {
  userId?: string;
  userName?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  device?: string;
};

export const PMS_CODE_LABELS: Record<HousekeepingPmsCode, string> = {
  VC: "Vacant Clean",
  VD: "Vacant Dirty",
  OC: "Occupied Clean",
  OD: "Occupied Dirty",
  INSPECTED: "Inspected",
  CLEAN: "Clean",
  DIRTY: "Dirty",
  PICKUP: "Pickup",
  TOUCHED: "Touched",
  OOO: "Out of Order",
  OOS: "Out of Service",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked",
  VIP_READY: "VIP Ready",
  DND: "Do Not Disturb",
  LATE_CO: "Late Checkout",
  EARLY_ARR: "Early Arrival",
};

export const PMS_CODE_COLORS: Record<HousekeepingPmsCode, string> = {
  VC: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  VD: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  OC: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  OD: "bg-orange-500/20 border-orange-500/40 text-orange-300",
  INSPECTED: "bg-teal-500/20 border-teal-500/40 text-teal-300",
  CLEAN: "bg-green-500/20 border-green-500/40 text-green-300",
  DIRTY: "bg-red-500/20 border-red-500/40 text-red-300",
  PICKUP: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300",
  TOUCHED: "bg-slate-500/20 border-slate-500/40 text-slate-300",
  OOO: "bg-red-700/20 border-red-700/40 text-red-400",
  OOS: "bg-red-900/20 border-red-900/40 text-red-500",
  MAINTENANCE: "bg-purple-500/20 border-purple-500/40 text-purple-300",
  BLOCKED: "bg-neutral-600/20 border-neutral-600/40 text-neutral-300",
  VIP_READY: "bg-amber-400/20 border-amber-400/50 text-amber-200",
  DND: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300",
  LATE_CO: "bg-pink-500/20 border-pink-500/40 text-pink-300",
  EARLY_ARR: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
};

export function derivePmsCode(input: {
  status: HotelRoomStatus;
  hkPmsCode?: HousekeepingPmsCode | null;
  doNotDisturb?: boolean;
  vipReady?: boolean;
  isBlocked?: boolean;
  lateCheckout?: boolean;
  earlyCheckin?: boolean;
}): HousekeepingPmsCode {
  if (input.hkPmsCode) return input.hkPmsCode;
  if (input.isBlocked) return "BLOCKED";
  if (input.doNotDisturb) return "DND";
  if (input.vipReady) return "VIP_READY";
  if (input.lateCheckout) return "LATE_CO";
  if (input.earlyCheckin) return "EARLY_ARR";
  switch (input.status) {
    case "da_pulire":
      return "VD";
    case "pulita":
      return "CLEAN";
    case "libera":
      return "VC";
    case "occupata":
      return "OC";
    case "fuori_servizio":
      return "OOO";
    case "manutenzione":
      return "MAINTENANCE";
    default:
      return "VC";
  }
}

export function legacyStatusFromPms(code: HousekeepingPmsCode): HotelRoomStatus {
  switch (code) {
    case "VD":
    case "DIRTY":
    case "PICKUP":
    case "TOUCHED":
      return "da_pulire";
    case "CLEAN":
    case "INSPECTED":
    case "VC":
    case "VIP_READY":
      return "pulita";
    case "OC":
    case "OD":
    case "DND":
    case "LATE_CO":
    case "EARLY_ARR":
      return "occupata";
    case "OOO":
    case "OOS":
    case "BLOCKED":
      return "fuori_servizio";
    case "MAINTENANCE":
      return "manutenzione";
    default:
      return "libera";
  }
}

export const DEFAULT_CHECKLIST_ITEMS: Record<string, string[]> = {
  standard: [
    "Cambiare lenzuola",
    "Pulire bagno",
    "Aspirare pavimento",
    "Rifornire amenities",
    "Controllo minibar",
    "Pulire superfici",
  ],
  suite: [
    "Cambiare lenzuola king",
    "Pulire bagno e vasca",
    "Salotto e area living",
    "Minibar e snack",
    "Controllo terrazzo",
    "Amenities premium",
  ],
  family: [
    "Lenzuola adulti e bambini",
    "Bagno principale",
    "Area gioco bambini",
    "Lettino/culla se richiesto",
    "Pavimenti e tappeti",
  ],
  apartment: [
    "Cucina e elettrodomestici",
    "Bagno completo",
    "Camera da letto",
    "Soggiorno",
    "Rifiuti e riciclo",
  ],
  deep: [
    "Pulizia profonda bagno",
    "Disinfestazione superfici",
    "Lavaggio tende",
    "Pulizia sotto letto",
    "Sanificazione contatti",
  ],
  vip: [
    "Setup welcome VIP",
    "Amenities premium",
    "Controllo qualità supervisor",
    "Fiori/accoglienza",
    "Minibar premium",
  ],
};

export async function writeHkAudit(
  params: {
    tenantId: string;
    roomId?: string;
    taskId?: string;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    actor?: HkActor;
  },
  tx: Prisma.TransactionClient = prisma,
) {
  await tx.housekeepingAuditLog.create({
    data: {
      tenantId: params.tenantId,
      roomId: params.roomId ?? null,
      taskId: params.taskId ?? null,
      action: params.action,
      field: params.field ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      userId: params.actor?.userId ?? null,
      userName: params.actor?.userName ?? null,
      userRole: params.actor?.userRole ?? null,
      ip: params.actor?.ip ?? null,
      userAgent: params.actor?.userAgent ?? null,
      device: params.actor?.device ?? null,
    },
  });
}

export function actorFromRequest(
  user: { id?: string; username?: string; name?: string; role?: string } | null | undefined,
  headers: Headers,
): HkActor {
  return {
    userId: user?.id,
    userName: user?.username || user?.name || "operator",
    userRole: user?.role,
    ip: headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || undefined,
    userAgent: headers.get("user-agent") || undefined,
    device: headers.get("sec-ch-ua-platform") || undefined,
  };
}

export async function ensureDefaultChecklists(tenantId: string) {
  const count = await prisma.housekeepingChecklistTemplate.count({ where: { tenantId } });
  if (count > 0) return;

  const templates: Array<{ name: string; roomType: string; taskType: HousekeepingTaskType; key: string }> = [
    { name: "Camera Standard — Cambio ospite", roomType: "standard", taskType: "departure", key: "standard" },
    { name: "Suite — Cambio ospite", roomType: "suite", taskType: "departure", key: "suite" },
    { name: "Family Room — Cambio ospite", roomType: "family", taskType: "departure", key: "family" },
    { name: "Appartamento — Cambio ospite", roomType: "apartment", taskType: "departure", key: "apartment" },
    { name: "Pulizia giornaliera", roomType: "standard", taskType: "daily", key: "standard" },
    { name: "Pulizia profonda", roomType: "standard", taskType: "deep_clean", key: "deep" },
    { name: "Pulizia VIP", roomType: "suite", taskType: "vip", key: "vip" },
  ];

  await prisma.housekeepingChecklistTemplate.createMany({
    data: templates.map((t) => ({
      tenantId,
      name: t.name,
      roomType: t.roomType,
      taskType: t.taskType,
      itemsJson: JSON.stringify(
        (DEFAULT_CHECKLIST_ITEMS[t.key] ?? DEFAULT_CHECKLIST_ITEMS.standard).map((label, i) => ({
          id: `item-${i}`,
          label,
          done: false,
        })),
      ),
    })),
  });
}

export async function getChecklistForTask(tenantId: string, roomType: string, taskType: HousekeepingTaskType) {
  await ensureDefaultChecklists(tenantId);
  const template =
    (await prisma.housekeepingChecklistTemplate.findFirst({
      where: { tenantId, roomType, taskType, active: true },
    })) ??
    (await prisma.housekeepingChecklistTemplate.findFirst({
      where: { tenantId, roomType: "standard", taskType, active: true },
    }));
  if (!template) return [];
  try {
    return JSON.parse(template.itemsJson) as Array<{ id: string; label: string; done: boolean }>;
  } catch {
    return [];
  }
}

export async function updateTaskStatus(
  tenantId: string,
  taskId: string,
  status: "todo" | "in_progress" | "done",
  actor?: HkActor,
  extra?: { actualMin?: number; notes?: string; checklistJson?: string; photosJson?: string; signatureData?: string },
) {
  const task = await prisma.housekeepingTask.findFirst({ where: { id: taskId, tenantId } });
  if (!task) throw new Error("Task not found");

  const now = new Date();
  const data: Prisma.HousekeepingTaskUpdateInput = {
    status,
    notes: extra?.notes ?? undefined,
    checklistJson: extra?.checklistJson ?? undefined,
    photosJson: extra?.photosJson ?? undefined,
    signatureData: extra?.signatureData ?? undefined,
    actualMin: extra?.actualMin ?? undefined,
  };

  if (status === "in_progress" && !task.startedAt) data.startedAt = now;
  if (status === "done") {
    data.completedAt = now;
    if (extra?.actualMin == null && task.startedAt) {
      data.actualMin = Math.max(1, Math.round((now.getTime() - task.startedAt.getTime()) / 60000));
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.housekeepingTask.update({ where: { id: taskId }, data });

    if (status === "done") {
      const roomUpdate: Prisma.HotelRoomUpdateInput = {
        status: "pulita",
        hkPmsCode: "INSPECTED",
      };
      await tx.hotelRoom.update({ where: { id: task.roomId }, data: roomUpdate });
      await writeHkAudit(
        {
          tenantId,
          roomId: task.roomId,
          taskId,
          action: "room_ready",
          newValue: "INSPECTED",
          actor,
        },
        tx,
      );
    }

    await writeHkAudit(
      {
        tenantId,
        roomId: task.roomId,
        taskId,
        action: `task_${status}`,
        oldValue: task.status,
        newValue: status,
        actor,
      },
      tx,
    );

    return row;
  });

  emitHousekeepingEvent(tenantId, { reason: `task_${status}`, taskId, roomId: task.roomId });
  return updated;
}

export async function inspectTask(
  tenantId: string,
  taskId: string,
  level: number,
  input: {
    approved: boolean;
    supervisorId?: string;
    signatureData?: string;
    photosJson?: string;
    comments?: string;
    actor?: HkActor;
  },
) {
  const task = await prisma.housekeepingTask.findFirst({ where: { id: taskId, tenantId } });
  if (!task) throw new Error("Task not found");

  const inspection = await prisma.$transaction(async (tx) => {
    const insp = await tx.housekeepingInspection.create({
      data: {
        tenantId,
        taskId,
        roomId: task.roomId,
        level,
        approved: input.approved,
        supervisorId: input.supervisorId ?? input.actor?.userId ?? null,
        signatureData: input.signatureData ?? null,
        photosJson: input.photosJson ?? null,
        comments: input.comments ?? null,
      },
    });

    const newLevel = Math.max(task.inspectionLevel, level);
    const pmsCode: HousekeepingPmsCode = input.approved && level >= 2 ? "VC" : input.approved ? "INSPECTED" : "VD";

    await tx.housekeepingTask.update({
      where: { id: taskId },
      data: {
        inspectionLevel: newLevel,
        inspectedAt: new Date(),
        inspectedByUserId: input.supervisorId ?? input.actor?.userId ?? null,
      },
    });

    if (input.approved) {
      await tx.hotelRoom.update({
        where: { id: task.roomId },
        data: {
          hkPmsCode: pmsCode,
          status: pmsCode === "VC" || pmsCode === "INSPECTED" ? "pulita" : undefined,
          vipReady: false,
        },
      });
    }

    await writeHkAudit(
      {
        tenantId,
        roomId: task.roomId,
        taskId,
        action: `inspection_level_${level}`,
        newValue: input.approved ? "approved" : "rejected",
        actor: input.actor,
      },
      tx,
    );

    return insp;
  });

  emitHousekeepingEvent(tenantId, { reason: "inspection", taskId, roomId: task.roomId });
  return inspection;
}

export async function updateRoomPmsStatus(
  tenantId: string,
  roomId: string,
  input: {
    hkPmsCode?: HousekeepingPmsCode;
    doNotDisturb?: boolean;
    vipReady?: boolean;
    isBlocked?: boolean;
    hkPriority?: number;
    estimatedCleanMin?: number;
    hkNotes?: string;
    actor?: HkActor;
  },
) {
  const room = await prisma.hotelRoom.findFirst({ where: { id: roomId, tenantId } });
  if (!room) throw new Error("Room not found");

  const code = input.hkPmsCode ?? room.hkPmsCode ?? derivePmsCode(room);
  const legacyStatus = legacyStatusFromPms(code);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.hotelRoom.update({
      where: { id: roomId },
      data: {
        hkPmsCode: code,
        status: legacyStatus,
        doNotDisturb: input.doNotDisturb ?? room.doNotDisturb,
        vipReady: input.vipReady ?? room.vipReady,
        isBlocked: input.isBlocked ?? room.isBlocked,
        hkPriority: input.hkPriority ?? room.hkPriority,
        estimatedCleanMin: input.estimatedCleanMin ?? room.estimatedCleanMin,
        hkNotes: input.hkNotes ?? room.hkNotes,
      },
    });

    await writeHkAudit(
      {
        tenantId,
        roomId,
        action: "room_pms_update",
        oldValue: room.hkPmsCode ?? room.status,
        newValue: code,
        actor: input.actor,
      },
      tx,
    );

    return row;
  });

  emitHousekeepingEvent(tenantId, { reason: "room_status", roomId });
  return updated;
}

export async function createHousekeepingTask(
  tenantId: string,
  input: {
    roomId: string;
    taskType?: HousekeepingTaskType;
    priority?: HousekeepingPriority;
    assignedToUserId?: string;
    scheduledFor?: Date;
    guestName?: string;
    arrivalDate?: Date;
    departureDate?: Date;
    estimatedMin?: number;
    actor?: HkActor;
  },
) {
  const room = await prisma.hotelRoom.findFirst({ where: { id: input.roomId, tenantId } });
  if (!room) throw new Error("Room not found");

  const taskType = input.taskType ?? "departure";
  const checklist = await getChecklistForTask(tenantId, room.roomType, taskType);

  const task = await prisma.$transaction(async (tx) => {
    const row = await tx.housekeepingTask.create({
      data: {
        tenantId,
        roomId: input.roomId,
        status: "todo",
        scheduledFor: input.scheduledFor ?? new Date(),
        taskType,
        priority: input.priority ?? "normal",
        assignedToUserId: input.assignedToUserId ?? null,
        estimatedMin: input.estimatedMin ?? room.estimatedCleanMin,
        guestName: input.guestName ?? null,
        arrivalDate: input.arrivalDate ?? null,
        departureDate: input.departureDate ?? null,
        checklistJson: JSON.stringify(checklist),
      },
    });

    await tx.hotelRoom.update({
      where: { id: input.roomId },
      data: { status: "da_pulire", hkPmsCode: "VD" },
    });

    await writeHkAudit(
      {
        tenantId,
        roomId: input.roomId,
        taskId: row.id,
        action: "task_created",
        newValue: taskType,
        actor: input.actor,
      },
      tx,
    );

    return row;
  });

  emitHousekeepingEvent(tenantId, { reason: "task_created", taskId: task.id, roomId: input.roomId });
  return task;
}

export type HkDashboardKpi = {
  occupied: number;
  vacant: number;
  arrivalsToday: number;
  departuresToday: number;
  dirty: number;
  clean: number;
  inspected: number;
  ready: number;
  outOfOrder: number;
  blocked: number;
  maintenance: number;
  priority: number;
  avgCleanMin: number;
  activeHousekeepers: number;
  openTasks: number;
  completedTasks: number;
  readyPct: number;
};

export async function buildHousekeepingDashboard(tenantId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [rooms, tasks, reservations, maintenanceOpen, staffActive] = await Promise.all([
    prisma.hotelRoom.findMany({ where: { tenantId }, orderBy: [{ floor: "asc" }, { code: "asc" }] }),
    prisma.housekeepingTask.findMany({
      where: { tenantId, scheduledFor: { gte: todayStart, lte: todayEnd } },
      include: { room: { select: { code: true, floor: true, roomType: true } } },
    }),
    prisma.hotelReservation.findMany({
      where: {
        tenantId,
        status: { notIn: ["cancellata", "no_show"] },
        OR: [
          { checkInDate: { gte: todayStart, lte: todayEnd } },
          { checkOutDate: { gte: todayStart, lte: todayEnd } },
          { status: "in_casa" },
        ],
      },
      select: {
        id: true,
        roomId: true,
        guestName: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        lateCheckout: true,
        earlyCheckin: true,
      },
    }),
    prisma.maintenanceTicket.count({ where: { tenantId, status: { notIn: ["closed", "resolved"] } } }),
    prisma.staffShift.count({
      where: { tenantId, clockInAt: { gte: todayStart, lte: todayEnd }, clockOutAt: null },
    }),
  ]);

  const resByRoom = new Map(reservations.filter((r) => r.roomId).map((r) => [r.roomId!, r]));

  let occupied = 0;
  let vacant = 0;
  let dirty = 0;
  let clean = 0;
  let inspected = 0;
  let ready = 0;
  let outOfOrder = 0;
  let blocked = 0;
  let maintenance = 0;
  let priority = 0;

  const roomBoard = rooms.map((room) => {
    const reservation = resByRoom.get(room.id);
    const pmsCode = derivePmsCode({
      status: room.status,
      hkPmsCode: room.hkPmsCode,
      doNotDisturb: room.doNotDisturb,
      vipReady: room.vipReady,
      isBlocked: room.isBlocked,
      lateCheckout: reservation?.lateCheckout,
      earlyCheckin: reservation?.earlyCheckin,
    });

    const isOccupied = room.status === "occupata" || reservation?.status === "in_casa";
    if (isOccupied) occupied++;
    else vacant++;

    if (["VD", "DIRTY", "PICKUP", "TOUCHED", "OD"].includes(pmsCode) || room.status === "da_pulire") dirty++;
    if (["CLEAN", "VC", "VIP_READY"].includes(pmsCode) || room.status === "pulita") clean++;
    if (pmsCode === "INSPECTED") inspected++;
    if (["VC", "INSPECTED", "VIP_READY"].includes(pmsCode) && !isOccupied) ready++;
    if (["OOO", "OOS"].includes(pmsCode)) outOfOrder++;
    if (pmsCode === "BLOCKED" || room.isBlocked) blocked++;
    if (pmsCode === "MAINTENANCE" || room.status === "manutenzione") maintenance++;
    if (room.hkPriority > 0) priority++;

    const openTask = tasks.find((t) => t.roomId === room.id && t.status !== "done");

    return {
      id: room.id,
      code: room.code,
      floor: room.floor,
      roomType: room.roomType,
      capacity: room.capacity,
      status: room.status,
      pmsCode,
      pmsLabel: PMS_CODE_LABELS[pmsCode],
      colorClass: PMS_CODE_COLORS[pmsCode],
      occupied: isOccupied,
      guestName: reservation?.guestName ?? openTask?.guestName ?? null,
      arrival: reservation?.checkInDate.toISOString().slice(0, 10) ?? null,
      departure: reservation?.checkOutDate.toISOString().slice(0, 10) ?? null,
      priority: room.hkPriority,
      estimatedCleanMin: room.estimatedCleanMin,
      doNotDisturb: room.doNotDisturb,
      vipReady: room.vipReady,
      isBlocked: room.isBlocked,
      maintenance: pmsCode === "MAINTENANCE" || room.status === "manutenzione",
      taskId: openTask?.id ?? null,
      taskStatus: openTask?.status ?? null,
    };
  });

  const arrivalsToday = reservations.filter(
    (r) => r.checkInDate >= todayStart && r.checkInDate <= todayEnd,
  ).length;
  const departuresToday = reservations.filter(
    (r) => r.checkOutDate >= todayStart && r.checkOutDate <= todayEnd && r.status === "in_casa",
  ).length;

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const doneWithTime = tasks.filter((t) => t.actualMin != null);
  const avgCleanMin =
    doneWithTime.length > 0
      ? Math.round(doneWithTime.reduce((s, t) => s + (t.actualMin ?? 0), 0) / doneWithTime.length)
      : 30;

  const totalRooms = rooms.length || 1;
  const readyPct = Math.round((ready / totalRooms) * 100);

  const kpi: HkDashboardKpi = {
    occupied,
    vacant,
    arrivalsToday,
    departuresToday,
    dirty,
    clean,
    inspected,
    ready,
    outOfOrder,
    blocked,
    maintenance: maintenance + maintenanceOpen,
    priority,
    avgCleanMin,
    activeHousekeepers: staffActive,
    openTasks,
    completedTasks,
    readyPct,
  };

  return { kpi, roomBoard, tasks, generatedAt: new Date().toISOString() };
}
