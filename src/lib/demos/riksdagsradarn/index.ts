import type { DemoModule, DemoRunContext, Scenario } from "../module";
import { PROMPT_VERSIONS, runRiksdagsradarnPipeline } from "./pipeline";
import { FEATURED_SCENARIOS } from "./scenarios";
import {
  riksdagsradarnInputSchema,
  riksdagsradarnOutputSchema,
  type RiksdagsradarnInput,
  type RiksdagsradarnOutput,
} from "./schemas";

export const RIKSDAGSRADARN_ID = "riksdagsradarn";

export const riksdagsradarn: DemoModule<
  RiksdagsradarnInput,
  RiksdagsradarnOutput
> = {
  id: RIKSDAGSRADARN_ID,
  title: "Riksdagsradarn",
  visibility: "public",
  supportsLive: true,
  supportsCustomInput: true,
  riskLevel: "low",
  cacheTTLSeconds: 24 * 3_600,
  promptVersions: { ...PROMPT_VERSIONS },
  modelProfile: "strong+embedding",

  inputSchema: riksdagsradarnInputSchema,
  outputSchema: riksdagsradarnOutputSchema,

  async getFeaturedScenarios(): Promise<Scenario<RiksdagsradarnInput>[]> {
    return FEATURED_SCENARIOS;
  },

  async validateInput(input: RiksdagsradarnInput) {
    if (input.dateFrom > input.dateTo) {
      return {
        ok: false,
        errors: ["Startdatum måste vara före eller lika med slutdatum."],
      };
    }
    return { ok: true };
  },

  async run(
    input: RiksdagsradarnInput,
    ctx: DemoRunContext,
  ): Promise<RiksdagsradarnOutput> {
    return runRiksdagsradarnPipeline(input, {
      log: ctx.log,
      setProgress: ctx.setProgress,
    });
  },

  renderMeta(output) {
    return {
      title: `Riksdagsradarn: ${output.topic}`,
      summary: `${output.totalAnforanden} anföranden · ${output.partyPositions.length} partier · ${output.conflictLines.length} konfliktlinjer`,
    };
  },
};

export { FEATURED_SCENARIOS };
export * from "./schemas";
