# Språkdriften

En av sju demos i demokrati-sviten. Visar hur en och samma modell svarar olika på samma svenska politiska fråga när den ställs på olika språk.

## Vad demon är — och inte är

**Är:** en fyrsiffrig pipeline som får samma modell att översätta, svara, bak-översätta och jämföra sig själv, och som sedan exponerar den text-mässiga variationen (ton, ramar, nämnda institutioner, hedgnings-profil) för en publik.

**Är inte:**
- Ett mätinstrument för ideologisk bias. "Observerade skillnader" är LLM-genererade hypoteser, inte signifikanta mätvärden.
- RAG-grundad — inga externa källor konsulteras. Svaren är modellens generativa output utan verifiering.
- En jämförelse mellan flera modellfamiljer. Alla steg använder samma provider (via `strong` och `multilingual` profilerna, som i nuläget båda pekar på Anthropic).
- Ett verktyg för att avgöra vilken språkversion som är "mest korrekt". Vi kan inte säga det utan en extern ground truth.

Demon fyller rollen *"AI-svar är språkligt situerade"* i Akt II (påverkansmotor). Den bär inte programmet — det gör tyngre, datagrundade demos som Riksdagsradarn.

## Pipeline

```
questionSv ──┬──▶ translate to each target language   ──▶ questionInTarget
             │         (multilingual profile)
             │
             └──▶ ask question in each language        ──▶ answerOriginal
                       (multilingual profile)
                            │
                            └──▶ back-translate each    ──▶ answerSv
                                      answer to Swedish
                                      (multilingual profile)
                                            │
                                            └──▶ comparison pass   ──▶ observedDifferences
                                                  (strong profile,        + per-answer tone / framing /
                                                   JSON + Zod schema       institutions / certainty
                                                   + 1 retry on failure)
```

Alla språk-branscher körs parallellt (`Promise.all`) per steg.

- Svenska är en no-op för `translate` och `backTranslate`.
- `strong` profilen används endast i jämförelsesteget eftersom resten är okritisk översättning.
- `router.json` validerar mot Zod-schema och gör en retry med korrigerings-prompt om första försöket bryter schema.

## Fält i resultatet — och var de kommer från

| Fält | Ursprung | Tolkning |
|---|---|---|
| `canonicalQuestionSv` | användar-input | Ursprungsfrågan |
| `answers[].questionInTarget` | steg 1 (translate) | Frågan som modellen faktiskt såg i målspråket |
| `answers[].answerOriginal` | steg 2 (answer) | Modellens svar på målspråket, oredigerat |
| `answers[].answerSv` | steg 3 (back-translate) | Svaret bak-översatt till svenska för svensk läsare och för jämförelsesteget |
| `answers[].tone` | steg 4 (compare) | En av sex enum-etiketter: `informative`, `analytical`, `balanced`, `cautious`, `assertive`, `advocating` |
| `answers[].framing` | steg 4 (compare) | 2–5 korta etiketter, öppet vokabulär (`economic`, `precautionary`, `rights-based`, `security`, …) |
| `answers[].institutionsMentioned` | steg 4 (compare) | Institutioner explicit namngivna i texten |
| `answers[].certaintyLevel` | steg 4 (compare) | `low`/`medium`/`high` — hur hedgad texten själv är, inte modellens epistemiska förtroende |
| `observedDifferences[]` | steg 4 (compare) | Högst 6 skillnader, var och en med citatevidens |
| `internalVariationIndex` | steg 4 (compare) | 0..1. Används internt för sortering, inte presenterad som vetenskap |

## Begränsningar man bör känna till

1. **Samma modell på båda sidor.** Jämförelsesteget är samma modellfamilj som svarssteget. Det snedvrider "observerade skillnader" mot den typ av skillnader modellen är tränad att beskriva.
2. **Bak-översättningen är lossy.** Hedgnings-nyanser och språkspecifik markering kan utjämnas. Jämförelsesteget läser den utjämnade versionen, inte originalet.
3. **Tone och certaintyLevel är heuristiska.** Två olika körningar på samma input kan ge olika etiketter. De är interpretiva genvägar, inte mätvärden.
4. **Ingen ground truth.** Vi kan konstatera att språkversionerna skiljer sig — vi kan inte säga vilken som är "bättre" eller "mer korrekt".
5. **Arabiskan har tunnare träningsfördelning på svensk politik.** Observationer om AR-varianten kan ibland säga mer om modellens svenska politiska kunskap på arabiska än om språklig drift.
6. **Featured cases cachas inte på förhand.** Första klick på varje case är ~20–60s live-körning; därefter instant cache.

