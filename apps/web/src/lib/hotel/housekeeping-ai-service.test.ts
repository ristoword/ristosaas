import { describe, expect, it } from "vitest";
import { analyzeHousekeepingOps } from "@/lib/hotel/housekeeping-ai-service";
import { derivePmsCode, legacyStatusFromPms } from "@/lib/hotel/housekeeping-service";

describe("housekeeping-ai-service", () => {
  it("suggests delay risk when ready pct is low with arrivals", () => {
    const analysis = analyzeHousekeepingOps({
      kpi: {
        occupied: 10,
        vacant: 5,
        arrivalsToday: 8,
        departuresToday: 6,
        dirty: 7,
        clean: 3,
        inspected: 2,
        ready: 2,
        outOfOrder: 0,
        blocked: 0,
        maintenance: 1,
        priority: 2,
        avgCleanMin: 35,
        activeHousekeepers: 2,
        openTasks: 9,
        completedTasks: 4,
        readyPct: 40,
      },
      roomBoard: [
        { code: "101", pmsCode: "VD", priority: 1, estimatedCleanMin: 30, departure: "2026-06-28", arrival: null, occupied: false, vipReady: false, taskStatus: "todo" },
        { code: "102", pmsCode: "VIP_READY", priority: 5, estimatedCleanMin: 45, departure: null, arrival: "2026-06-28", occupied: false, vipReady: true, taskStatus: null },
      ],
    });
    expect(analysis.suggestions.some((s) => s.type === "delay")).toBe(true);
    expect(analysis.suggestions.some((s) => s.type === "vip")).toBe(true);
    expect(analysis.optimalOrder.length).toBeGreaterThan(0);
  });
});

describe("housekeeping-service pms codes", () => {
  it("derives VD from da_pulire", () => {
    expect(derivePmsCode({ status: "da_pulire" })).toBe("VD");
  });

  it("maps INSPECTED to pulita legacy status", () => {
    expect(legacyStatusFromPms("INSPECTED")).toBe("pulita");
  });
});
