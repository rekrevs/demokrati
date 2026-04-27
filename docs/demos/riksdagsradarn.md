# Riksdagsradarn

En av sju demos i demokrati-sviten. Visar vad som faktiskt sagts i Sveriges riksdag om en sakfråga, grupperat per parti, med varje AI-genererat påstående länkat till exakt textsegment.

## Vad demon är — och inte är

**Är:** en RAG-pipeline över Riksdagens öppna data. Den hämtar relevanta anföranden via hybrid sökning (lexikal + semantisk), klustrar per parti, extraherar typade påståenden med citatevidens, och producerar tre olika sammanfattningar av samma underlag.

**Är inte:**
- En faktagranskare. Den säger inte vem som har rätt, bara vad som sas.
- Politiskt neutral i tonen — den följer modellens stil, varför "neutral översikt"-läget är just det vi presenterar som *en* sammanfattningsregim, inte den enda eller den korrekta.
- Komplett. Korpus är vad som ingjorts; debatter utanför ingestionsperioden syns inte.
- Realtid. Ingestion är manuell/scemalagd, inte live-streaming.

Demon fyller rollen *"AI som demokratisk lins"* i Akt I. Den är den tyngsta datagrundade demon i sviten och bär en stor del av programmets trovärdighet.

## Pipeline

```
input: { topic, dateFrom, dateTo, parties? }
   │
   ├──▶ embed query (multilingual / OpenAI text-embedding-3-small)
   │
   └──▶ hybridRetrieve()  ──▶ candidate chunks
            │   ├─ Postgres FTS (Swedish dictionary, GIN-indexerad)
            │   └─ pgvector cosine (HNSW-indexerad)
            │   └─ Reciprocal Rank Fusion (k=60) över de två
            │
            └──▶ topp-N chunks med metadata (talare, parti, datum, anförande_id)
                       │
                       └──▶ groupHitsByParty()
                                 │
                                 └──▶ analysePrompt
                                         │  (strong profile, 1 LLM-anrop)
                                         │  Returns JSON via router.json:
                                         │  - partyPositions[]: { parti, summary, claims[] }
                                         │  - conflictLines[]
                                         │  - summaries: { neutral, conflict, citizen }
                                         │
                                         └──▶ filter chunkIds → bara giltiga ids släpps igenom
```

Total: 1 embedding-anrop + 1 strong-LLM-anrop per körning. Featured-fall cachas via DemoModule's vanliga mekanism.

## Datastiftelsen

