import { vi } from "vitest";

type Row = { bucket: string; keyHash: string; createdAt: Date };
const store: Row[] = [];

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    rateLimitHit: {
      async count({ where }: { where: { bucket: string; keyHash: string; createdAt: { gte: Date } } }) {
        return store.filter(
          (r) =>
            r.bucket === where.bucket &&
            r.keyHash === where.keyHash &&
            r.createdAt.getTime() >= where.createdAt.gte.getTime(),
        ).length;
      },
      async findFirst({ where }: any) {
        const rows = store
          .filter((r) => r.bucket === where.bucket && r.keyHash === where.keyHash && r.createdAt.getTime() >= where.createdAt.gte.getTime())
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return rows[0] ?? null;
      },
      async create({ data }: { data: { bucket: string; keyHash: string } }) {
        const row = { ...data, createdAt: new Date() };
        store.push(row);
        return row;
      },
      async deleteMany() {
        return { count: 0 };
      },
    },
  },
}));

import { applyRateLimit } from "@/lib/security/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    store.length = 0;
  });

  it("allows up to limit, then blocks", async () => {
    const opts = { bucket: "test:hit", limit: 3, windowMs: 60_000 };
    const r1 = await applyRateLimit("user-1", opts);
    const r2 = await applyRateLimit("user-1", opts);
    const r3 = await applyRateLimit("user-1", opts);
    const r4 = await applyRateLimit("user-1", opts);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.limit).toBe(3);
  });

  it("keys are isolated per raw key", async () => {
    const opts = { bucket: "test:iso", limit: 1, windowMs: 60_000 };
    const a = await applyRateLimit("A", opts);
    const b = await applyRateLimit("B", opts);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    const a2 = await applyRateLimit("A", opts);
    expect(a2.allowed).toBe(false);
  });

  it("returns Retry-After in seconds via headers helper shape", async () => {
    const opts = { bucket: "test:retry", limit: 1, windowMs: 30_000 };
    await applyRateLimit("x", opts);
    const blocked = await applyRateLimit("x", opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetInMs).toBeGreaterThanOrEqual(0);
    expect(blocked.resetInMs).toBeLessThanOrEqual(30_000);
  });
});
