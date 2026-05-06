import type { Scenario } from "../module";
import type { PersuasionmaskinenInput } from "./schemas";

const DEFAULT_PROFILES = [
  "p1-smaforalder",
  "p2-pensionar",
  "p4-student",
  "p5-vardanstalld",
];

export const FEATURED_SCENARIOS: Scenario<PersuasionmaskinenInput>[] = [
  {
    id: "vardtriage",
    slug: "vardtriage",
    title: "AI-vårdtriage — kort socialt inlägg",
    description:
      "Samma vårdfråga, fyra publiker. Visar hur tonen flyttar.",
    input: {
      policyCaseId: "vard-triage",
      profileIds: DEFAULT_PROFILES,
      channel: "kort-post",
    },
    tags: ["vård", "AI"],
  },
  {
    id: "skoluppgift",
    slug: "skoluppgift",
    title: "AI-granskning av skoluppgifter — flygblad",
    description: "Skolfråga riktad mot familjer, lärare, småföretagare.",
    input: {
      policyCaseId: "ai-skoluppgift",
      profileIds: ["p1-smaforalder", "p3-smaforetagare", "p7-larare", "p4-student"],
      channel: "flygblad",
    },
    tags: ["utbildning", "AI"],
  },
  {
    id: "kollektivtrafik-sms",
    slug: "kollektivtrafik-sms",
    title: "AI-optimerad kollektivtrafik — SMS",
    description: "Stadsbo, glesbygdsbo, IT-konsult — väldigt olika ingångar.",
    input: {
      policyCaseId: "kollektivtrafik",
      profileIds: ["p4-student", "p2-pensionar", "p6-it-konsult"],
      channel: "sms",
    },
    tags: ["trafik"],
  },
  {
    id: "socialtjanst-epost",
    slug: "socialtjanst-epost",
    title: "AI-stöd i socialtjänsten — e-post",
    description:
      "Känslig fråga som synliggör hur framing flyttar mellan trygghet, integritet och misstroende.",
    input: {
      policyCaseId: "socialtjanst",
      profileIds: ["p1-smaforalder", "p5-vardanstalld", "p8-pensionar-storstad"],
      channel: "epost",
    },
    tags: ["välfärd", "integritet"],
  },
];
