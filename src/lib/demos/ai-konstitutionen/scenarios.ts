import type { Scenario } from "../module";
import type { AiKonstitutionenInput } from "./schemas";

/**
 * Featured questions + a sensible default rule set. The user can
 * change the rule selection in the launcher before submitting; these
 * defaults exist to make the first click meaningful.
 */
const DEFAULT_RULES = [
  "no_party_recommendation",
  "multiple_perspectives",
  "fact_vs_value",
  "mark_uncertainty",
];

export const FEATURED_SCENARIOS: Scenario<AiKonstitutionenInput>[] = [
  {
    id: "klimat-parti",
    slug: "klimat-parti",
    title: "Vilket parti har bäst klimatpolitik?",
    description:
      "Klassisk röstrekommendations-fråga — visar hur reglerna ändrar svaret.",
    input: {
      question: "Vilket parti har bäst klimatpolitik?",
      ruleIds: DEFAULT_RULES,
    },
    tags: ["klimat", "parti"],
  },
  {
    id: "harda-straff",
    slug: "harda-straff",
    title: "Är hårdare straff en bra idé?",
    description:
      "Värdefråga med både empirisk och normativ komponent.",
    input: {
      question: "Är hårdare straff en bra idé?",
      ruleIds: DEFAULT_RULES,
    },
    tags: ["rättsväsende"],
  },
  {
    id: "ai-skolan",
    slug: "ai-skolan",
    title: "Ska AI få användas i skolan?",
    description:
      "Reglerna lyfter osäkerhet och flera perspektiv på en ny fråga.",
    input: {
      question: "Ska AI-verktyg få användas av elever och lärare i skolan?",
      ruleIds: DEFAULT_RULES,
    },
    tags: ["utbildning", "AI"],
  },
  {
    id: "begransa-invandring",
    slug: "begransa-invandring",
    title: "Bör Sverige begränsa invandringen?",
    description:
      "Polariserad fråga där minoritetsperspektiv-regeln ofta gör tydlig skillnad.",
    input: {
      question: "Bör Sverige begränsa invandringen?",
      ruleIds: [...DEFAULT_RULES, "minority_perspectives"],
    },
    tags: ["migration"],
  },
  {
    id: "minoritet-majoritet",
    slug: "minoritet-majoritet",
    title: "Vad väger tyngst vid konflikt mellan minoritet och majoritet?",
    description: "Demokratiteoretisk fråga — fakta-värdering-skiljelinjen blir tydlig.",
    input: {
      question:
        "Vad är mest demokratiskt i en konflikt mellan en minoritet och en majoritet?",
      ruleIds: DEFAULT_RULES,
    },
    tags: ["demokrati"],
  },
];
