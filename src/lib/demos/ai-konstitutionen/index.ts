import type { DemoModule, DemoRunContext, Scenario } from "../module";
import { PROMPT_VERSIONS, runAiKonstitutionenPipeline } from "./pipeline";
import { RULES } from "./rules";
import { FEATURED_SCENARIOS } from "./scenarios";
import {
  aiKonstitutionenInputSchema,
  aiKonstitutionenOutputSchema,
  type AiKonstitutionenInput,
  type AiKonstitutionenOutput,
} from "./schemas";

export const AI_KONSTITUTIONEN_ID = "ai-konstitutionen";

export const aiKonstitutionen: DemoModule<
  AiKonstitutionenInput,
  AiKonstitutionenOutput
> = {
  id: AI_KONSTITUTIONEN_ID,
  title: "AI-konstitutionen",
  visibility: "public",
  supportsLive: true,
  supportsCustomInput: true,
  riskLevel: "low",
  cacheTTLSeconds: 24 * 3_600,
  promptVersions: { ...PROMPT_VERSIONS },
  modelProfile: "strong",

  inputSchema: aiKonstitutionenInputSchema,
  outputSchema: aiKonstitutionenOutputSchema,

  async getFeaturedScenarios(): Promise<Scenario<AiKonstitutionenInput>[]> {
    return FEATURED_SCENARIOS;
  },

  async validateInput(input: AiKonstitutionenInput) {
    const known = new Set(RULES.map((r) => r.id));
    const unknown = input.ruleIds.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      return {
        ok: false,
        errors: [`Okända regel-ID: ${unknown.join(", ")}`],
      };
    }
    return { ok: true };
  },

  async run(
    input: AiKonstitutionenInput,
    ctx: DemoRunContext,
  ): Promise<AiKonstitutionenOutput> {
    return runAiKonstitutionenPipeline(input, {
      log: ctx.log,
      setProgress: ctx.setProgress,
    });
  },

  renderMeta(output) {
    return {
      title: `AI-konstitutionen: ${output.question}`,
      summary: `${output.appliedRules.length} regler · ${output.observedChanges.length} observerade förändringar`,
    };
  },
};

export { FEATURED_SCENARIOS, RULES };
export * from "./schemas";