## Vägar framåt

I prioritetsordning om demon ska utökas:

1. **Cross-provider jämförelse.** Låt `strong` och `multilingual` peka på olika provider-familjer (t.ex. Anthropic + OpenAI), eller lägg en ny `compare` profil som alltid är annan provider än `multilingual`. Tar bort "samma modell med sig själv"-kritiken.
2. **RAG-grundad variant.** Valfritt läge där varje språkspår måste referera till faktiska svenska källor (riksdagsanföranden via T-0002-datan, myndighetsbeslut, etc.). Då går demon från "modellens generativa röst på olika språk" till "modellens förmåga att navigera svenska källor på olika språk".
3. **Skärptare jämförelse-dimensioner.** Nuvarande `observedDifferences` tenderar hamna på tonnyanser. Konstruera prompten så att den viktar tyngre dimensioner: (a) vilka fakta ingår/utelämnas, (b) vilka aktörer nämns med namn vs anonymt, (c) vilken hedgnings-struktur används, (d) vilken antagen publikprofil genomsyrar svaret.
4. **Sida-vid-sida originaltexter** (inte bara bak-översättning). Nuvarande UI visar original + bak-översättning — bra första steg; men en "align by sentence" eller "diff"-vy mellan två språks bak-översättningar kan göra variationen mer konkret.
5. **Stage-läge med operator-lås.** Lås en fråga före scen, förgenerera alla språk under kaffepausen, spela upp som scen-sekvens med en-knapps-reveal per skillnad.
6. **Explore-läge med fri text**. I dagsläget finns bara featured-mode. Explore-mode kräver rate-limit + eventuellt CAPTCHA för public-exponering, men ger demon mer interaktivitet.
7. **Back-translation kvalitetskontroll.** Ibland glider bak-översättningen från den ursprungliga tonen. Ett extra steg som verifierar att back-translation bevarar hedgar/modalitet skulle höja tilliten till jämförelsesteget.

## Scenariobanken (v1)

Sex featured-cases i `src/lib/demos/sprakdriften/scenarios.ts`, valda för att täcka olika retoriska områden och språkkombinationer:

- **Migration** (sv/en/ar/de) — klassisk gränsfråga där ton och framing väntas variera kraftigt mellan språk.
- **Kärnkraft** (sv/en/fi/de) — teknisk/ekonomisk fråga där institutionell referens och riskram skiljer sig.
- **Kriminalitet och skärpta straff** (sv/en/ar/es) — tillit till rättsväsende är kulturellt markerad.
- **Vinster i välfärden** (sv/en/fi) — svensk-specifik institutionell fråga; modellen har olika mycket att säga på olika språk.
- **Nato och säkerhetspolitik** (sv/en/de/ar) — stor skillnad i antagen publik.
- **AI i skolan** (sv/en/ar/es) — ny teknik-fråga, svagare modellförankring, vilket i sig är en kommentar.

## Relevanta filer i kodbasen

```
src/lib/demos/sprakdriften/
├── schemas.ts         Zod-scheman + tone/certainty enums + språk-metadata
├── prompts.ts         Fyra prompts (translate/answer/backTranslate/compare) + versioner
├── pipeline.ts        Orkestrering av de fyra stegen
├── scenarios.ts       De sex featured-fallen
├── index.ts           DemoModule-registrering
└── pipeline.test.ts   Unit-test med mock-router

src/app/[locale]/demo/sprakdriften/
├── page.tsx               Index (SSR)
├── launcher.tsx           Scenariokort + POST+redirect (client)
└── runs/[runId]/
    ├── page.tsx           Run-sida wrapper (SSR)
    ├── run-view.tsx       Poll + rendering (client)
    └── answer-card.tsx    Kort per språk med frågan, originalsvar, bak-översättning, analytics

messages/{sv,en,ar}.json   i18n för all demo-specifik text inkl. tone/certainty-tooltips
```

## Etisk inramning

Denna demo är inte en röstningsrådgivare eller kampanjverktyg. Den är ett pedagogiskt instrument som visar att AI-systems output är språkligt och kulturellt situerad. All syntetisk output måste vara tydligt märkt som genererad av modellen — det gör vi i UI:t genom att alltid visa `answerOriginal` bredvid `answerSv` så att läsaren förstår att svenskan är modellens återöversättning, inte en uttalandet från modellen på svenska direkt.
