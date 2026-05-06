import type { DemoModule, DemoRunContext, Scenario } from "../module";
import {
  PROMPT_VERSIONS,
  runOppenhetsparadoxenPipeline,
} from "./pipeline";
import { FEATURED_SCENARIOS } from "./scenarios";
import {
  oppenhetsparadoxenInputSchema,
  oppenhetsparadoxenOutputSchema,
  type OppenhetsparadoxenInput,
  type OppenhetsparadoxenOutput,
} from "./schemas";

export const OPPENHETSPARADOXEN_ID = "oppenhetsparadoxen";

export const oppenhetsparadoxen: DemoModule<
  OppenhetsparadoxenInput,
  OppenhetsparadoxenOutput
> = {
  id: OPPENHETSPARADOXEN_ID,
  title: "Öppenhetsparadoxen",
  visibility: "public",
  supportsLive: true,
  supportsCustomInput: true,
  riskLevel: "low",
  cacheTTLSeconds: 24 * 3_600,
  promptVersions: { ...PROMPT_VERSIONS },
  modelProfile: "strong",

  inputSchema: oppenhetsparadoxenInputSchema,
  outputSchema: oppenhetsparadoxenOutputSchema,

  async getFeaturedScenarios(): Promise<
    Scenario<OppenhetsparadoxenInput>[]
  > {
    return FEATURED_SCENARIOS;
  },

  async validateInput() {
    return { ok: true };
  },

  async run(
    input: OppenhetsparadoxenInput,
    ctx: DemoRunContext,
  ): Promise<OppenhetsparadoxenOutput> {
    return runOppenhetsparadoxenPipeline(input, {
      log: ctx.log,
      setProgress: ctx.setProgress,
    });
  },

  renderMeta(output) {
    return {
      title: `Öppenhetsparadoxen: ${output.sourceTitle}`,
      summary: `${output.versions.length} versioner · ${output.versions.reduce((s, v) => s + v.diffs.length, 0)} betydelseförskjutningar`,
    };
  },
};

export { FEATURED_SCENARIOS };
export * from "./schemas";
