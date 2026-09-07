import {
  applyRailwayPrivateDatabaseUrl,
  resolveRailwayDatabaseUrl,
} from "@/lib/db/railway-database-url";

const PUBLIC =
  "postgresql://postgres:p%40ss@gondola.proxy.rlwy.net:21479/railway?sslmode=require";

describe("resolveRailwayDatabaseUrl", () => {
  it("leaves local URLs unchanged", () => {
    const resolved = resolveRailwayDatabaseUrl({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/ristosimply",
    });
    expect(resolved.source).toBe("unchanged");
    expect(resolved.host).toBe("localhost");
    expect(resolved.url).toContain("localhost:5432");
  });

  it("does not rewrite the public proxy on a developer machine", () => {
    const resolved = resolveRailwayDatabaseUrl({ DATABASE_URL: PUBLIC });
    expect(resolved.source).toBe("unchanged");
    expect(resolved.host).toBe("gondola.proxy.rlwy.net");
  });

  it("prefers DATABASE_PRIVATE_URL on Railway", () => {
    const resolved = resolveRailwayDatabaseUrl({
      RAILWAY_ENVIRONMENT: "production",
      DATABASE_URL: PUBLIC,
      DATABASE_PRIVATE_URL:
        "postgresql://postgres:p%40ss@postgres.railway.internal:5432/railway",
    });
    expect(resolved.source).toBe("database_private_url");
    expect(resolved.host).toBe("postgres.railway.internal");
    expect(resolved.port).toBe("5432");
    expect(resolved.sslmode).toBe("disable");
    expect(resolved.url).toContain("p%40ss");
    expect(resolved.url).not.toContain("gondola.proxy.rlwy.net");
  });

  it("rewrites *.proxy.rlwy.net to postgres.railway.internal on Railway", () => {
    const resolved = resolveRailwayDatabaseUrl({
      RAILWAY_PROJECT_ID: "6bc04b9e-f6d2-415d-85b3-e2baedca02c2",
      DATABASE_URL: PUBLIC,
    });
    expect(resolved.source).toBe("rewritten_private");
    expect(resolved.host).toBe("postgres.railway.internal");
    expect(resolved.port).toBe("5432");
    expect(resolved.sslmode).toBe("disable");
    expect(resolved.url).toContain("p%40ss");
    expect(resolved.url).toContain("connect_timeout=30");
    expect(resolved.url).not.toContain("21479");
  });

  it("uses PGHOST when it is already a private hostname", () => {
    const resolved = resolveRailwayDatabaseUrl({
      RAILWAY_ENVIRONMENT: "production",
      DATABASE_URL: PUBLIC,
      PGHOST: "postgresql.railway.internal",
    });
    expect(resolved.host).toBe("postgresql.railway.internal");
    expect(resolved.source).toBe("rewritten_private");
  });

  it("mutates DATABASE_URL in place on Railway", () => {
    const env: Record<string, string | undefined> = {
      RAILWAY_SERVICE_ID: "b94eb792-9b6f-42f8-8173-d17b94aaba19",
      DATABASE_URL: PUBLIC,
    };
    const resolved = applyRailwayPrivateDatabaseUrl(env);
    expect(env.DATABASE_URL).toBe(resolved.url);
    expect(env.DATABASE_URL).toContain("postgres.railway.internal:5432");
  });
});
