import type { ProgramHit } from "./retrieval";

export const PROMPT_VERSIONS = {
  stance: "v1",
  simplification: "v1",
} as const;

interface StancePromptInput {
  party: string;
  questionText: string;
  hits: ProgramHit[];
}

/**
 * Per-party stance extraction. Reads the party's relevant programme
 * chunks and decides where on the 1–5 scale they sit, with evidence.
 */
export function stancePrompt(input: StancePromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are a careful Swedish-language analyst extracting a party's stance on a specific yes-no policy question from that party's own published programme/manifesto text.",
    "Operate in Swedish for output.",
    "Distinguish between what the programme directly says vs what is inferred — confidence should reflect this.",
    "If the chunks do not address the question at all, return stance 3 (oklart), confidence 'low', noCoverage false (we have programme text, just not on this topic).",
    "Cite verbatim quotes — do not paraphrase in the evidence list.",
    "Respond ONLY with JSON matching the schema in the user message. No prose, no markdown fences.",
  ].join("\n");

  const chunks = input.hits
    .map(
      (h) =>
        `[CHUNK_ID=${h.chunkId} ${h.documentType} ${h.year ?? "?"}] ${h.text}`,
    )
    .join("\n\n");

  const user = [
    `Party: ${input.party}`,
    `Question: ${input.questionText}`,
    "",
    "Relevant chunks from the party's own programme/manifesto text:",
    "",
    chunks,
    "",
    "Produce a JSON object with exactly this shape:",
    "{",
    '  "stance": 1 | 2 | 3 | 4 | 5,   // 1 = stark motståndare, 2 = motståndare med reservationer, 3 = oklart/blandat, 4 = förespråkare med reservationer, 5 = stark förespråkare',
    '  "summary": string,             // 1–2 Swedish sentences (max 280 chars) characterising the party\'s position',
    '  "confidence": "low" | "medium" | "high",   // how clearly the chunks express this — high = direct statement, low = inference from indirect material',
    '  "evidence": [',
    "    {",
    '      "quote": string,           // verbatim short excerpt (max 200 chars) from one of the chunks above',
    '      "chunkId": string          // the CHUNK_ID it came from',
    "    }",
    "    // 1–4 evidence items",
    "  ]",
    "}",
    "",
    "Honest 'oklart/blandat' (stance 3, confidence low) is the right answer when the chunks don't directly address the question.",
  ].join("\n");

  return { system, user };
}

interface SimplificationPromptInput {
  questionText: string;
}

export function simplificationPrompt(input: SimplificationPromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are reviewing a yes/no policy question used in a Swedish 'valkompass'-style demo.",
    "Your job is to write a single Swedish sentence noting what such a question necessarily simplifies (e.g., it forces a binary stance on something multidimensional, it ignores trade-offs, it presupposes a particular framing).",
    "Operate in Swedish.",
    "Respond ONLY with JSON matching the schema in the user message. No prose, no markdown fences.",
  ].join("\n");

  const user = [
    `Question: ${input.questionText}`,
    "",
    "Produce a JSON object with exactly this shape:",
    '{ "simplificationNote": string }   // 1 Swedish sentence (max 240 chars)',
  ].join("\n");

  return { system, user };
}
