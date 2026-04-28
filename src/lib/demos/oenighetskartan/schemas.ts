import { z } from "zod";

export const OENIGHETSKARTAN_TABS = ["map", "deliberation"] as const;
export type OenighetskartanTab = (typeof OENIGHETSKARTAN_TABS)[number];

export const oenighetskartanInputSchema = z.object({
  /** Short Swedish framing of the issue. */
  topic: z
    .string()
    .trim()
    .min(8, "Frågan måste vara minst 8 tecken")
    .max(280, "Frågan får inte vara längre än 280 tecken"),
  /** Curated or user-supplied set of statements. 5–25 items. */
  statements: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        text: z
          .string()
          .trim()
          .min(10, "Påståendet måste vara minst 10 tecken")
          .max(800, "Påståendet får inte vara längre än 800 tecken"),
      }),
    )
    .min(5, "Behöver minst 5 påståenden för meningsfull analys")
    .max(25, "Högst 25 påståenden per körning"),
});

export type OenighetskartanInput = z.infer<typeof oenighetskartanInputSchema>;

export const dimensionSchema = z.object({
  id: z.string(),
  /** Pole label for the negative end of the axis. */
  leftLabel: z.string(),
  /** Pole label for the positive end. */
  rightLabel: z.string(),
  /** 1–2 sentences explaining what this dimension captures. */
  description: z.string(),
  /**
   * IDs of statements that strongly express either pole.
   * Used as evidence in the dimension picker UI.
   */
  evidenceStatementIds: z.array(z.string()),
});

export const clusterSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  memberStatementIds: z.array(z.string()),
});

export const pointSchema = z.object({
  statementId: z.string(),
  text: z.string(),
  clusterId: z.string(),
  /**
   * Score of the statement on each dimension. Range: -1..+1.
   * Keys are dimension IDs.
   */
  scores: z.record(z.string(), z.number().min(-1).max(1)),
});

export const contestedTermSchema = z.object({
  term: z.string(),
  meanings: z.array(z.string()).min(2),
});

export const oenighetskartanOutputSchema = z.object({
  topic: z.string(),
  totalStatements: z.number().int().min(0),
  /** 3–6 inferred axes that explain variance in the corpus. */
  dimensions: z.array(dimensionSchema).min(0),
  /** 2–4 thematic groupings of statements. */
  clusters: z.array(clusterSchema),
  /** One point per input statement, ordered to match input. */
  points: z.array(pointSchema),
  /** Things the participants seem to agree on. */
  sharedPremises: z.array(z.string()),
  /** Disagreements that could in principle be settled by evidence. */
  empiricalDisagreements: z.array(z.string()),
  /** Disagreements rooted in different values that no fact will resolve. */
  valueConflicts: z.array(z.string()),
  /** Words used in different senses by different participants. */
  contestedTerms: z.array(contestedTermSchema),
  /** A reformulated, sharper question to discuss next. */
  nextBetterQuestion: z.string(),
  emptyResult: z.boolean(),
});

export type OenighetskartanOutput = z.infer<typeof oenighetskartanOutputSchema>;
export type OenighetskartanDimension = z.infer<typeof dimensionSchema>;
export type OenighetskartanCluster = z.infer<typeof clusterSchema>;
export type OenighetskartanPoint = z.infer<typeof pointSchema>;
export type OenighetskartanContestedTerm = z.infer<typeof contestedTermSchema>;
