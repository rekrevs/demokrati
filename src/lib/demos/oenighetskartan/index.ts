import type { DemoModule, DemoRunContext, Scenario } from "../module";
import { PROMPT_VERSIONS, runOenighetskartanPipeline } from "./pipeline";
import { FEATURED_SCENARIOS } from "./scenarios";
import {
  oenighetskartanInputSchema,
  oenighetskartanOutputSchema,
  type OenighetskartanInput,
  type OenighetskartanOutput,
} from "./schemas";

export const OENIGHETSKARTAN_ID = "oenighetskartan";

export const oenighetskartan: DemoModule<
  OenighetskartanInput,
  OenighetskartanOutput
> = {
  id: OENIGHETSKARTAN_ID,
  title: "Oenighetskartan",
  visibility: "public",
  supportsLive: true,
  supportsCustomInput: true,
  riskLevel: "low",
  cacheTTLSeconds: 24 * 3_600,
  promptVersions: { ...PROMPT_VERSIONS },
  modelProfile: "strong",

  inputSchema: oenighetskartanInputSchema,
  outputSchema: oenighetskartanOutputSchema,

  async getFeaturedScenarios(): Promise<Scenario<OenighetskartanInput>[]> {
    return FEATURED_SCENARIOS;
  },

  async validateInput(input: OenighetskartanInput) {
    const ids = new Set<string>();
    for (const s of input.statements) {
      if (ids.has(s.id)) {
        return {
          ok: false,
          errors: [`Påstående-ID ${s.id} förekommer flera gånger.`],
        };
      }
      ids.add(s.id);
    }
    return { ok: true };
  },

  async run(
    input: OenighetskartanInput,
    ctx: DemoRunContext,
  ): Promise<OenighetskartanOutput> {
    return runOenighetskartanPipeline(input, {
      log: ctx.log,
      setProgress: ctx.setProgress,
    });
  },

  renderMeta(output) {
    return {
      title: `Oenighetskartan: ${output.topic}`,
      summary: `${output.totalStatements} påståenden · ${output.dimensions.length} dimensioner · ${output.clusters.length} kluster`,
    };
  },
};

export { FEATURED_SCENARIOS };
export * from "./schemas";
