import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetEnvForTests } from "../env";
import { resolveProfile } from "./profiles";

const ORIGINAL = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetEnvForTests();
}

describe("resolveProfile", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    process.env.DATABASE_URL = "postgresql://u:p@localhost/db";
    _resetEnvForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    _resetEnvForTests();
  });

  it("reads fast profile from env", () => {
    setEnv({
      MODEL_FAST_PROVIDER: "openai",
      MODEL_FAST_NAME: "gpt-4o-mini",
    });
    expect(resolveProfile("fast")).toEqual({
      provider: "openai",
      model: "gpt-4o-mini",
    });
  });

  it("reads strong profile from env", () => {
    setEnv({
      MODEL_STRONG_PROVIDER: "anthropic",
      MODEL_STRONG_NAME: "claude-sonnet-4-6",
    });
    expect(resolveProfile("strong")).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
  });

  it("compare profile falls back to the strong profile", () => {
    setEnv({
      MODEL_STRONG_PROVIDER: "anthropic",
      MODEL_STRONG_NAME: "claude-sonnet-4-6",
    });
    expect(resolveProfile("compare")).toEqual(resolveProfile("strong"));
  });

  it("reads embedding profile from env", () => {
    setEnv({
      MODEL_EMBED_PROVIDER: "openai",
      MODEL_EMBED_NAME: "text-embedding-3-small",
    });
    expect(resolveProfile("embedding")).toEqual({
      provider: "openai",
      model: "text-embedding-3-small",
    });
  });

  it("falls back to default values when env vars are absent", () => {
    setEnv({
      MODEL_FAST_PROVIDER: undefined,
      MODEL_FAST_NAME: undefined,
    });
    const resolved = resolveProfile("fast");
    expect(resolved.provider).toBe("anthropic");
    expect(resolved.model).toBe("claude-haiku-4-5-20251001");
  });
});
