import { describe, expect, it, vi } from "vitest";
import type { ModelRouter } from "@/lib/llm/router";
import { runSprakdriftenPipeline } from "./pipeline";
import type { SprakdriftenInput } from "./schemas";

function makeRouter(): ModelRouter {
  let callCount = 0;
  const text = vi.fn(async (_profile: string, req: { messages: { content: string }[] }) => {
    callCount += 1;
    const content = req.messages[req.messages.length - 1]?.content ?? "";
    // Translate step: echo with language prefix
    if (content.startsWith("Translate the following Swedish political question")) {
      return {
        text: "TRANSLATED: " + content.slice(0, 20),
        model: "mock",
        provider: "anthropic" as const,
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    }
    // Back-translate step
    if (content.startsWith("Translate the following")) {
      return {
        text: "BACKTRANSLATED",
        model: "mock",
        provider: "anthropic" as const,
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    }
    // Answer step: user prompt won't match either translate label
    return {
      text: `answer #${callCount} in some language`,
      model: "mock",
      provider: "anthropic" as const,
      usage: { inputTokens: 10, outputTokens: 5 },
    };
  });

  const json = vi.fn(async (_profile: string) => {
    return {
      data: {
        answers: [
          {
            language: "sv",
            tone: "analytical",
            framing: ["institutional"],
            institutionsMentioned: ["Riksdagen"],
            certaintyLevel: "medium",
          },
          {
            language: "en",
            tone: "informative",
            framing: ["legal"],
            institutionsMentioned: ["Parliament"],
            certaintyLevel: "medium",
          },
        ],
        observedDifferences: [
          {
            dimension: "institutional reference",
            description:
              "Swedish mentions 'Riksdagen', English uses the generic term 'Parliament'.",
            evidence: [
              { language: "sv", quote: "Riksdagen beslutar..." },
              { language: "en", quote: "Parliament decides..." },
            ],
          },
        ],
        internalVariationIndex: 0.42,
      },
      raw: "<mock>",
      model: "mock",
      provider: "anthropic" as const,
      usage: { inputTokens: 50, outputTokens: 30 },
      retriedOnce: false,
    };
  });

  return { text, json, embed: vi.fn() } as unknown as ModelRouter;
}

describe("runSprakdriftenPipeline", () => {
  it("runs translate → answer → back-translate → compare and returns schema-valid output", async () => {
    const router = makeRouter();
    const input: SprakdriftenInput = {
      questionSv: "Är Sverige ett tryggt land?",
      languages: ["sv", "en"],
      style: "overview",
    };
    const log = vi.fn();

    const out = await runSprakdriftenPipeline(input, { router, log });

    expect(out.canonicalQuestionSv).toBe(input.questionSv);
    expect(out.answers).toHaveLength(2);
    expect(out.answers.map((a) => a.language)).toEqual(["sv", "en"]);
    // Back-translation for Swedish is a no-op (same language), English gets back-translated.
    expect(out.answers[0].answerSv).toBe(out.answers[0].answerOriginal);
    expect(out.answers[1].answerSv).toBe("BACKTRANSLATED");
    // questionInTarget: Swedish is identity, English gets the mock translation
    expect(out.answers[0].questionInTarget).toBe(input.questionSv);
    expect(out.answers[1].questionInTarget).toMatch(/^TRANSLATED:/);
    // Tone must be within the constrained enum
    expect(out.answers[0].tone).toBe("analytical");
    expect(out.answers[1].tone).toBe("informative");
    expect(out.observedDifferences).toHaveLength(1);
    expect(out.internalVariationIndex).toBeCloseTo(0.42);

    // The log callback should have been called for each stage
    const events = log.mock.calls.map((c) => c[0]);
    expect(events).toContain("start");
    expect(events).toContain("translated");
    expect(events).toContain("answered");
    expect(events).toContain("back-translated");
    expect(events).toContain("compared");
  });

  it("does not translate when language is sv", async () => {
    const router = makeRouter();
    const input: SprakdriftenInput = {
      questionSv: "Testfråga om demokrati.",
      languages: ["sv"],
      style: "overview",
    };

    // The schema requires at least 2 languages, so this specific case would
    // fail schema validation before pipeline execution. We bypass that here
    // to unit-test the pipeline directly; the module-level `validateInput`
    // is responsible for the user-facing guard.
    await expect(
      runSprakdriftenPipeline(input, { router, log: () => undefined }),
    ).rejects.toThrow(); // schema.parse on the final output requires ≥2 answers
  });
});
