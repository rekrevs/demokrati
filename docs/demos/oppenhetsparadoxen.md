# Öppenhetsparadoxen

Akt I-demo. Tar en originaltext (t.ex. ett kommunalt beslut) och producerar fem målgruppsversioner samtidigt — civic, ungdom, lätt svenska, sociala-medier-kort, rubrik+ingress. För varje version diffar pipelinen propositioner mot originalet och flaggar konkreta betydelseförskjutningar.

## Pipeline (1 stor LLM-anrop, ~60–90s)

Single call producerar all output. Modellen får direktiv per målgrupp och måste returnera strukturerad JSON med diffs grundade i bokstavliga utdrag.

## Diff-typologi

7 typer på en 3-stegs severity-skala (low/medium/high):
- `dropped_condition` — villkor borttaget
- `dropped_exception` — undantag borttaget
- `changed_actor` — subjekt för skyldighet/möjlighet flyttat
- `changed_modality` — "ska" → "bör" eller omvänt
- `simplified_threshold` — numeriskt tröskelvärde rundat eller borttaget
- `added_emphasis` — retorik tillagd
- `lost_specificity` — specifik kategori blev generisk

Varje diff kräver bokstavligt utdrag från BÅDE original och omarbetning. Pipelinen instruerar modellen att inte påstå juridisk expertis — det är textanalys, inte rättslig bedömning.

## Featured-fall

4 syntetiska beslutstexter:
- Kostpolicy i kommunal regi (vegetabilisk mat-andel)
- Miljözon klass 3 i innerstaden
- Förseningsavgift på folkbibliotek
- Reviderade villkor för kulturstöd (juridiskt tätt kontrollfall)

## UI

- Original visas i översta kortet
- Fem versionskort, var och en med:
  - Audience-namn + diff-räknare
  - Audience-note (vem versionen är för)
  - Den omarbetade texten
  - Shift-summary (1–2 meningar)
  - Diffs-lista med severity-färg och original/omarbetad-utdrag sida vid sida (rött för high, gult för medium, grått för low)

## Verifierat

Kostpolicy-fallet ger:
- Civic: 0 diffs (trogen)
- Ungdom: 1 diff
- Lätt svenska: 4 diffs
- Sociala medier-kort: 3 diffs
- Rubrik+ingress: 2 diffs

Förskjutningarna ökar med radikalare målgrupp — exakt poängen: ju enklare språk, desto mer betydelse riskerar att flyttas.

## Begränsningar

- Modellen påstår inte juridisk expertis. Severity-skalan är heuristisk.
- Vissa diffs kan vara stilistiska och flaggas trots det. Intuitionen "high = ändrar substans" stämmer mestadels men är inte garanterad.
- Original måste vara på svenska för att Swedish FTS-stilen ska funka. Engelska och arabiska originaltexter har vi inte testat.