**Källan:** [Riksdagens öppna data](https://data.riksdagen.se) — anförandelista + per-anförande XML. Licens: fri användning med attribution till Sveriges riksdag (krav uppfyllt i UI:t via källkortens länk till riksdagen.se och i `dirDisclaimer`).

**Ingestion:** manuell via `pnpm tsx scripts/ingest-riksdagen.ts --rm 2025/26 --pageSize 50 --maxPages N`. Idempotent — samma anförande_id skippas vid omkörning. Embeddings genereras via OpenAI text-embedding-3-small (1536-dim) och lagras i `source_chunks.embedding` (pgvector).

**Schema:** se `docs/data/riksdagen.md` för fullständig endpoint-dokumentation och gotchas. Sammanfattningsvis:
- En `SourceDoc`-rad per anförande (`externalId = anforande_id` UUID)
- En `SourceChunk`-rad per paragraf (`<p>...</p>`)
- `parsedText` på doc-nivå har hela texten med dubbla newlines mellan paragrafer
- `metadataJson` på doc-nivå har `dokId`, `talare`, `parti`, `avsnittsrubrik`, `underrubrik`, `dokDatum`, `anforandeUrlHtml` etc.

## Hybrid-retrieval

Två kandidatlistor, sammanslagna med Reciprocal Rank Fusion:

1. **Lexikal**: `to_tsvector('swedish', text) @@ plainto_tsquery('swedish', topic)` med `ts_rank_cd` för rankning. Postgres svenska text-search-ordlistan hanterar stamning och stoppord.
2. **Semantisk**: `embedding <=> query_vector::vector` (cosine distance, lägre = mer likt). HNSW-index för snabbhet.

RRF formula: `score = 1/(k + lex_rank) + 1/(k + sem_rank)`, k=60. Ger lexikal exakthet ihop med semantisk täckning utan att behöva väga score-skalor mot varandra (rankerna är skalfria).

Filtreringsdimensioner som appliceras före retrieval: `dateFrom`, `dateTo`, `parties` (array av partikoder).

## Påståendetyper och säkerhet

LLM:en tvingas typa varje påstående som en av fyra:

| Typ | Innebörd |
|---|---|
| `empirical` (fakta) | Påstående om hur saker faktiskt är |
| `normative` (värdering) | Påstående om hur det bör vara |
| `critique` (kritik) | Kritik mot annan aktör eller policy |
| `proposal` (förslag) | Konkret rekommendation eller krav |

Säkerhet är en heuristisk bedömning av hur väl chunken stödjer påståendet:

- **high** — direkt citat eller näraomskrivning, ofta med flera stödjande chunks
- **medium** — ett starkt stödjande chunk
- **low** — inferens som går utöver det chunken direkt säger

Pipeline-koden filtrerar bort chunkIds som modellen hittat på (genom att jämföra mot det faktiska retrieval-setet) och kasserar påståenden vars samtliga citat är ogiltiga. En `low`-påstående med valid chunk-citat får finnas kvar — etiketten signalerar hur långt vi tror modellen har sträckt sig.

## Tre sammanfattningsregimer

Producerade i samma LLM-anrop som påståenden + konfliktlinjer:

- **neutral** — faktaorienterad översikt, jämn vikt mellan partier
- **conflict** — lyfter fram oenighet och vem som kritiserar vem
- **citizen** — vad debatten betyder för en medborgare, vardagsspråk

Samma underlag ger olika berättelser. Det är poängen: AI:s sammanfattningsstil är inte en passiv egenskap — den aktivt formar vad som lyfts fram.

## Begränsningar

1. **Korpus är inte komplett.** Vi har bara det som ingjorts. Featured-cases använder april 2026; andra perioder kräver ingestion.
2. **Repliker exkluderas i ingestion-default.** Det skär bort en hel del polemisk dialog. För konfliktanalys på djupet behövs replik-inkluderande korpus.
3. **Modellen kan hitta på chunkIds.** Vi filtrerar bort men det är värt att veta — påståenden vars samtliga citat var påhittade slängs.
4. **"Konfliktlinjer" är modellens tolkning** av samma korpus den just sammanfattat. Inte triangulerat mot extern data.
5. **Ministrar listas under sitt parti.** Statsråd Forssmed (KD) räknas som KD-position, inte regeringsposition. Viktigt vid läsning.
6. **Embedding-modellen hanterar svenska men är inte specialtränad** på riksdagens språk. Ovanliga sakpolitiska termer kan ge sämre semantisk matchning.

## Vägar framåt

I prioritetsordning:

1. **Nattlig ingestion via BullMQ.** I dag manuell — bör automatiseras så korpus alltid är aktuell. Det finns redan en `ingest`-kö i `src/lib/queue/types.ts`; bara att binda en handler.
2. **Replik-läge.** Lägg till `includeRepliker` toggle på input. Repliker är där partierna verkligen drabbar samman — för konflikt-regimen är de centrala.
3. **Längre datumintervall.** I dag default 1 månad; vissa frågor kräver kvartal eller helår för att ha tillräckligt material.
4. **Bättre claim-deduplicering.** Modellen producerar ibland nästan identiska påståenden från samma chunk — efterprocessing borde mergea dessa.
5. **Citatlänk till exakt textstycke i riksdagen.se HTML-vyn.** I dag länkar vi till hela anförandet; en deep-link till stycket skulle göra granskningen ännu enklare.
6. **Stage-läge.** Lås en topic + datumintervall, förgenerera, spela upp regim-växlingen som scen-sekvens.
7. **Cross-parti diff-vy.** "Det här sägs av M men inte av S" — explicit kontrast mellan vad partier nämner och utelämnar.
8. **Ingestion av motioner och kommittérapporter.** Anföranden är muntliga; för många frågor finns viktigt material i skriftliga inlagor.

## Featured-scenarier (v1)

Fem fasta fall i `src/lib/demos/riksdagsradarn/scenarios.ts`:

- **Skolan** — undervisning, lärare, läroplan
- **Kriminalitet och trygghet** — gängbrottslighet, straff, polis
- **Energi och klimat** — kärnkraft, vindkraft, utsläpp
- **Nato och försvar** — säkerhetspolitik
- **Sjukvård** — vårdköer, regioner, läkemedel

Alla med datumintervall `2026-04-01` till `2026-04-30` och `retrievalLimit=30`.

## Relevanta filer

```
src/lib/demos/riksdagsradarn/
├── schemas.ts         Zod-scheman + claim/confidence enums + party-labels
├── prompts.ts         Analysprompten med versioner
├── pipeline.ts        Orkestrering: retrieve + analyse
├── scenarios.ts       Fem featured cases
├── index.ts           DemoModule-registrering
└── (pipeline.test.ts) — tillagd vid behov

src/lib/retrieval/
└── riksdag.ts         Hybrid retrieval (FTS + pgvector + RRF)

src/lib/ingest/
├── riksdagen.ts       Lista → fetch XML → chunk → embed → upsert
└── riksdagen.test.ts  Parser-tester mot fixtures

scripts/
├── ingest-riksdagen.ts   CLI: pnpm tsx scripts/ingest-riksdagen.ts ...
└── test-retrieval.ts     CLI: snabbtest av retrieval

prisma/migrations/20260427000000_riksdag_text_search/migration.sql
   GIN-index på Swedish tsvector + HNSW på embedding

src/app/[locale]/demo/riksdagsradarn/
├── page.tsx                      Index (SSR)
├── launcher.tsx                  Scenariokort + POST+navigate
└── runs/[runId]/
    ├── page.tsx                  SSR wrapper
    ├── run-view.tsx              Polling + rendering med Tabs
    ├── party-position.tsx        Per-parti-kort med claims
    └── source-card.tsx           Klickbart källkort med scroll-anchor

messages/{sv,en,ar}.json          riksdagsradarn-namespace
```

## Etisk inramning

Riksdagsradarn använder offentlig politisk data och presenterar AI-genererade sammanfattningar. Tre regler vi följer:

1. **Varje AI-påstående är länkat till exakt källtext.** Läsaren kan alltid kontrollera mot originalet. Källkort har fullt textstycke + länk till riksdagen.se.
2. **Tre regimer existerar parallellt** — ingen är "den korrekta". Det är en pedagogisk demonstration av att sammanfattningsval påverkar vad som lyfts fram.
3. **Demon är inte en faktagranskare.** Den säger vad som sas, inte om det stämmer. Säkerhetsetiketten på varje påstående handlar om hur väl chunken stödjer påståendet, inte om påståendet är sant.
