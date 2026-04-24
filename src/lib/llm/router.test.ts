import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { _resetEnvForTests } from "../env";
import type { EmbedAdapter, TextAdapter } from "./providers/types";
import {
  ModelRouter,
  SchemaValidationError,
  extractJson,
} from "./router";
import type { TextResponse } from "./types";

const ORIGINAL = { ...process.env };

function stubEnv() {
  process.env = { ...ORIGINAL };
  process.env.DATABASE_URL = "postgresql://u:p@localhost/db";
  process.env.MODEL_FAST_PROVIDER = "anthropic";
  process.env.MODEL_FAST_NAME = "fast-model";
  process.env.MODEL_STRONG_PROVIDER = "anthropic";
  process.env.MODEL_STRONG_NAME = "strong-model";
  process.env.MODEL_MULTILINGUAL_PROVIDER = "anthropic";
  process.env.MODEL_MULTILINGUAL_NAME = "multi-model";
  process.env.MODEL_SAFE_PROVIDER = "anthropic";
  process.env.MODEL_SAFE_NAME = "safe-model";
  process.env.MODEL_EMBED_PROVIDER = "openai";
  process.env.MODEL_EMBED_NAME = "embed-model";
  _resetEnvForTests();
}

function mockTextAdapter(
  responses: Array<string | TextResponse | Error>,
): TextAdapter & { calls: { model: string; system?: string }[] } {
  const calls: { model: string; system?: string }[] = [];
  let i = 0;
  return {
    provider: "anthropic",
    calls,
    async text(model, req) {
      calls.push({ model, system: req.system });
      const next = responses[i++];
      if (next instanceof Error) throw next;
      if (typeof next === "string") {
        return {
          text: next,
          model,
          provider: "anthropic",
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return next as TextResponse;
    },
  };
}

function mockEmbedAdapter(): EmbedAdapter {
  return {
    provider: "openai",
    async embed(model, req) {
      return {
        embeddings: req.texts.map(() => [0.1, 0.2, 0.3]),
        model,
        provider: "openai",
        usage: { inputTokens: 3 * req.texts.length },
      };
    },
  };
}

describe("ModelRouter.text", () => {
  beforeEach(stubEnv);
  afterEach(() => {
    process.env = { ...ORIGINAL };
    _resetEnvForTests();
  });

  it("dispatches to the adapter resolved by profile", async () => {
    const adapter = mockTextAdapter(["hello"]);
    const router = new ModelRouter({ anthropic: adapter }, {});
    const res = await router.text("fast", {
      messages: [{ role: "user", content: "hi" }],
    });
    expect(res.text).toBe("hello");
    expect(res.model).toBe("fast-model");
    expect(adapter.calls[0].model).toBe("fast-model");
  });

  it("throws when no adapter is registered for the profile's provider", async () => {
    process.env.MODEL_FAST_PROVIDER = "openai";
    _resetEnvForTests();
    const router = new ModelRouter({}, {});
    await expect(
      router.text("fast", { messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/No text adapter registered.+openai/);
  });
});

describe("ModelRouter.json", () => {
  const schema = z.object({
    question: z.string(),
    answers: z.array(z.string()).min(1),
  });

  beforeEach(stubEnv);
  afterEach(() => {
    process.env = { ...ORIGINAL };
    _resetEnvForTests();
  });

  it("parses a direct JSON response without retry", async () => {
    const adapter = mockTextAdapter([
      '{"question":"q","answers":["a"]}',
    ]);
    const router = new ModelRouter({ anthropic: adapter }, {});
    const res = await router.json(
      "strong",
      { messages: [{ role: "user", content: "q" }] },
      schema,
    );
    expect(res.data).toEqual({ question: "q", answers: ["a"] });
    expect(res.retriedOnce).toBe(false);
    expect(adapter.calls).toHaveLength(1);
  });

  it("parses JSON out of a markdown code fence", async () => {
    const adapter = mockTextAdapter([
      'Sure!\n```json\n{"question":"q","answers":["a","b"]}\n```\n',
    ]);
    const router = new ModelRouter({ anthropic: adapter }, {});
    const res = await router.json(
      "strong",
      { messages: [{ role: "user", content: "q" }] },
      schema,
    );
    expect(res.data.answers).toEqual(["a", "b"]);
    expect(res.retriedOnce).toBe(false);
  });

  it("retries once when the first response fails schema validation", async () => {
    const adapter = mockTextAdapter([
      '{"question":"q"}',
      '{"question":"q","answers":["a"]}',
    ]);
    const router = new ModelRouter({ anthropic: adapter }, {});
    const res = await router.json(
      "strong",
      { messages: [{ role: "user", content: "q" }] },
      schema,
    );
    expect(res.data).toEqual({ question: "q", answers: ["a"] });
    expect(res.retriedOnce).toBe(true);
    expect(adapter.calls).toHaveLength(2);
  });

  it("throws SchemaValidationError when retry also fails", async () => {
    const adapter = mockTextAdapter(['not json', 'still not json']);
    const router = new ModelRouter({ anthropic: adapter }, {});
    await expect(
      router.json(
        "strong",
        { messages: [{ role: "user", content: "q" }] },
        schema,
      ),
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it("aggregates usage across retry", async () => {
    const base: TextResponse = {
      text: "not json",
      model: "strong-model",
      provider: "anthropic",
      usage: { inputTokens: 100, outputTokens: 20 },
    };
    const second: TextResponse = {
      ...base,
      text: '{"question":"q","answers":["a"]}',
      usage: { inputTokens: 50, outputTokens: 10 },
    };
    const adapter = mockTextAdapter([base, second]);
    const router = new ModelRouter({ anthropic: adapter }, {});
    const res = await router.json(
      "strong",
      { messages: [{ role: "user", content: "q" }] },
      schema,
    );
    expect(res.usage).toEqual({
      inputTokens: 150,
      outputTokens: 30,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    });
  });
});

describe("ModelRouter.embed", () => {
  beforeEach(stubEnv);
  afterEach(() => {
    process.env = { ...ORIGINAL };
    _resetEnvForTests();
  });

  it("dispatches to the embed adapter for the embedding profile", async () => {
    const router = new ModelRouter({}, { openai: mockEmbedAdapter() });
    const res = await router.embed("embedding", { texts: ["a", "b"] });
    expect(res.embeddings).toHaveLength(2);
    expect(res.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
    expect(res.model).toBe("embed-model");
  });
});

describe("extractJson", () => {
  it("returns null for prose-only text", () => {
    expect(extractJson("hello there")).toBeNull();
  });

  it("parses a trailing object from mixed prose", () => {
    expect(
      extractJson("Here's your answer: {\"ok\": true} cheers"),
    ).toEqual({ ok: true });
  });

  it("parses nested objects correctly", () => {
    expect(
      extractJson('{"a":{"b":[{"c":1}]}, "d":"}"}'),
    ).toEqual({ a: { b: [{ c: 1 }] }, d: "}" });
  });

  it("handles strings that contain the closing brace", () => {
    expect(
      extractJson('{"note": "this } looks like a close"}'),
    ).toEqual({ note: "this } looks like a close" });
  });
});

describe("fixture: known-bad response shapes", () => {
  const schema = z.object({ x: z.number() });
  beforeEach(stubEnv);
  afterEach(() => {
    process.env = { ...ORIGINAL };
    _resetEnvForTests();
  });

  it("falls back to retry when response is prose instead of JSON", async () => {
    const adapter = mockTextAdapter([
      "I think the answer is maybe 42.",
      '{"x":42}',
    ]);
    const router = new ModelRouter({ anthropic: adapter }, {});
    const res = await router.json(
      "strong",
      { messages: [{ role: "user", content: "give me x" }] },
      schema,
    );
    expect(res.data.x).toBe(42);
    expect(res.retriedOnce).toBe(true);
  });
});
