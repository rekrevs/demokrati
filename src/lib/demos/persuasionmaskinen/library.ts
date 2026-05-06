/**
 * Library of synthetic profiles + fictional policy cases used by
 * Persuasionmaskinen. EVERY profile is synthetic — no real voter
 * data. EVERY policy case is fictional — no real party affiliation,
 * no real candidate.
 *
 * The point of the demo is not to be a campaign tool. It is to make
 * visible how cheap and asymmetric tailored persuasion has become.
 * For that purpose synthetic-but-realistic is the right register.
 */

export interface SyntheticProfile {
  id: string;
  /** Persona handle for UI ("Småbarnsförälder i pendlingskommun"). */
  label: string;
  ageBand: "18-29" | "30-44" | "45-64" | "65+";
  /** "storstad" | "pendlingskommun" | "mindre stad" | "landsbygd" */
  municipalityType: string;
  occupation: string;
  /** 2–4 short interest tags. */
  interests: string[];
  /** 2–3 concerns in this person's life. */
  concerns: string[];
  /** Top political priority for this persona. */
  politicalPriority: string;
  /** Where they get news. */
  mediaHabits: string[];
}

export const PROFILES: SyntheticProfile[] = [
  {
    id: "p1-smaforalder",
    label: "Småbarnsförälder i pendlingskommun",
    ageBand: "30-44",
    municipalityType: "pendlingskommun",
    occupation: "kommunalanställd",
    interests: ["familjelogistik", "förskola", "trygghet"],
    concerns: [
      "långa hämtningstider",
      "förskolans kvalitet",
      "el- och matkostnader",
    ],
    politicalPriority: "praktiska vardagslösningar",
    mediaHabits: ["lokala SVT", "Aftonbladet via mobilen", "Facebook-grupper"],
  },
  {
    id: "p2-pensionar",
    label: "Pensionär på landsbygden",
    ageBand: "65+",
    municipalityType: "landsbygd",
    occupation: "pensionär (tidigare lantbrukare)",
    interests: ["jakt", "trafiksäkerhet", "vårdtillgång"],
    concerns: ["långa väntetider till sjukvård", "skattetryck", "dieselpriser"],
    politicalPriority: "att landsbygden inte glöms bort",
    mediaHabits: ["lokaltidning", "Sveriges Radio P4"],
  },
  {
    id: "p3-smaforetagare",
    label: "Småföretagare i mindre stad",
    ageBand: "45-64",
    municipalityType: "mindre stad",
    occupation: "egenföretagare (bygg)",
    interests: ["regelförenkling", "lokal infrastruktur"],
    concerns: ["arbetskraftsbrist", "rapporteringsbörda", "elpriser"],
    politicalPriority: "minskat krångel för småföretag",
    mediaHabits: ["DN online", "branschtidningar", "X (twitter)"],
  },
  {
    id: "p4-student",
    label: "Universitetsstudent i storstad",
    ageBand: "18-29",
    municipalityType: "storstad",
    occupation: "student (statsvetenskap)",
    interests: ["klimat", "internationella frågor", "psykisk hälsa"],
    concerns: ["bostadsbrist", "studentekonomi", "AI-jobbomställning"],
    politicalPriority: "långsiktig systemförändring för klimat och rättvisa",
    mediaHabits: ["TikTok", "Substacks", "podcasts"],
  },
  {
    id: "p5-vardanstalld",
    label: "Vårdanställd i regionhuvudort",
    ageBand: "30-44",
    municipalityType: "mindre stad",
    occupation: "undersköterska",
    interests: ["arbetsmiljö", "lön", "patientsäkerhet"],
    concerns: ["bemanning", "förtroende för chefer", "skiftarbete"],
    politicalPriority: "fungerande välfärd och rimlig lön",
    mediaHabits: ["Facebook-grupper för vårdanställda", "lokal-SVT"],
  },
  {
    id: "p6-it-konsult",
    label: "IT-konsult i storstad",
    ageBand: "30-44",
    municipalityType: "storstad",
    occupation: "IT-konsult",
    interests: ["teknik", "ekonomi", "AI-utveckling"],
    concerns: ["datapolitik", "skatt på reavinst", "konsultmarknadens vändning"],
    politicalPriority: "konkurrenskraftiga ramvillkor för tech",
    mediaHabits: ["Hacker News", "DN", "podcasts"],
  },
  {
    id: "p7-larare",
    label: "Lärare i förort",
    ageBand: "45-64",
    municipalityType: "storstad",
    occupation: "grundskolelärare",
    interests: ["lärarprofession", "skolpolitik", "läroplan"],
    concerns: ["arbetsbörda", "elevernas mående", "bedömningsbörda"],
    politicalPriority: "förbättrad skola, mer tid till undervisning",
    mediaHabits: ["Lärarnas Tidning", "DN", "Twitter (X)"],
  },
  {
    id: "p8-pensionar-storstad",
    label: "Pensionär i storstadens innerstad",
    ageBand: "65+",
    municipalityType: "storstad",
    occupation: "pensionerad ingenjör",
    interests: ["kultur", "klimat", "internationell politik"],
    concerns: ["trygghet på äldre dar", "klimatomställning", "tillit till institutioner"],
    politicalPriority: "långsiktigt ansvarstagande för klimat och välfärd",
    mediaHabits: ["DN", "Svenska Dagbladet", "Sveriges Radio P1"],
  },
];

