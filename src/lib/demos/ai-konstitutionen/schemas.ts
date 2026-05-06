import { z } from "zod";

export const aiKonstitutionenInputSchema = z.object({
  /** Political question to ask both baseline and governed assistants. */
  question: z
    .string()
    .trim()
    .min(8, "Frågan måste vara minst 8 tecken")
    .max(400, "Frågan får inte vara längre än 400 tecken"),
  /** Selected rule IDs (empty = baseline-only run, but we always run both). */
  ruleIds: z
    .array(z.string())
    .min(0)
    .max(20),
});

export type AiKonstitutionenInput = z.infer<typeof aiKonstitutionenInputSchema>;

export const tradeoffAxisSchema = z.object({
  /** e.g. "pluralism", "tydlighet", "neutralitet", "handlingskraft" */
  axis: z.string(),
  /** "increased" | "decreased" | "unchanged" */
  direction: z.enum(["increased", "decreased", "unchanged"]),
  /** Short explanatory sentence. */
  explanation: z.string(),
});

export const aiKonstitutionenOutputSchema = z.object({
  question: z.string(),
  selectedRuleIds: z.array(z.string()),
  /** Resolved rule labels in the order they were applied. */
  appliedRules: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    }),
  ),
  /** The actual system prompt text that was sent to the governed model. */
  compiledSystemPrompt: z.string(),
  baselineAnswer: z.string(),
  governedAnswer: z.string(),
  /** 3–6 short Swedish strings describing what shifted between baseline and governed. */
  observedChanges: z.array(z.string()),
  /** Trade-off radar entries — each axis shows direction + short why. */
  tradeoffs: z.array(tradeoffAxisSchema),
});

export type AiKonstitutionenOutput = z.infer<
  typeof aiKonstitutionenOutputSchema
>;
export type TradeoffAxis = z.infer<typeof tradeoffAxisSchema>;
