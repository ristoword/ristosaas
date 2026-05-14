import { cn, qrImageUrl } from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });
});

describe("qrImageUrl", () => {
  it("generates a URL with default params", () => {
    const url = qrImageUrl("https://example.com");
    expect(url).toContain("api.qrserver.com");
    expect(url).toContain("size=180x180");
    expect(url).toContain("margin=10");
    expect(url).toContain(encodeURIComponent("https://example.com"));
  });

  it("respects custom size and margin", () => {
    const url = qrImageUrl("test", 300, 20);
    expect(url).toContain("size=300x300");
    expect(url).toContain("margin=20");
  });

  it("encodes special characters in data", () => {
    const url = qrImageUrl("https://example.com/path?a=1&b=2");
    expect(url).toContain(encodeURIComponent("https://example.com/path?a=1&b=2"));
    expect(url).not.toContain("&b=2");
  });
});
