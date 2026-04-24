import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetEnvForTests, env } from "./env";

describe("env loader", () => {
  const original = { ...process.env };

  beforeEach(() => {
    _resetEnvForTests();
  });

  afterEach(() => {
    process.env = { ...original };
    _resetEnvForTests();
  });

  it("throws a descriptive error when DATABASE_URL is missing", () => {
    process.env.DATABASE_URL = "";
    expect(() => env()).toThrow(/DATABASE_URL/);
  });

  it("accepts defaults for optional fields", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost/db";
    delete process.env.REDIS_URL;
    const loaded = env();
    expect(loaded.REDIS_URL).toBe("redis://localhost:6379");
    expect(loaded.RATE_LIMIT_PUBLIC_RUNS_PER_HOUR).toBe(20);
  });

  it("coerces numeric env strings to numbers", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost/db";
    process.env.RATE_LIMIT_PUBLIC_RUNS_PER_HOUR = "42";
    const loaded = env();
    expect(loaded.RATE_LIMIT_PUBLIC_RUNS_PER_HOUR).toBe(42);
  });
});
