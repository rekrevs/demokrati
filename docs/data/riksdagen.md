# Riksdagens öppna data — anföranden

Verifierad 2026-04-24 mot `https://data.riksdagen.se`. Alla exempel-URL:er har faktiskt anropats och returnerat användbar data.

## Endpoints vi använder

### 1. Lista anföranden (metadata + länkar)

```
GET https://data.riksdagen.se/anforandelista/?rm=2025/26&sz=15&utformat=json&anftyp=Nej
```

- Returnerar JSON med `anforandelista.@antal` och `anforandelista.anforande[]`.
- Varje objekt innehåller fullständig metadata: `dok_id`, `dok_titel`, `dok_rm`, `dok_datum`, `avsnittsrubrik`, `underrubrik`, `kammaraktivitet`, `anforande_id` (UUID), `anforande_nummer`, `talare`, `parti`, `replik` ("N"/"ja"), `systemdatum`, `anforande_url_xml`, `anforande_url_html`, `protokoll_url_www`.
- **Gotcha: `anforandetext` finns som fält i JSON-listan men är i praktiken tomt.** Full text måste hämtas separat via `anforande_url_xml`.
- Se `data/samples/riksdagen/list-response.json` för ett verkligt exempel (15 anföranden, ~17 KB).

**Query-parametrar vi har verifierat:**

| Parameter | Syfte | Exempel |
|---|---|---|
| `rm` | Riksmöte | `2025/26` (URL-encodat `2025%2F26`) |
| `sz` | Max antal i svar | `1`–`500` |
| `utformat` | Responsformat | `json`, `xml` (html finns men returnerar sidmarkup) |
| `anftyp` | Filtrera typ | `Nej` exkluderar repliker; standardsökningen inkluderar dem |
| `parti` | Partifilter | `S`, `M`, `SD`, etc. Kan kombineras |
| `sok` | Fritextsökning | URL-encodad söksträng |
| `from`, `tom` | Datumintervall | `2026-04-01` respektive `2026-04-23` |

**`replik`-värden observerade i verkliga data:** `"N"` (standardanförande). Repliker har sannolikt `"ja"` men dök inte upp i vårt sample (första 15 i `rm=2025/26` innehöll inga repliker). Båda anropen (med och utan `anftyp=Nej`) gav samma 15 anföranden eftersom ingen var replik.

### 2. Ett specifikt anförandes fulltext

```
GET https://data.riksdagen.se/anforande/{dok_id}-{anforande_nummer}
```

- **Obs:** URL:en använder `dok_id + "-" + anforande_nummer` (t.ex. `HD09109-88`), **inte** `anforande_id` (UUID). Fältet `anforande_url_xml` i list-responsen ger färdigbyggd URL — använd den.
- Returnerar XML med alla metadata-fält plus `<anforandetext>`.
- `anforandetext`-innehållet är **HTML-escaped** (`&lt;p&gt;...&lt;/p&gt;`). Måste HTML-dekodas före användning. Paragraferna är `<p>`-taggade.
- `utformat=json`-varianten returnerar HTTP 500 "Input string was not in a correct format" — så singel-fetch måste ske via XML.
- Se `data/samples/riksdagen/single-speech.xml` (~2 KB).

Felaktiga ID:n (inkl. UUID-formen) ger HTTP 200 med XML-stubb `<anforande not="felaktigt anrop. 5">` — kolla alltid `anforandetext`-längd efter fetch.

### 3. Bulk-export

Prövade paths:
- `data.riksdagen.se/dataset/anforande/` → 404
- `data.riksdagen.se/dataset/anforanden/` → 404
- `data.riksdagen.se/anforande/arkiv/` → 200 men returnerar `<anforande not="felaktigt anrop. 1">` vid direkt anrop

**Slutsats:** ingen publik bulk-CSV hittad. Vi måste iterera list-endpoint + XML-fetch per anförande.

## Licens och attribution

Enligt `riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/`:

> *"Öppna data får användas fritt utan avgifter eller licenser. Ange dock alltid Sveriges riksdag som källa."*

Fri användning med attributionskrav. Ingen formell CC-licens utsatt — reglerna är Riksdagens egna. Vi måste visa "Källa: Sveriges riksdag" (eller motsvarande) synligt i Riksdagsradarns UI.

## Ingestionsstrategi för Riksdagsradarn

**Per körning:**
1. Hämta `anforandelista` för vald `rm`/datumperiod/parti, sidvis med `sz=500` (stora sidor minskar round-trips).
2. För varje anförande: hämta `anforande_url_xml`, HTML-dekoda `anforandetext`, strippa `<p>` (behåll styckebrytningar).
3. Chunka per `<p>`-paragraf (typiska paragrafer är 100–400 tecken — vissa är längre; splitta efter ~800 tecken om så).
4. Embedda varje chunk (1536-dim) och lagra med metadata i `source_chunks`.

**Cache-strategi:**
- Varje `anforande_id` är immutabelt — cacha XML-fetch "för evigt".
- List-endpoint kan hämtas per-dag som nightly job.

**Chunk-metadata vi behåller:**
```json
{
  "dok_id": "HD09109",
  "dok_datum": "2026-04-23",
  "anforande_id": "c70b5649-...",
  "anforande_nummer": 88,
  "talare": "Socialministern Jakob Forssmed (KD)",
  "parti": "KD",
  "avsnittsrubrik": "Frågestund",
  "underrubrik": "Statsbidrag till Förenade Islamiska Föreningar i Sverige",
  "replik": "N",
  "paragraph_index": 2,
  "source_url": "https://data.riksdagen.se/anforande/HD09109-88"
}
```

## Rate-limits / throttling

Inga uttryckliga rate-limits publicerade. Observerat: sekventiella anrop (~10/sec) går igenom utan throttling. Rimligt att hålla sig under 5/sek parallellt och använda exponential backoff vid fel.

## Gotchas (lessons learned denna undersökning)

1. **`anforandetext` är tomt i JSON-listan** — hämta alltid separat XML.
2. **Singel-endpoint JSON (`?utformat=json`) returnerar HTTP 500** — använd XML.
3. **`anforande_id` (UUID) funkar inte som URL-path** — använd `dok_id-anforande_nummer` från `anforande_url_xml`.
4. **Texten är HTML-escaped i XML** (`&lt;p&gt;`) — dekodera innan parsning.
5. **Vissa anföranden (procedurella) saknar text** — filtrera bort `<anforandetext>` som är tomt efter dekodning.
6. **Ministrar listas under ministerns egen parti** (`parti=KD` för statsråd Forssmed), inte "regeringen" — viktigt vid partivis aggregering.

## Sample-filer som redan ligger i repo

```
data/samples/riksdagen/
├── list-response.json      16891 B  — 15 anföranden, rm 2025/26, med alla metadata
├── list-no-repliker.json   ~17 KB  — samma fråga med anftyp=Nej
└── single-speech.xml        1937 B — ett fullständigt anförande med text
```
