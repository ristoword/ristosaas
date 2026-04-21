import { vi } from "vitest";

type Event = { id: string; status: "received" | "processed" | "failed" };

const state: { events: Map<string, Event> } = { events: new Map() };

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    billingEvent: {
      async findUnique({ where }: { where: { stripeEventId: string } }) {
        const ev = state.events.get(where.stripeEventId);
        return ev ? { stripeEventId: ev.id, status: ev.status } : null;
      },
      async upsert({ where }: any) {
        // minimal impl: simulate "received" record so subsequent code paths don't crash
        state.events.set(where.stripeEventId, { id: where.stripeEventId, status: "received" });
        return { stripeEventId: where.stripeEventId };
      },
      async count() {
        return 0;
      },
    },
    billingSubscription: {
      async findFirst() {
        return null;
      },
      async findUnique() {
        return null;
      },
      async upsert({ where }: any) {
        return { stripeSubscriptionId: where.stripeSubscriptionId };
      },
    },
    tenant: {
      async findUnique() {
        return null;
      },
    },
    tenantLicense: {
      async upsert() {
        return {};
      },
    },
    tenantFeature: {
      async upsert() {
        return {};
      },
    },
    $transaction: async (fn: any) => fn({
      tenantFeature: { upsert: async () => ({}) },
      tenantLicense: { upsert: async () => ({}) },
      tenant: { update: async () => ({}) },
    }),
  },
}));

import { billingRepository } from "@/lib/db/repositories/billing.repository";

describe("billing.processStripeEvent — idempotency", () => {
  beforeEach(() => {
    state.events.clear();
  });

  it("returns duplicate:true when event already processed", async () => {
    state.events.set("evt_already_done", { id: "evt_already_done", status: "processed" });
    const result = await billingRepository.processStripeEvent({
      id: "evt_already_done",
      type: "customer.subscription.updated",
      data: { object: {} },
    } as any);
    expect(result.processed).toBe(true);
    expect(result.duplicate).toBe(true);
    expect(result.eventId).toBe("evt_already_done");
  });

  it("does not short-circuit when prior is only 'received'", async () => {
    state.events.set("evt_pending", { id: "evt_pending", status: "received" });
    const result = await billingRepository.processStripeEvent({
      id: "evt_pending",
      type: "customer.subscription.updated",
      data: { object: {} },
    } as any);
    // With no tenant inference available, the repo returns tenant_not_resolved
    expect((result as any).processed).toBe(false);
    expect((result as any).reason).toBe("tenant_not_resolved");
  });

  it("refuses events without id", async () => {
    const result = await billingRepository.processStripeEvent({ type: "customer.subscription.updated" } as any);
    expect((result as any).processed).toBe(false);
    expect((result as any).reason).toBe("missing_event_id");
  });
});
