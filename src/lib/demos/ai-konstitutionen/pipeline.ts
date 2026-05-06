import { z } from "zod";
import { getRouter } from "@/lib/llm";
import {
  BASELINE_SYSTEM_PROMPT,
  PROMPT_VERSIONS,
  comparePrompt,
} from "./prompts";
import { compileConstitution } from "./rules";
import {
  aiKonstitutionenOutputSchema,
  type AiKonstitutionenInput,
  type AiKonstitutionenOutput,
} from "./schemas";

export interface PipelineDeps {
  log?: (event: string, data?: unknown) => void;
  setProgress?: (update: {
    phase: string;
    message: string;
    data?: Record<string, unknown>;
  }) => Promise<void>;
}

const compareSchema = z.object({
  observedChanges: z.array(z.string()),
  tradeoffs: z.array(
    z.object({
      axis: z.string(),
      direction: z.enum(["increased", "decreased", "unchanged"]),
      explanation: z.string(),
    }),
  ),
});

export async function runAiKonstitutionenPipeline(
  input: AiKonstitutionenInput,
  deps: PipelineDeps = {},
): Promise<AiKonstitutionenOutput> {
  const log = deps.log ?? (() => undefined);
  const setProgress = deps.setProgress ?? (async () => undefined);
  log("start", { question: input.question, ruleCount: input.ruleIds.length });

  const { systemText, matchedRules } = compileConstitution(input.ruleIds);
  const router = getRouter();

  // ── Pass 1: baseline answer ────────────────────────────────────────
  await setProgress({
    phase: "baseline",
    message: "Frågar en ostyrd assistent…",
  });
  const baselineRes = await router.text("strong", {
    system: BASELINE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: input.question }],
    temperature: 0.4,
    maxTokens: 1500,
  });
  log("baseline_done", { tokens: baselineRes.usage });

  // ── Pass 2: governed answer ────────────────────────────────────────
  await setProgress({
    phase: "governed",
    message: `Frågar samma assistent under ${matchedRules.length} valda regler…`,
    data: { ruleCount: matchedRules.length },
  });
  const governedRes = await router.text("strong", {
    system: systemText,
    messages: [{ role: "user", content: input.question }],
    temperature: 0.4,
    maxTokens: 1500,
  });
  log("governed_done", { tokens: governedRes.usage });

  // ── Pass 3: compare ────────────────────────────────────────────────
  await setProgress({
    phase: "comparing",
    message: "Jämför svaren och identifierar trade-offs…",
  });
  const cmpArgs = comparePrompt({
    question: input.question,
    baselineAnswer: baselineRes.text,
    governedAnswer: governedRes.text,
    ruleLabels: matchedRules.map((r) => r.label),
  });
  const cmpRes = await router.json(
    "strong",
    {
      system: cmpArgs.system,
      messages: [{ role: "user", content: cmpArgs.user }],
      temperature: 0.2,
      maxTokens: 2500,
    },
    compareSchema,
  );
  log("compared", {
    changes: cmpRes.data.observedChanges.length,
    tradeoffs: cmpRes.data.tradeoffs.length,
  });

  return aiKonstitutionenOutputSchema.parse({
    question: input.question,
    selectedRuleIds: matchedRules.map((r) => r.id),
    appliedRules: matchedRules.map((r) => ({ id: r.id, label: r.label })),
    compiledSystemPrompt: systemText,
    baselineAnswer: baselineRes.text,
    governedAnswer: governedRes.text,
    observedChanges: cmpRes.data.observedChanges,
    tradeoffs: cmpRes.data.tradeoffs,
  });
}

export { PROMPT_VERSIONS };
