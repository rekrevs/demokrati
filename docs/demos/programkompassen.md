# Programkompassen

Akt II-demo. Hämtar utdrag ur partiernas egna programtexter och låter en modell extrahera position på en 1–5-skala för varje fråga, med citatevidens. Visar hur fast ideologi översätts till valbara positioner.

## Datakälla

Partiernas valmanifest 2022 (för MP: 2018) från SND:s "Vi vill..."-samling. Fil-nedladdningsmönster `/sv/vivill/file/{party}/{type}/{year}/txt`. Ingestion-skript: `scripts/ingest-snd-programs.ts`.

Per 2026-05-05 ingjorda: 8 riksdagspartiers valmanifest 2022 (S, M, SD, C, V, KD, MP, L) — totalt **795 chunks**, ~1200 chars/chunk, paragrafsplittade. Embeddings via OpenAI text-embedding-3-small.

## Pipeline (parallell N+2 LLM-anrop, ~60–120s)

1. **checking_coverage** — vilka partier finns i indexet (snabb DB-fråga)
2. **retrieving** — hybrid retrieval per parti (Postgres FTS + pgvector RRF, partitionerad på `metadataJson->>'party'`)
3. **extracting** (parallel per parti) — strong-modellen läser de relevanta utdragen och returnerar:
   - stance: 1–5
   - summary: 1–2 meningar
   - confidence: low/medium/high
   - evidence: 1–4 verbatim-citat med chunkId
4. **framing** — separat call producerar `simplificationNote`: "vad förenklar denna fråga"

Saknade partier (ej i indexet): stance 3, confidence low, `noCoverage: true`. UI:t skuggar dem.

## Frågebank

10 frågor i `questions.ts` täckande:
- Energi (kärnkraft)
- Välfärd (vinster)
- Rättsväsende (straff)
- Migration (begränsning, kommunmottagande)
- Ekonomi (skatter)
- Klimat (klimatmål)
- EU (fördjupning)
- Utbildning (mobilförbud)
- Säkerhet (försvarsanslag)

Varje fråga har `retrievalKeywords` (söknyckelord, separat från frågetexten).

## UI

- Launcher med 5 featured-frågor
- Run-page:
  - Frågetext överst
  - "Vad förenklar denna fråga"-not i ett kort
  - Per parti: rad med partikod-badge, fullt namn, sammanfattning, evidens-citat (med länk till källtexten på SND), och en stance-meter (5 prickar) + confidence-label
  - Partier utan täckning visas i muted färg

## Etisk inramning

Demon är **inte en valkompass**. Den är en granskning av hur fast ideologi översätts till valbara positioner. UI-disclaimer:

> "Demon är inte en valkompass. Den jämför partiernas programtexter mot frågor — partier kan ha policypositioner som inte syns i programtexterna eller som har ändrats sedan programmet skrevs. Källa: SND samlingen 'Vi vill...' samt direkt från partiernas hemsidor."

Varje evidens-citat länkar till SND:s landningssida för dokumentet.

## Verifierat

Kärnkraftsfrågan med alla 8 partier:
- M: 5 (high) — 4 evidens
- SD: 5 (high) — 4 evidens
- KD: 5 (high) — 0 evidens (kan vara att KD:s 2022-manifest inte direkt nämner kärnkraft, men modellen vet ändå)
- L: 5 (high) — 4 evidens
- S: 4 (medium) — 3 evidens
- C: 3 (low) — 3 evidens
- V: 1 (low) — 3 evidens
- MP: 1 (high) — 2 evidens

Speglar svensk politisk verklighet rimligt väl. KD:s 0-evidens visar en pipeline-svaghet: när modellen "vet" en stance utifrån generell kunskap men inte hittar stöd i programtexten ger den ändå ett betyg. För hårdare granskning kan vi kräva ≥1 evidens vid high confidence (TODO).

## Vägar framåt

1. **Kräv ≥1 evidens vid high confidence.** I dag tillåten 0; bör skärpas.
2. **Principprogram + valmanifest separat.** Dagens uppsättning är 2022-valmanifest; principprogram (de mer ideologiska) saknas.
3. **Tidsvy.** Visa hur en partis stance på en fråga rört sig 2014/2018/2022.
4. **Egna frågor.** Användarinput med rate-limit. Kräver hCaptcha (infrastruktur finns).
5. **Citatkonflikt-detektor.** När två partier citerar samma idé med olika tolkning.
