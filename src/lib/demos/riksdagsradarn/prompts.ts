import type { RiksdagHit } from "@/lib/retrieval/riksdag";

export const PROMPT_VERSIONS = {
  claims: "v2",
  narratives: "v2",
} as const;

interface ClaimsPromptInput {
  topic: string;
  dateFrom: string;
  dateTo: string;
  hitsByParty: Array<{ parti: string; hits: RiksdagHit[] }>;
}

/**
 * Pass 1 — claim extraction. Pure structural analysis grounded in the
 * retrieved chunks. Narrative work is intentionally excluded so the
 * output stays compact enough to fit within the token budget.
 */
export function claimsPrompt(input: ClaimsPromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are a careful political analyst extracting structured claims from speeches in the Swedish Riksdag (parliament).",
    "Operate in Swedish.",
    "Every claim MUST cite at least one chunk by its CHUNK_ID. Never invent a chunk id.",
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
    "Be CONCISE. Cap each party at 4 claims. Cap claim text at 250 characters.",
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
    "Produce a JSON object with exactly this shape:",
    "{",
    '  "partyPositions": [',
    "    {",
    '      "parti": string,',
    '      "summary": string,  // 2 concise Swedish sentences (max 280 chars total) characterising the party\'s overall stance',
    '      "claims": [',
    "        {",
    '          "text": string,  // max 250 chars',
    '          "type": "empirical" | "normative" | "critique" | "proposal",',
    '          "sourceChunkIds": [CHUNK_ID, ...],',
    '          "confidence": "low" | "medium" | "high"',
    "        }",
    "        // 0–4 per party",
    "      ]",
    "    }",
    "  ]",
    "}",
    "",
    "Skip parties with no substantive content. Be concise.",
  ].join("\n");

  return { system, user };
}

interface NarrativesPromptInput {
  topic: string;
  dateFrom: string;
  dateTo: string;
  partyPositions: Array<{
    parti: string;
    summary: string;
    claimCount: number;
  }>;
}

/**
 * Pass 2 — synthesise conflict lines and three narrative regimes from
 * the party positions produced in pass 1. No chunks needed; we read
 * only the per-party summaries.
 */
export function narrativesPrompt(input: NarrativesPromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are a Swedish political analyst summarising a parliamentary debate.",
    "You will receive concise per-party stance summaries. Identify the disagreement structure and produce three different narrative angles on the same underlying material.",
    "Operate in Swedish.",
    "Respond ONLY with JSON matching the schema given by the user. No prose, no markdown fences.",
  ].join("\n");

  const positions = input.partyPositions
    .map(
      (p) =>
        `- ${p.parti}: ${p.summary} (${p.claimCount} stödjande påståenden)`,
    )
    .join("\n");

  const user = [
    `Topic: ${input.topic}`,
    `Date range: ${input.dateFrom} to ${input.dateTo}`,
    "",
    "Party positions identified in this debate:",
    positions,
    "",
    "Produce a JSON object with exactly this shape:",
    "{",
    '  "conflictLines": [string, ...],  // 2–5 short Swedish strings naming main lines of disagreement, max 240 chars each. Empty array if no clear conflict.',
    '  "summaries": {',
    '    "neutral": string,   // ~80–120 words. Factual overview, even-handed, no rhetorical leaning.',
    '    "conflict": string,  // ~80–120 words. Foregrounds where parties disagree, who is criticising whom.',
    '    "citizen": string    // ~80–120 words. What this debate means for an ordinary citizen, plain language.',
    "  }",
    "}",
    "",
    "Each summary is grounded in the party positions above; do not invent claims that aren't reflected there.",
  ].join("\n");

  return { system, user };
}
