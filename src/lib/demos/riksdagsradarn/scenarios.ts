import type { Scenario } from "../module";
import type { RiksdagsradarnInput } from "./schemas";

/**
 * Featured cases for Riksdagsradarn. The date ranges deliberately span
 * the most recent ingested period; ingestion + this list need to be
 * kept in step. Topics chosen to hit canonical political areas.
 */
export const FEATURED_SCENARIOS: Scenario<RiksdagsradarnInput>[] = [
  {
    id: "skola",
    slug: "skola",
    title: "Skolan",
    description: "Skolpolitik, friskolor, lärare, läroplan.",
    input: {
      topic: "skola undervisning lärare elever läroplan",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      retrievalLimit: 18,
    },
    tags: ["utbildning"],
  },
  {
    id: "kriminalitet",
    slug: "kriminalitet",
    title: "Kriminalitet och trygghet",
    description: "Gängbrottslighet, straff, polis, rättsväsende.",
    input: {
      topic: "kriminalitet straff brott trygghet polis gängbrottslighet",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      retrievalLimit: 18,
    },
    tags: ["rättsväsende"],
  },
  {
    id: "energi",
    slug: "energi",
    title: "Energi och klimat",
    description: "Elproduktion, kärnkraft, vindkraft, klimatpolitik.",
    input: {
      topic: "energi el kärnkraft klimat utsläpp",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      retrievalLimit: 18,
    },
    tags: ["energi", "klimat"],
  },
  {
    id: "nato",
    slug: "nato",
    title: "Nato och försvar",
    description: "Säkerhetspolitik, försvarsanslag, Nato-medlemskap.",
    input: {
      topic: "Nato försvar säkerhet militär utrikes",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      retrievalLimit: 18,
    },
    tags: ["säkerhet"],
  },
  {
    id: "sjukvard",
    slug: "sjukvard",
    title: "Sjukvård",
    description: "Vårdköer, regioner, läkemedel, hälsa.",
    input: {
      topic: "sjukvård vård regioner vårdköer läkare patienter",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      retrievalLimit: 18,
    },
    tags: ["välfärd"],
  },
];
