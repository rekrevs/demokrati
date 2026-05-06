import type { Scenario } from "../module";
import { PARTY_CODES, type ProgramkompassenInput } from "./schemas";

const ALL_PARTIES = [...PARTY_CODES] as const;

export const FEATURED_SCENARIOS: Scenario<ProgramkompassenInput>[] = [
  {
    id: "karnkraft",
    slug: "karnkraft",
    title: "Bör Sverige bygga ut kärnkraften?",
    description:
      "Klassisk skiljelinje. Visar avstånd och osäkerhet i svaren.",
    input: {
      questionId: "karnkraft-utbyggnad",
      parties: [...ALL_PARTIES],
    },
    tags: ["energi"],
  },
  {
    id: "vinster-valfard",
    slug: "vinster-valfard",
    title: "Bör vinster i välfärden begränsas?",
    description: "Polariserad fråga med tydlig vänster–höger-axel.",
    input: {
      questionId: "vinster-valfard",
      parties: [...ALL_PARTIES],
    },
    tags: ["välfärd"],
  },
  {
    id: "skarpta-straff",
    slug: "skarpta-straff",
    title: "Bör straffen för våldsbrott skärpas?",
    description: "Bred konsensus i en riktning, små men reella skillnader.",
    input: {
      questionId: "skarpta-straff",
      parties: [...ALL_PARTIES],
    },
    tags: ["rättsväsende"],
  },
  {
    id: "klimat-mal",
    slug: "klimat-mal",
    title: "Bör Sverige skärpa sina klimatmål?",
    description: "Nyans och takt-frågor mer än rena ja/nej-positioner.",
    input: {
      questionId: "klimat-mal",
      parties: [...ALL_PARTIES],
    },
    tags: ["klimat"],
  },
  {
    id: "natoarbete",
    slug: "natoarbete",
    title: "Bör Sverige öka försvarsanslagen utöver Nato-kravet?",
    description: "Säkerhetspolitik efter NATO-medlemskapet.",
    input: {
      questionId: "natoarbete",
      parties: [...ALL_PARTIES],
    },
    tags: ["säkerhet"],
  },
];
