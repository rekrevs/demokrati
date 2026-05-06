import {
  AUDIENCE_LABELS,
  type OppenhetAudience,
} from "./schemas";

export const PROMPT_VERSIONS = {
  transform: "v1",
} as const;

const AUDIENCE_DIRECTIVES: Record<OppenhetAudience, string> = {
  civic:
    "Skriv en medborgarversion: vardagsspråk, neutral ton, behåll kärninnehållet. Cirka 120–180 ord.",
  youth:
    "Skriv en ungdomsversion riktad till en 15-åring: konkret, relaterbar, undvik politisk jargong. Cirka 120–180 ord.",
  plain:
    "Skriv på lätt svenska: korta meningar, vanliga ord, en idé per mening. Cirka 80–140 ord.",
  "social-card":
    "Skriv ett kort sociala medier-inlägg (ungefär 60–80 ord) med en stark ingress.",
  "headline-lead":
    "Skriv en tidningsrubrik (max 80 tecken) + en sammanfattande ingress (40–60 ord).",
};

interface TransformPromptInput {
  sourceTitle: string;
  originalText: string;
  audiences: OppenhetAudience[];
}

/**
 * Single-call: produce all chosen audience versions AND diff each
 * against the original on the proposition level. Compact JSON output
 * keeps the call within token budget.
 */
export function transformPrompt(input: TransformPromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are a careful Swedish-language plain-language editor and analyst.",
    "Given an original Swedish decision text and a set of target audiences, produce one transformed version per audience.",
    "For EACH version you also report concrete proposition-level diffs against the original.",
    "Diff types you may use:",
    " - dropped_condition: a precondition or qualifying clause was removed",
    " - dropped_exception: a stated exception was removed",
    " - changed_actor: subject of an obligation/permission shifted (e.g., 'kommun' → 'staten' or vice versa)",
    " - changed_modality: 'ska' became 'bör' or 'kan', or the other way",
    " - simplified_threshold: a numeric threshold or boundary was rounded or removed",
    " - added_emphasis: rhetorical framing was added that wasn't in the original",
    " - lost_specificity: a specific category became a generic one",
    "Severity: 'low' = stylistic; 'medium' = changes how a reader would act; 'high' = changes legal substance.",
    "Do NOT pretend to be a lawyer or claim juridisk expertis. We are tracking textual shifts, not making legal judgements.",
    "Operate in Swedish for the version texts and Swedish for the diff messages.",
    "Respond ONLY with JSON matching the schema in the user message. No prose, no markdown fences.",
  ].join("\n");

  const audienceList = input.audiences
    .map(
      (a) =>
        `  - ${a} (${AUDIENCE_LABELS[a]}): ${AUDIENCE_DIRECTIVES[a]}`,
    )
    .join("\n");

  const user = [
    `Source title: ${input.sourceTitle}`,
    "",
    "Original Swedish text:",
    input.originalText,
    "",
    "Audiences to produce:",
    audienceList,
    "",
    "Produce a JSON object with exactly this shape:",
    "{",
    '  "versions": [',
    "    {",
    '      "audience": <one of the audience codes above>,',
    '      "text": string  // the transformed text',
    '      "audienceNote": string  // ~40 word Swedish description of who this version is for',
    '      "diffs": [',
    "        {",
    '          "type": "dropped_condition" | "dropped_exception" | "changed_actor" | "changed_modality" | "simplified_threshold" | "added_emphasis" | "lost_specificity",',
    '          "severity": "low" | "medium" | "high",',
    '          "message": string  // 1 Swedish sentence (max 200 chars) explaining what shifted',
    '          "originalExcerpt": string  // <= 200 chars verbatim from original',
    '          "transformedExcerpt": string  // <= 200 chars verbatim from the transformed version',
    "        }",
    "        // 0–6 diffs per version, only ones you can ground in literal excerpts from BOTH texts",
    "      ],",
    '      "shiftSummary": string  // 1–2 Swedish sentences summarising what changed in this version',
    "    }",
    "    // one entry per requested audience, in the order listed above",
    "  ]",
    "}",
    "",
    "Be honest: if a version is faithful to the original, return diffs: [] and shiftSummary noting the fidelity.",
  ].join("\n");

  return { system, user };
}
