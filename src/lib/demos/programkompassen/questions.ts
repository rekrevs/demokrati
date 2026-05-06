/**
 * Question bank for Programkompassen v1. Inspired by canonical
 * valkompass-frågor but written here as our own; each question is a
 * yes/no-ish stance question that maps to a 1–5 scale.
 */
export interface CompassQuestion {
  id: string;
  text: string;
  topic: string;
  /** Search keywords used for retrieval against party programmes. */
  retrievalKeywords: string;
}

export const QUESTIONS: CompassQuestion[] = [
  {
    id: "karnkraft-utbyggnad",
    topic: "Energi",
    text: "Bör Sverige bygga ut kärnkraften?",
    retrievalKeywords:
      "kärnkraft kärnkraftsutbyggnad reaktorer energi elproduktion baskraft",
  },
  {
    id: "vinster-valfard",
    topic: "Välfärd",
    text: "Bör vinster i välfärden begränsas?",
    retrievalKeywords:
      "vinster välfärd vinstbegränsning friskolor privata utförare välfärdsbolag",
  },
  {
    id: "skarpta-straff",
    topic: "Rättsväsende",
    text: "Bör straffen för våldsbrott skärpas?",
    retrievalKeywords:
      "straff straffskärpning straffsatser kriminalitet våldsbrott rättsväsende",
  },
  {
    id: "begransa-invandring",
    topic: "Migration",
    text: "Bör Sverige begränsa invandringen?",
    retrievalKeywords:
      "invandring migration asyl flyktingar gränspolitik integration",
  },
  {
    id: "sankt-skatt",
    topic: "Ekonomi",
    text: "Bör skatterna sänkas?",
    retrievalKeywords:
      "skatt skattesänkning skattetryck inkomstskatt arbetsskatter",
  },
  {
    id: "klimat-mal",
    topic: "Klimat",
    text: "Bör Sverige skärpa sina klimatmål?",
    retrievalKeywords:
      "klimat klimatmål utsläpp koldioxid klimatomställning klimatpolitik",
  },
  {
    id: "kommunalt-mottagande",
    topic: "Migration",
    text: "Bör kommunerna ta emot fler flyktingar?",
    retrievalKeywords:
      "kommunmottagande flyktingar asylsökande integration kommun",
  },
  {
    id: "eu-fordragsandring",
    topic: "EU",
    text: "Bör Sverige verka för fördjupat EU-samarbete?",
    retrievalKeywords:
      "EU EU-samarbete fördjupat samarbete unionen Bryssel överstatligt",
  },
  {
    id: "mobil-skola",
    topic: "Utbildning",
    text: "Bör mobiltelefoner förbjudas i grundskolan?",
    retrievalKeywords:
      "mobiltelefon mobilförbud skola grundskola elever klassrum",
  },
  {
    id: "natoarbete",
    topic: "Säkerhet",
    text: "Bör Sverige öka försvarsanslagen utöver Natos 2-procentskrav?",
    retrievalKeywords:
      "försvar försvarsanslag försvarsbudget Nato militär säkerhet",
  },
];

export function findQuestion(id: string): CompassQuestion | undefined {
  return QUESTIONS.find((q) => q.id === id);
}
