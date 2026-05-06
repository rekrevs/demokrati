import type { DemoModule, DemoRunContext, Scenario } from "../module";
import { POLICY_CASES, PROFILES } from "./library";
import {
  PROMPT_VERSIONS,
  runPersuasionmaskinenPipeline,
} from "./pipeline";
import { FEATURED_SCENARIOS } from "./scenarios";
import {
  persuasionmaskinenInputSchema,
  persuasionmaskinenOutputSchema,
  type PersuasionmaskinenInput,
  type PersuasionmaskinenOutput,
} from "./schemas";

export const PERSUASIONMASKINEN_ID = "persuasionmaskinen";

export const persuasionmaskinen: DemoModule<
  PersuasionmaskinenInput,
  PersuasionmaskinenOutput
> = {
  id: PERSUASIONMASKINEN_ID,
  title: "Persuasionmaskinen",
  visibility: "public",
  supportsLive: true,
  supportsCustomInput: true,
  // Higher than the others — risk demo. Abuse protection still applies
  // (rate limit + admin auth on /ops + capped daily cost).
  riskLevel: "high",
  cacheTTLSeconds: 24 * 3_600,
  promptVersions: { ...PROMPT_VERSIONS },
  modelProfile: "strong",

  inputSchema: persuasionmaskinenInputSchema,
  outputSchema: persuasionmaskinenOutputSchema,

  async getFeaturedScenarios(): Promise<
    Scenario<PersuasionmaskinenInput>[]
  > {
    return FEATURED_SCENARIOS;
  },

  async validateInput(input: PersuasionmaskinenInput) {
    const errors: string[] = [];
    if (!POLICY_CASES.some((c) => c.id === input.policyCaseId)) {
      errors.push(`Okänt policy-case: ${input.policyCaseId}`);
    }
    const profileIds = new Set(PROFILES.map((p) => p.id));
    const unknown = input.profileIds.filter((id) => !profileIds.has(id));
    if (unknown.length > 0) {
      errors.push(`Okända profil-ID: ${unknown.join(", ")}`);
    }
    if (errors.length > 0) return { ok: false, errors };
    return { ok: true };
  },

  async run(
    input: PersuasionmaskinenInput,
    ctx: DemoRunContext,
  ): Promise<PersuasionmaskinenOutput> {
    return runPersuasionmaskinenPipeline(input, {
      log: ctx.log,
      setProgress: ctx.setProgress,
    });
  },

  renderMeta(output) {
    return {
      title: `Persuasionmaskinen: ${output.policyCaseTitle}`,
      summary: `${output.tailoredMessages.length} skräddarsydda budskap (kanal: ${output.channel})`,
    };
  },
};

export { FEATURED_SCENARIOS, POLICY_CASES, PROFILES };
export * from "./schemas";
