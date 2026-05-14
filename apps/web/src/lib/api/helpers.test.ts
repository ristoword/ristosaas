import { NextRequest } from "next/server";
import { ok, err, withErrorHandler } from "@/lib/api/helpers";

describe("ok", () => {
  it("returns JSON with 200 by default", () => {
    const response = ok({ data: "test" });
    expect(response.status).toBe(200);
  });

  it("accepts custom status", () => {
    const response = ok({ id: "1" }, 201);
    expect(response.status).toBe(201);
  });
});

describe("err", () => {
  it("returns JSON with 400 by default", () => {
    const response = err("bad request");
    expect(response.status).toBe(400);
  });

  it("accepts custom status", () => {
    const response = err("not found", 404);
    expect(response.status).toBe(404);
  });
});

describe("withErrorHandler", () => {
  function makeRequest(path = "/api/test") {
    return new NextRequest(new URL(path, "http://localhost:3000"));
  }

  it("passes through successful responses", async () => {
    const handler = withErrorHandler(async () => ok({ success: true }));
    const res = await handler(makeRequest(), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("catches thrown errors and returns 500", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("DB connection failed");
    });
    const res = await handler(makeRequest(), { params: Promise.resolve({}) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Errore interno del server.");
  });

  it("catches non-Error throws", async () => {
    const handler = withErrorHandler(async () => {
      throw "string error";
    });
    const res = await handler(makeRequest(), { params: Promise.resolve({}) });
    expect(res.status).toBe(500);
  });
});
