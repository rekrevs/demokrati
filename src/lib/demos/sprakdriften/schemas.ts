import { z } from "zod";

export const SPRAKDRIFTEN_LANGUAGES = [
  "sv",
  "en",
  "ar",
  "fi",
  "es",
  "de",
] as const;
export type SprakdriftenLanguage = (typeof SPRAKDRIFTEN_LANGUAGES)[number];

export const SPRAKDRIFTEN_STYLES = ["overview", "policy", "pros-and-cons"] as const;
export type SprakdriftenStyle = (typeof SPRAKDRIFTEN_STYLES)[number];

/**
 * Tone labels the comparison-step LLM must pick from. Small, orthogonal
 * set chosen for political/policy text. These are LLM-assigned heuristic
 * labels — not measurements. See docs/demos/sprakdriften.md.
 */
export const SPRAKDRIFTEN_TONES = [
  "informative",
  "analytical",
  "balanced",
  "cautious",
  "assertive",
  "advocating",
] as const;
export type SprakdriftenTone = (typeof SPRAKDRIFTEN_TONES)[number];

/**
 * Certainty level is a heuristic assessment of how confidently the answer
 * text itself speaks, derived from the comparison-step LLM's reading:
 *   - high   — mostly direct claims, few hedges
 *   - medium — mix of claims and qualifiers
 *   - low    — pervasively hedged
 * It is NOT the model's epistemic confidence about the content.
 */
export const SPRAKDRIFTEN_CERTAINTIES = ["low", "medium", "high"] as const;
export type SprakdriftenCertainty = (typeof SPRAKDRIFTEN_CERTAINTIES)[number];

export const sprakdriftenInputSchema = z.object({
  /** Canonical Swedish question. */
  questionSv: z
    .string()
    .trim()
    .min(8, "Frågan måste vara minst 8 tecken")
    .max(500, "Frågan får inte vara längre än 500 tecken"),
  languages: z
    .array(z.enum(SPRAKDRIFTEN_LANGUAGES))
    .min(2, "Välj minst två språk att jämföra")
    .max(6, "Högst sex språk per körning"),
  style: z.enum(SPRAKDRIFTEN_STYLES),
});

export const DEFAULT_SPRAKDRIFTEN_STYLE: SprakdriftenStyle = "overview";

export type SprakdriftenInput = z.infer<typeof sprakdriftenInputSchema>;

export const sprakdriftenAnswerSchema = z.object({
  language: z.enum(SPRAKDRIFTEN_LANGUAGES),
  /** The Swedish question rendered into the target language. */
  questionInTarget: z.string(),
  /** Answer produced by the model in the target language, before back-translation. */
  answerOriginal: z.string(),
  /** Answer back-translated into Swedish (canonical Swedish rendering). */
  answerSv: z.string(),
  tone: z.enum(SPRAKDRIFTEN_TONES),
  framing: z.array(z.string()),
  institutionsMentioned: z.array(z.string()),
  certaintyLevel: z.enum(SPRAKDRIFTEN_CERTAINTIES),
});

export const sprakdriftenDifferenceSchema = z.object({
  dimension: z.string(),
  description: z.string(),
  evidence: z
    .array(
      z.object({
        language: z.enum(SPRAKDRIFTEN_LANGUAGES),
        quote: z.string(),
      }),
    )
    .min(1),
});

export const sprakdriftenOutputSchema = z.object({
  canonicalQuestionSv: z.string(),
  style: z.enum(SPRAKDRIFTEN_STYLES),
  answers: z.array(sprakdriftenAnswerSchema).min(2),
  observedDifferences: z.array(sprakdriftenDifferenceSchema),
  /** Variation index used for ordering; NOT exposed to users as a scientific measure. */
  internalVariationIndex: z.number().min(0).max(1),
});

export type SprakdriftenOutput = z.infer<typeof sprakdriftenOutputSchema>;
export type SprakdriftenAnswer = z.infer<typeof sprakdriftenAnswerSchema>;
export type SprakdriftenDifference = z.infer<typeof sprakdriftenDifferenceSchema>;

export const LANGUAGE_LABELS: Record<SprakdriftenLanguage, { sv: string; en: string; native: string }> = {
  sv: { sv: "Svenska", en: "Swedish", native: "Svenska" },
  en: { sv: "Engelska", en: "English", native: "English" },
  ar: { sv: "Arabiska", en: "Arabic", native: "العربية" },
  fi: { sv: "Finska", en: "Finnish", native: "Suomi" },
  es: { sv: "Spanska", en: "Spanish", native: "Español" },
  de: { sv: "Tyska", en: "German", native: "Deutsch" },
};

export const RTL_LANGUAGES: ReadonlySet<SprakdriftenLanguage> = new Set(["ar"]);
