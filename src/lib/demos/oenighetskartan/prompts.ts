export const PROMPT_VERSIONS = {
  analyse: "v1",
} as const;

interface AnalysePromptInput {
  topic: string;
  statements: Array<{ id: string; text: string }>;
}

/**
 * Single-call analysis: from the topic + corpus, infer 3–6 latent
 * disagreement dimensions, cluster the statements, score every
 * statement on every dimension, and produce the deliberative diagnosis
 * (shared premises, empirical disagreements, value conflicts,
 * contested terms, better next question).
 */
export function analysePrompt(input: AnalysePromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are a deliberative-democracy analyst working in Swedish.",
    "You will receive a topic and a corpus of short statements (5–25 items).",
    "Your job is to make the STRUCTURE of the disagreement visible — not to take sides.",
    "Infer 3–6 latent dimensions that explain how the statements differ from one another.",
    "Dimensions are NOT hardcoded: they emerge from THIS corpus. Two different topics should produce different axes.",
    "Examples of dimensions you might (but don't have to) discover:",
    " - tillit till institutioner ↔ skepticism",
    " - försiktighet ↔ experimentvilja",
    " - rättssäkerhet ↔ effektivitet",
    " - centralt beslut ↔ lokal autonomi",
    " - kort sikt ↔ lång sikt",
    " - ekonomiskt argument ↔ värdebaserat argument",
    "Each dimension has two labelled poles. Score every statement on every dimension on a continuous scale -1..+1.",
    "Cluster the statements into 2–4 thematic groups (statements that share a stance pattern).",
    "Then produce a deliberative diagnosis: shared premises, empirical disagreements, value conflicts, contested terms, and a sharper next question.",
    "Be CONCISE. Cap descriptions at ~180 characters. Cap each list at 4 items.",
    "Respond ONLY with JSON matching the schema in the user message. No prose, no markdown fences.",
  ].join("\n");

  const corpus = input.statements
    .map((s) => `[${s.id}] ${s.text}`)
    .join("\n");

  const user = [
    `Topic: ${input.topic}`,
    "",
    "Statements:",
    corpus,
    "",
    "Produce a JSON object with exactly this shape:",
    "{",
    '  "dimensions": [',
    "    {",
    '      "id": string,            // short slug, e.g. "tillit"',
    '      "leftLabel": string,     // negative pole, e.g. "skepticism mot myndigheter"',
    '      "rightLabel": string,    // positive pole, e.g. "tillit till myndigheter"',
    '      "description": string,   // 1–2 sentences (max 180 chars) describing what the axis captures',
    '      "evidenceStatementIds": [string, ...]  // 1–4 IDs that strongly express either pole',
    "    }",
    "    // 3–6 dimensions",
    "  ],",
    '  "clusters": [',
    "    {",
    '      "id": string,            // short label, e.g. "A"',
    '      "label": string,         // 2–5 words capturing the cluster\'s stance',
    '      "description": string,   // 1 sentence (max 180 chars)',
    '      "memberStatementIds": [string, ...]',
    "    }",
    "    // 2–4 clusters; every input statement assigned to exactly one cluster",
    "  ],",
    '  "points": [',
    "    {",
    '      "statementId": string,   // matches an input ID',
    '      "text": string,          // the statement text, copied from input',
    '      "clusterId": string,',
    '      "scores": { <dimension_id>: number, ... }  // -1..+1 per dimension',
    "    }",
    "    // one point per input statement, in input order",
    "  ],",
    '  "sharedPremises": [string, ...],          // 0–4 things the corpus actually agrees on, in Swedish',
    '  "empiricalDisagreements": [string, ...],  // 0–4 disagreements solvable in principle by evidence',
    '  "valueConflicts": [string, ...],          // 0–4 disagreements rooted in incompatible values',
    '  "contestedTerms": [',
    '    { "term": string, "meanings": [string, string, ...] }   // words used in different senses',
    "    // 0–3 entries",
    "  ],",
    '  "nextBetterQuestion": string  // a sharper, more deliberation-friendly Swedish reformulation, 1 sentence',
    "}",
    "",
    "Constraints (important): every statement ID in points/clusters/evidence MUST be one of the input IDs. Do not invent IDs. Cover every input statement exactly once in points and exactly once in cluster membership.",
  ].join("\n");

  return { system, user };
}
