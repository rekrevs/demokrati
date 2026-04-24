import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetEnvForTests } from "../env";
import {
  clearAdminCookie,
  hashAdminPassword,
  issueAdminCookie,
  verifyAdminCookie,
  verifyAdminPassword,
} from "./admin";

const ORIGINAL = { ...process.env };

function stubEnv(passwordHash: string) {
  process.env = { ...ORIGINAL };
  process.env.DATABASE_URL = "postgresql://u:p@localhost/db";
  process.env.ADMIN_PASSWORD_HASH = passwordHash;
  _resetEnvForTests();
}

describe("admin password hashing", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    process.env.DATABASE_URL = "postgresql://u:p@localhost/db";
    _resetEnvForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
    _resetEnvForTests();
  });

  it("rejects when no password hash is configured", async () => {
    await expect(verifyAdminPassword("anything")).resolves.toBe(false);
  });

  it("round-trips hash + verify", async () => {
    const hash = await hashAdminPassword("correct-horse");
    stubEnv(hash);
    await expect(verifyAdminPassword("correct-horse")).resolves.toBe(true);
    await expect(verifyAdminPassword("nope")).resolves.toBe(false);
  });
});

describe("admin cookies", () => {
  let hash: string;
  beforeEach(async () => {
    hash = await hashAdminPassword("secret");
    stubEnv(hash);
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
    _resetEnvForTests();
  });

  it("issues and verifies a well-formed cookie", () => {
    const cookie = issueAdminCookie();
    expect(verifyAdminCookie(cookie.value)).toBe(true);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(cookie.maxAge).toBeGreaterThan(0);
  });

  it("rejects a tampered cookie", () => {
    const cookie = issueAdminCookie();
    const tampered = cookie.value.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(verifyAdminCookie(tampered)).toBe(false);
  });

  it("rejects an expired cookie", () => {
    const past = Date.now() - 10 * 24 * 3_600 * 1_000;
    const cookie = issueAdminCookie(past);
    expect(verifyAdminCookie(cookie.value, Date.now())).toBe(false);
  });

  it("rejects an empty cookie value", () => {
    expect(verifyAdminCookie("")).toBe(false);
    expect(verifyAdminCookie(undefined)).toBe(false);
  });

  it("clear cookie is empty with maxAge 0", () => {
    const cleared = clearAdminCookie();
    expect(cleared.value).toBe("");
    expect(cleared.maxAge).toBe(0);
  });
});
