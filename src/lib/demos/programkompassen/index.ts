import type { DemoModule, DemoRunContext, Scenario } from "../module";
import { findQuestion, QUESTIONS } from "./questions";
import {
  PROMPT_VERSIONS,
  runProgramkompassenPipeline,
} from "./pipeline";
import { FEATURED_SCENARIOS } from "./scenarios";
import {
  PARTY_CODES,
  programkompassenInputSchema,
  programkompassenOutputSchema,
  type ProgramkompassenInput,
  type ProgramkompassenOutput,
} from "./schemas";

export const PROGRAMKOMPASSEN_ID = "programkompassen";

export const programkompassen: DemoModule<
  ProgramkompassenInput,
  ProgramkompassenOutput
> = {
  id: PROGRAMKOMPASSEN_ID,
  title: "Programkompassen",
  visibility: "public",
  supportsLive: true,
  supportsCustomInput: true,
  riskLevel: "low",
  cacheTTLSeconds: 24 * 3_600,
  promptVersions: { ...PROMPT_VERSIONS },
  modelProfile: "strong+embedding",

  inputSchema: programkompassenInputSchema,
  outputSchema: programkompassenOutputSchema,

  async getFeaturedScenarios(): Promise<
    Scenario<ProgramkompassenInput>[]
  > {
    return FEATURED_SCENARIOS;
  },

  async validateInput(input: ProgramkompassenInput) {
    const question = findQuestion(input.questionId);
    if (!question) {
      return {
        ok: false,
        errors: [`Okänt fråge-ID: ${input.questionId}`],
      };
    }
    const known = new Set(PARTY_CODES);
    const unknown = input.parties.filter((p) => !known.has(p));
    if (unknown.length > 0) {
      return {
        ok: false,
        errors: [`Okända partikoder: ${unknown.join(", ")}`],
      };
    }
    return { ok: true };
  },

  async run(
    input: ProgramkompassenInput,
    ctx: DemoRunContext,
  ): Promise<ProgramkompassenOutput> {
    return runProgramkompassenPipeline(input, {
      log: ctx.log,
      setProgress: ctx.setProgress,
    });
  },

  renderMeta(output) {
    const covered = output.parties.filter((p) => !p.noCoverage).length;
    return {
      title: `Programkompassen: ${output.questionText}`,
      summary: `${covered}/${output.parties.length} partier täcks i indexet`,
    };
  },
};

export { FEATURED_SCENARIOS, QUESTIONS };
export * from "./schemas";
