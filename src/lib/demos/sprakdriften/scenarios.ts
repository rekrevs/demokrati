import type { Scenario } from "../module";
import type { SprakdriftenInput } from "./schemas";

/**
 * Featured scenarios shown as pre-warmed case studies. Each one seeds a
 * recognisable Swedish political question across the sv/en/ar triplet
 * plus one or two more languages to make variation visible.
 */
export const FEATURED_SCENARIOS: Scenario<SprakdriftenInput>[] = [
  {
    id: "migration",
    slug: "migration",
    title: "Migration",
    description:
      "Hur beskrivs svensk migrationspolitik beroende på vilket språk man frågar på?",
    input: {
      questionSv:
        "Hur ser Sveriges migrationspolitik ut och vilka är de viktigaste argumenten?",
      languages: ["sv", "en", "ar", "de"],
      style: "overview",
    },
    tags: ["migration", "samhälle"],
  },
  {
    id: "karnkraft",
    slug: "karnkraft",
    title: "Kärnkraft",
    description:
      "Hur framställs kärnkraftsfrågan på olika språk, med olika riskramar?",
    input: {
      questionSv:
        "Bör Sverige bygga ut kärnkraften? Vilka är huvudargumenten?",
      languages: ["sv", "en", "fi", "de"],
      style: "pros-and-cons",
    },
    tags: ["energi", "klimat"],
  },
  {
    id: "kriminalitet",
    slug: "kriminalitet",
    title: "Kriminalitet och skärpta straff",
    description:
      "Trygghet, rättssäkerhet och institutionell tillit — hur växlar tonen?",
    input: {
      questionSv:
        "Är hårdare straff en effektiv väg mot kriminalitet i Sverige?",
      languages: ["sv", "en", "ar", "es"],
      style: "policy",
    },
    tags: ["rättsväsende", "samhälle"],
  },
  {
    id: "valfard",
    slug: "valfard",
    title: "Vinster i välfärden",
    description:
      "Hur presenteras argumenten för och emot vinstuttag i välfärden?",
    input: {
      questionSv:
        "Bör det finnas vinstbegränsningar för privata aktörer inom svensk välfärd?",
      languages: ["sv", "en", "fi"],
      style: "pros-and-cons",
    },
    tags: ["välfärd", "ekonomi"],
  },
  {
    id: "nato",
    slug: "nato",
    title: "Nato och säkerhetspolitik",
    description:
      "Hur ramas svensk säkerhetspolitik in beroende på antagen publik?",
    input: {
      questionSv:
        "Hur bör Sverige agera i Nato och vilka är de säkerhetspolitiska övervägandena?",
      languages: ["sv", "en", "de", "ar"],
      style: "policy",
    },
    tags: ["säkerhet", "utrikes"],
  },
  {
    id: "ai-skolan",
    slug: "ai-skolan",
    title: "AI i skolan",
    description:
      "Ny teknik möter skolpolitik: hur varierar tonen mellan språken?",
    input: {
      questionSv:
        "Bör skolor använda AI-verktyg för att utvärdera elevers arbeten?",
      languages: ["sv", "en", "ar", "es"],
      style: "pros-and-cons",
    },
    tags: ["utbildning", "AI"],
  },
];
