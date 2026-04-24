import { describe, expect, it } from "vitest";
import { cacheKey, inputHash, stableStringify } from "./cache-key";

describe("stableStringify", () => {
  it("is key-order independent for objects", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(
      stableStringify({ b: 2, a: 1 }),
    );
  });

  it("distinguishes objects with different values", () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });

  it("preserves array ordering", () => {
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });

  it("ignores undefined properties (they never reach JSON)", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(
      stableStringify({ a: 1 }),
    );
  });
});

describe("inputHash", () => {
  it("is deterministic for identical inputs regardless of key order", () => {
    const a = inputHash({ question: "q", languages: ["sv", "en"] });
    const b = inputHash({ languages: ["sv", "en"], question: "q" });
    expect(a).toBe(b);
  });

  it("changes when input changes", () => {
    const a = inputHash({ question: "q" });
    const b = inputHash({ question: "q2" });
    expect(a).not.toBe(b);
  });

  it("is 64 hex chars (sha256)", () => {
    expect(inputHash({ x: 1 })).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("cacheKey", () => {
  const base = {
    demoSlug: "sprakdriften",
    inputHash: "abc",
    promptVersions: { extract: "v1", compare: "v2" },
    modelProfile: "strong",
  };

  it("is deterministic", () => {
    expect(cacheKey(base)).toBe(cacheKey(base));
  });

  it("differs when prompt versions differ", () => {
    const other = {
      ...base,
      promptVersions: { extract: "v1", compare: "v3" },
    };
    expect(cacheKey(base)).not.toBe(cacheKey(other));
  });

  it("differs when model profile differs", () => {
    expect(cacheKey(base)).not.toBe(cacheKey({ ...base, modelProfile: "fast" }));
  });

  it("differs when source revision differs", () => {
    expect(cacheKey(base)).not.toBe(
      cacheKey({ ...base, sourceRevision: "2026-04-24" }),
    );
  });

  it("treats absent sourceRevision as 'none' consistently", () => {
    const k1 = cacheKey(base);
    const k2 = cacheKey({ ...base, sourceRevision: undefined });
    expect(k1).toBe(k2);
  });
});