export interface PolicyCase {
  id: string;
  title: string;
  /** Short fact sheet — what the policy proposal is. */
  factSheet: string;
}

export const POLICY_CASES: PolicyCase[] = [
  {
    id: "vard-triage",
    title: "AI-baserad vårdtriage i regionen",
    factSheet:
      "En region överväger att införa ett AI-system som hjälper vårdcentralernas mottagningssjuksköterskor att prioritera inkommande patienter. Systemet använder anamnesfrågor och tidigare journaldata för att rekommendera prioritetsordning. Den slutgiltiga bedömningen görs av sjuksköterska. Förespråkare lyfter snabbare flöden och färre kösamtal. Kritiker oroar sig för algoritmisk bias mot grupper som söker vård mer sällan, samt för avhumanisering. Beslut planeras under 2027.",
  },
  {
    id: "ai-skoluppgift",
    title: "AI-granskning av skoluppgifter",
    factSheet:
      "Skolverket föreslår en pilot där AI-verktyg används för att utvärdera elevers skriftliga inlämningar i grundskolans åk 7–9. Lärarens slutbedömning står fast, men AI:n ger en första rekommendation och en motivering. Förespråkare pekar på minskad lärarbörda och konsekventare bedömningar. Kritiker menar att modellbias riskerar systematisk diskriminering och att eleverna behöver lärar-människors omdöme. Pilot startas eventuellt höstterminen 2027.",
  },
  {
    id: "kollektivtrafik",
    title: "AI-optimerad kollektivtrafik",
    factSheet:
      "En kommun överväger att använda AI för att i realtid omdistribuera bussar och spårvagnar baserat på efterfrågan och fördröjningar. Systemet kan minska väntetider i centrum men kan också nedprioritera glesbygdslinjer som har låg passagerarfrekvens. Förespråkare lyfter effektivitet och sänkta utsläpp. Kritiker oroar sig för att glesbygd och äldre tappar tillgänglighet. Förslag väntas läggas på trafiknämndens bord 2026.",
  },
  {
    id: "socialtjanst",
    title: "AI-stöd i socialtjänstens prioritering",
    factSheet:
      "En storstadskommun föreslår att socialtjänsten använder ett AI-system för att prioritera ärenden om barn och unga utifrån riskindikatorer i tidigare anmälningar och socioekonomi. Beslut om åtgärd tas alltid av socialsekreterare. Förespråkare pekar på snabbare upptäckt av högriskärenden. Kritiker varnar för att modellen kan reproducera diskriminering mot redan utsatta familjer och att förtroendet för socialtjänsten kan urholkas. Beslut planeras 2027.",
  },
];
