import type { RiksdagHit } from "@/lib/retrieval/riksdag";

export const PROMPT_VERSIONS = {
  analyse: "v1",
} as const;

interface AnalysePromptInput {
  topic: string;
  dateFrom: string;
  dateTo: string;
  hitsByParty: Array<{ parti: string; hits: RiksdagHit[] }>;
}

export function analysePrompt(input: AnalysePromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are a careful political analyst summarising debates from the Swedish Riksdag (parliament).",
    "Operate in Swedish.",
    "Every claim you produce MUST cite at least one chunk by its CHUNK_ID. Never invent a chunk id.",
    "Distinguish four claim types:",
    " - empirical (factual claim about how things are)",
    " - normative (value judgment about how things should be)",
    " - critique (criticism of another actor or policy)",
    " - proposal (concrete suggestion or demand)",
    "Confidence is your read of how directly the chunk(s) support the claim:",
    " - high   = direct quote or near-paraphrase, multiple corroborating chunks",
    " - medium = one strong supporting chunk",
    " - low    = inference that goes beyond what the chunks explicitly say",
    "Do NOT invent positions for parties whose chunks you have not seen.",
    "Respond ONLY with JSON matching the schema given by the user. No prose, no markdown fences.",
  ].join("\n");

  const sections = input.hitsByParty
    .map((g) => {
      const lines = g.hits
        .map((h) => {
          const titleBits = [h.meta.dokDatum, h.meta.avsnittsrubrik]
            .filter(Boolean)
            .join(" · ");
          return `[CHUNK_ID=${h.chunkId} ${titleBits}] ${h.meta.talare} (${h.meta.parti}):\n${h.text}`;
        })
        .join("\n\n");
      return `### Party: ${g.parti}\n\n${lines}`;
    })
    .join("\n\n---\n\n");

  const user = [
    `Topic: ${input.topic}`,
    `Date range: ${input.dateFrom} to ${input.dateTo}`,
    "",
    "Retrieved chunks (grouped by speaking party):",
    "",
    sections,
    "",
    "Produce a JSON object with these keys:",
    "- partyPositions: array of { parti, summary (2–3 Swedish sentences characterising the party's overall stance on the topic, grounded in the chunks above), claims: array of { text, type, sourceChunkIds (CHUNK_ID values from above), confidence } }.",
    "  - Include a partyPosition only for parties present in the retrieved chunks.",
    "  - 3–6 claims per party. Skip parties with no substantive content.",
    "- conflictLines: array of 2–5 short Swedish strings naming the main lines of disagreement that emerge between parties. Empty array if no clear conflict.",
    "- summaries: { neutral, conflict, citizen } — three distinct Swedish summary paragraphs (~80–140 words each) of the same underlying material:",
    "  - neutral: factual overview, even-handed, no rhetorical leaning",
    "  - conflict: foregrounds where parties disagree, who is criticising whom",
    "  - citizen: what this debate means for an ordinary citizen / voter, in plain language",
    "Each summary may reference parties by name but must remain grounded in the retrieved chunks.",
  ].join("\n");

  return { system, user };
}
