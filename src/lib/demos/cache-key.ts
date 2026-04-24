import { createHash } from "node:crypto";

/**
 * Deterministically serialise any JSON-safe value. Objects have their
 * keys sorted so that `{a:1,b:2}` and `{b:2,a:1}` hash identically.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => v !== undefined,
  );
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function inputHash(input: unknown): string {
  return sha256(stableStringify(input));
}

export interface CacheKeyArgs {
  demoSlug: string;
  inputHash: string;
  promptVersions: Record<string, string>;
  modelProfile: string;
  sourceRevision?: string;
}

/**
 * Hash bundle for a demo run. Two submissions produce the same key iff
 * demo slug, input, prompt versions, model profile, and source data
 * revision all match.
 */
export function cacheKey(args: CacheKeyArgs): string {
  const parts = [
    `demo:${args.demoSlug}`,
    `input:${args.inputHash}`,
    `prompts:${stableStringify(args.promptVersions)}`,
    `model:${args.modelProfile}`,
    args.sourceRevision ? `src:${args.sourceRevision}` : "src:none",
  ].join("|");
  return sha256(parts);
}
