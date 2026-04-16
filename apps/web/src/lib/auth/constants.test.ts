import { getJwtSecret } from "@/lib/auth/constants";

describe("auth constants", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousJwtSecret == null) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it("throws in production when JWT secret is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow("JWT_SECRET is required");
  });

  it("throws in production when JWT secret is too weak", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "short";
    expect(() => getJwtSecret()).toThrow("JWT_SECRET is required");
  });

  it("accepts strong JWT secret in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "this-is-a-strong-secret-at-least-32-chars";
    expect(getJwtSecret()).toBe("this-is-a-strong-secret-at-least-32-chars");
  });
});
