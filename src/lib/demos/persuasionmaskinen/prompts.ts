import type { PersuasionChannel } from "./schemas";
import type { PolicyCase, SyntheticProfile } from "./library";

export const PROMPT_VERSIONS = {
  generate: "v1",
} as const;

const CHANNEL_DIRECTIVES: Record<PersuasionChannel, string> = {
  "kort-post": "ett socialt inlägg på 60–90 ord, en stark öppningsmening",
  sms: "ett SMS på cirka 140–160 tecken",
  epost: "ett e-post-utdrag på 100–140 ord (ämnesrad + brödtext)",
  flygblad: "en flygbladstext på 140–200 ord (rubrik + 2–3 stycken)",
};

interface GeneratePromptInput {
  policyCase: PolicyCase;
  channel: PersuasionChannel;
  profiles: SyntheticProfile[];
}

/**
 * Single-call: produce a generic version + tailored versions for each
 * profile + per-version analysis of the rhetorical levers used.
 *
 * Note: this prompt deliberately does NOT instruct the model to
 * persuade — it instructs it to produce text that ILLUSTRATES how
 * tailored persuasion works. The framing matters; the demo's whole
 * value lies in showing the asymmetry, not in being a campaign tool.
 */
export function generatePrompt(input: GeneratePromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are producing didactic example messages for an educational demo about AI-driven personalised political communication.",
    "Operate in Swedish.",
    "All profiles are SYNTHETIC and clearly labelled as such; the policy case is FICTIONAL.",
    "Your job is to make the structural mechanism visible: how the SAME policy proposal is framed differently for different audiences.",
    "Include a clear didactic note in the warningCard at the end about the risks this demonstrates.",
    "Do NOT include any real party names, real candidates, real political slogans, or distribution instructions.",
    "Do NOT optimise for conversion. Optimise for instructive contrast.",
    "Respond ONLY with JSON matching the schema in the user message. No prose, no markdown fences.",
  ].join("\n");

  const profileBlocks = input.profiles
    .map((p) => {
      return [
        `- id: ${p.id}`,
        `  label: ${p.label}`,
        `  age: ${p.ageBand}`,
        `  municipality: ${p.municipalityType}`,
        `  occupation: ${p.occupation}`,
        `  interests: ${p.interests.join(", ")}`,
        `  concerns: ${p.concerns.join(", ")}`,
        `  political_priority: ${p.politicalPriority}`,
        `  media_habits: ${p.mediaHabits.join(", ")}`,
      ].join("\n");
    })
    .join("\n\n");

  const user = [
    `Policy case (FICTIONAL): ${input.policyCase.title}`,
    "",
    "Fact sheet:",
    input.policyCase.factSheet,
    "",
    `Channel: ${input.channel} (${CHANNEL_DIRECTIVES[input.channel]})`,
    "",
    "Synthetic profiles to tailor for:",
    profileBlocks,
    "",
    "Produce a JSON object with exactly this shape:",
    "{",
    '  "genericMessage": string  // a SINGLE neutral, public version of the message — same channel format, no personalisation',
    '  "tailoredMessages": [',
    "    {",
    '      "profileId": string  // matches one of the profile ids',
    '      "profileSummary": string  // ~25 words restating who this profile is',
    '      "text": string  // the tailored message, in Swedish, in the requested channel format',
    '      "rhetoricalFrame": string  // 1 short sentence naming the framing used',
    '      "changedLevers": [string, ...]  // 2–4 short labels for what was tuned (e.g. "skärpt riskbild", "mjukare ton", "ekonomisk vinkel", "lokal förankring")',
    '      "emotionalCore": string  // 1 short sentence naming the emotional appeal at the centre',
    "    }",
    "    // one entry per provided profile, in input order",
    "  ],",
    '  "warningCard": {',
    '    "title": string  // short Swedish title, e.g. "Det här är ett skavmoment"',
    '    "body": string   // 80–140 word Swedish text describing what risks the demo illustrates and what motmedel exist (transparens, annonsspårbarhet, plattformsansvar, journalistisk granskning). NO instructions for how to use this for real influence.',
    "  }",
    "}",
  ].join("\n");

  return { system, user };
}
