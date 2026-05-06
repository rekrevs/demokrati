import type { Scenario } from "../module";
import {
  OPPENHET_AUDIENCES,
  type OppenhetsparadoxenInput,
} from "./schemas";

const ALL_AUDIENCES = [...OPPENHET_AUDIENCES] as const;

/**
 * Featured decision texts. Mix of simulated municipal/agency decisions
 * and a synthetic kontrollfall. Real Riksdag-decision wording would
 * also work but we keep v1 self-contained.
 */
export const FEATURED_SCENARIOS: Scenario<OppenhetsparadoxenInput>[] = [
  {
    id: "skolmaten",
    slug: "skolmaten",
    title: "Kommunalt beslut om skolmat",
    description:
      "Ett konkret kommunalt beslut med villkor, undantag och tröskelvärden.",
    input: {
      sourceTitle: "Beslut om kostpolicy i Lindskogs kommun",
      originalText:
        "Lindskogs kommun beslutar att från och med läsåret 2026/27 ska samtliga grundskolor och förskolor i kommunal regi servera minst 60 procent vegetabilisk mat under en tvåveckorsperiod, mätt i andelen råvaror i vikt. Undantag medges för enskilda dagar i samband med traditionella högtider (julbord, midsommarlunch och påsklunch) samt för specialkost ordinerad av läkare eller för dokumenterade religiösa kostbehov. Beslutet gäller inte fristående skolor eller särskilda boenden. Uppföljning sker årligen genom utbildningsförvaltningens kvalitetsrapport, första gången senast den 30 juni 2027. Kostnadsökningar utöver tre procent jämfört med budget 2025 kräver särskilt beslut av kommunstyrelsen.",
      audiences: [...ALL_AUDIENCES],
    },
    tags: ["kommun", "skola"],
  },
  {
    id: "biltrafik",
    slug: "biltrafik",
    title: "Miljözon i innerstaden",
    description:
      "Ett trafikbeslut med specifika fordonsklasser, undantag och datum.",
    input: {
      sourceTitle:
        "Kommunfullmäktigebeslut om miljözon klass 3 i innerstadsdistriktet",
      originalText:
        "Från och med den 1 januari 2027 inrättas miljözon klass 3 i innerstadsdistriktet, avgränsat enligt karta i bilaga 1. Inom zonen får endast följande fordon framföras: a) personbilar och lätta lastbilar med utsläppsklass Euro 6 från och med 2018, b) tunga lastbilar med utsläppsklass Euro 6 oavsett årsmodell, c) bussar med utsläppsklass Euro 6 eller med renodlad eldrift. Undantag medges för utryckningsfordon, fordon för funktionshindertransport godkända av kommunen, samt för boende inom zonen som ansökt om tillstånd före den 30 september 2026 — för dessa gäller dispens i två år. Polisen och Transportstyrelsen ansvarar för efterlevnadskontroll. Beslutet utvärderas senast 31 december 2028 utifrån mätdata från fyra fasta luftkvalitetsstationer.",
      audiences: [...ALL_AUDIENCES],
    },
    tags: ["miljö", "trafik"],
  },
  {
    id: "biblioteksavgift",
    slug: "biblioteksavgift",
    title: "Förseningsavgift på folkbibliotek",
    description: "Liten ändring i en avgiftsstruktur — visa hur små shifts kan synliggöras.",
    input: {
      sourceTitle:
        "Beslut om reviderade förseningsavgifter vid Lindskogs folkbibliotek",
      originalText:
        "Förseningsavgifter vid kommunens folkbibliotek revideras enligt följande, med verkan från och med 1 mars 2026. Vuxna låntagare debiteras en grundavgift om 10 kronor per påbörjad försenad vecka och utlånat verk, dock högst 200 kronor per verk. Personer under 18 år, personer med dokumenterad funktionsnedsättning som försvårar besök, samt personer med beviljat ekonomiskt bistånd från socialtjänsten är fortsatt avgiftsbefriade. Förlorat eller väsentligen skadat verk debiteras med ersättningskostnad enligt fastställd taxa. Avgiftsuttaget upphör om verket återlämnas inom 14 dagar efter första påminnelse. Bibliotekschefen får i enskilt fall efterskänka avgift av sociala skäl.",
      audiences: [...ALL_AUDIENCES],
    },
    tags: ["kommun", "kultur"],
  },
  {
    id: "synthetic-control",
    slug: "synthetic-control",
    title: "Syntetiskt kontrollbeslut (juridiskt komplext)",
    description:
      "Ett kontrollerat fiktivt beslut med många moduligheter — pressar diff-detektorn.",
    input: {
      sourceTitle:
        "Förslag om reviderade villkor för stöd till kulturarrangörer",
      originalText:
        "Kulturnämnden beslutar att stöd till kulturarrangörer enligt förordning §3 ska från och med 2027-01-01 villkoras enligt följande. Stöd får beviljas till sökande som a) bedrivit verksamhet i minst 24 månader vid ansökningstillfället, b) redovisat publik om minst 500 personer per år under de senaste två verksamhetsåren mätt enligt Statens kulturråds metod, och c) inte tidigare beviljats stöd överstigande 500 000 kronor under en sammanhängande femårsperiod. Undantag från villkor a) och b) får medges om sökanden bedriver verksamhet riktad mot nationell minoritet, ungdom under 25 år eller boende i kommun med färre än 8000 invånare. Beslutsunderlaget ska innefatta en jämställdhetskonsekvensanalys. Ansökningar inkomna efter den 30 juni avslås utan prövning. Bemyndiganden inom 25 procent av tilldelad ram delegeras till förvaltningschefen. Beslut om belopp överstigande 250 000 kronor kräver kulturnämndens beslut i plenum.",
      audiences: [...ALL_AUDIENCES],
    },
    tags: ["kultur", "stat"],
  },
];
