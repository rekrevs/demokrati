import { z } from "zod";

export const PERSUASION_CHANNELS = [
  "kort-post",
  "sms",
  "epost",
  "flygblad",
] as const;
export type PersuasionChannel = (typeof PERSUASION_CHANNELS)[number];

export const persuasionmaskinenInputSchema = z.object({
  /** ID into the policy case library; the case provides full context. */
  policyCaseId: z.string().min(1).max(64),
  /** Profile IDs (3–5) to tailor for. */
  profileIds: z.array(z.string()).min(3).max(5),
  channel: z.enum(PERSUASION_CHANNELS),
});

export type PersuasionmaskinenInput = z.infer<
  typeof persuasionmaskinenInputSchema
>;

export const tailoredMessageSchema = z.object({
  profileId: z.string(),
  profileSummary: z.string(),
  text: z.string(),
  rhetoricalFrame: z.string(),
  changedLevers: z.array(z.string()),
  emotionalCore: z.string(),
});

export const persuasionmaskinenOutputSchema = z.object({
  policyCaseId: z.string(),
  policyCaseTitle: z.string(),
  channel: z.enum(PERSUASION_CHANNELS),
  genericMessage: z.string(),
  tailoredMessages: z.array(tailoredMessageSchema).min(1),
  /** A short skav-text shown at the end of the demo. */
  warningCard: z.object({
    title: z.string(),
    body: z.string(),
  }),
});

export type PersuasionmaskinenOutput = z.infer<
  typeof persuasionmaskinenOutputSchema
>;
export type TailoredMessage = z.infer<typeof tailoredMessageSchema>;

export const CHANNEL_LABELS: Record<PersuasionChannel, string> = {
  "kort-post": "Kort socialt inlägg (~80 ord)",
  sms: "SMS (~160 tecken)",
  epost: "E-post-utdrag (~140 ord)",
  flygblad: "Flygbladstext (~180 ord)",
};
