import { z } from "zod";

export const OPPENHET_AUDIENCES = [
  "civic",
  "youth",
  "plain",
  "social-card",
  "headline-lead",
] as const;
export type OppenhetAudience = (typeof OPPENHET_AUDIENCES)[number];

export const OPPENHET_DIFF_TYPES = [
  "dropped_condition",
  "dropped_exception",
  "changed_actor",
  "changed_modality",
  "simplified_threshold",
  "added_emphasis",
  "lost_specificity",
] as const;
export type OppenhetDiffType = (typeof OPPENHET_DIFF_TYPES)[number];

export const OPPENHET_SEVERITIES = ["low", "medium", "high"] as const;

export const oppenhetsparadoxenInputSchema = z.object({
  /** Title shown in the UI (e.g. "Beslut om reduktionsplikt"). */
  sourceTitle: z.string().trim().min(3).max(160),
  /** The original decision text. Up to ~6000 chars. */
  originalText: z.string().trim().min(80).max(6000),
  /** Which audience versions to produce. */
  audiences: z
    .array(z.enum(OPPENHET_AUDIENCES))
    .min(1, "Välj minst en målgrupp")
    .max(OPPENHET_AUDIENCES.length),
});

export type OppenhetsparadoxenInput = z.infer<
  typeof oppenhetsparadoxenInputSchema
>;

export const propositionDiffSchema = z.object({
  type: z.enum(OPPENHET_DIFF_TYPES),
  severity: z.enum(OPPENHET_SEVERITIES),
  message: z.string(),
  originalExcerpt: z.string(),
  transformedExcerpt: z.string(),
});

export const audienceVersionSchema = z.object({
  audience: z.enum(OPPENHET_AUDIENCES),
  text: z.string(),
  /** 60-word reading-pitch summary of who this version is for. */
  audienceNote: z.string(),
  diffs: z.array(propositionDiffSchema),
  /** 1–2 sentences summarising the meaning shifts. */
  shiftSummary: z.string(),
});

export const oppenhetsparadoxenOutputSchema = z.object({
  sourceTitle: z.string(),
  originalText: z.string(),
  versions: z.array(audienceVersionSchema).min(1),
});

export type OppenhetsparadoxenOutput = z.infer<
  typeof oppenhetsparadoxenOutputSchema
>;
export type AudienceVersion = z.infer<typeof audienceVersionSchema>;
export type PropositionDiff = z.infer<typeof propositionDiffSchema>;

export const AUDIENCE_LABELS: Record<OppenhetAudience, string> = {
  civic: "Medborgarversion",
  youth: "Ungdomsversion (15 år)",
  plain: "Lätt svenska",
  "social-card": "Sociala medier-kort",
  "headline-lead": "Rubrik + ingress",
};

export const DIFF_TYPE_LABELS: Record<OppenhetDiffType, string> = {
  dropped_condition: "Bortfallet villkor",
  dropped_exception: "Bortfallen undantag",
  changed_actor: "Ändrad aktör",
  changed_modality: "Ändrad styrkegrad",
  simplified_threshold: "Förenklat tröskelvärde",
  added_emphasis: "Tillagd betoning",
  lost_specificity: "Förlorad precision",
};
