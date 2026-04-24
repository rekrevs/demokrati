import type { DemoModule, DemoRunContext, Scenario } from "../module";
import { getRouter } from "@/lib/llm";
import { PROMPT_VERSIONS, runSprakdriftenPipeline } from "./pipeline";
import { FEATURED_SCENARIOS } from "./scenarios";
import {
  sprakdriftenInputSchema,
  sprakdriftenOutputSchema,
  type SprakdriftenInput,
  type SprakdriftenOutput,
} from "./schemas";

export const SPRAKDRIFTEN_ID = "sprakdriften";

export const sprakdriften: DemoModule<SprakdriftenInput, SprakdriftenOutput> = {
  id: SPRAKDRIFTEN_ID,
  title: "Språkdriften",
  visibility: "public",
  supportsLive: true,
  supportsCustomInput: true,
  riskLevel: "low",
  cacheTTLSeconds: 24 * 3_600,
  promptVersions: { ...PROMPT_VERSIONS },
  modelProfile: "multilingual+strong",

  inputSchema: sprakdriftenInputSchema,
  outputSchema: sprakdriftenOutputSchema,

  async getFeaturedScenarios(): Promise<Scenario<SprakdriftenInput>[]> {
    return FEATURED_SCENARIOS;
  },

  async validateInput(input: SprakdriftenInput) {
    if (!input.languages.includes("sv")) {
      return {
        ok: false,
        errors: ["Svenska måste alltid ingå i jämförelsen."],
      };
    }
    return { ok: true };
  },

  async run(
    input: SprakdriftenInput,
    ctx: DemoRunContext,
  ): Promise<SprakdriftenOutput> {
    return runSprakdriftenPipeline(input, {
      router: getRouter(),
      log: ctx.log,
    });
  },

  renderMeta(output) {
    return {
      title: `Språkdriften: ${output.canonicalQuestionSv}`,
      summary: `${output.answers.length} språk · ${output.observedDifferences.length} observerade skillnader`,
    };
  },
};

export { FEATURED_SCENARIOS };
export * from "./schemas";
