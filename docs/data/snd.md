# SND — Svenska partiprogram och valmanifest ("Vi vill...")

Verifierad 2026-04-24 mot `https://snd.se`. Samples faktiskt nedladdade och inspekterade.

## Sammanhang

Samlingen **"Svenska partiprogram och valmanifest"** (kallad "Vi vill...") är ett projekt från Svensk Nationell Datatjänst (SND) vid Göteborgs universitet. Den innehåller partiprogram och valmanifest från slutet av 1800-talet till idag, framför allt från riksdagspartier, som löpande uppdateras. Finansieras av Riksbankens Jubileumsfond.

Ursprung: dokumenten hämtas från partiernas egna officiella hemsidor (enligt SND:s dokumentsidor: *"Hämtat från partiets officiella hemsida"*).

## Åtkomstmekanism

Två nivåer:

### A. Browsing via SND:s webb (verifierat och fungerar)

- Startsida: `https://snd.se/sv/vivill`
- Per parti: `https://snd.se/sv/vivill/party/{party}` (t.ex. `/s`, `/m`, `/sd`, `/c`, `/v`, `/kd`, `/mp`, `/l`)
- Per år: `https://snd.se/sv/vivill/by-year`
- Specifikt dokument: `https://snd.se/sv/vivill/party/{party}/{type}/{year}` (dokumentsida med inline-text)

### B. Direkt fil-nedladdning (verifierat och fungerar)

**URL-mönster:**
```
https://snd.se/sv/vivill/file/{party}/{type}/{year}/txt
https://snd.se/sv/vivill/file/{party}/{type}/{year}/pdf
```

där:
- `{party}` = `s`, `m`, `sd`, `c`, `v`, `kd`, `mp`, `l`, ...
- `{type}` = `p` (principprogram), `v` (valmanifest, riksdagsval), `v_eu` (EU-val)
- `{year}` = fyrsiffrigt år

**Verifierade nedladdningar** (alla returnerade HTTP 200 med korrekt innehåll):

| URL-path | TXT | PDF |
|---|---|---|
| `s/v/2022` (Socialdemokraterna valmanifest 2022) | 32 KB | 1.9 MB |
| `m/v/2022` (Moderaterna valmanifest 2022) | 78 KB | 442 KB |
| `mp/v/2018` (Miljöpartiet valmanifest 2018) | 51 KB | 128 KB |

Ingen auth behövs. Inga rate-limits observerade vid sekventiell nedladdning.

### Textkvalitet

TXT-varianten är **ren UTF-8 med BOM**, välstrukturerad med paragrafbrytningar. Inga OCR-artefakter, ser ut att vara maskinläsbar text från början (inte scannad). Rubriker bevaras som egna rader. Idealiskt för pipeline — ingen PDF-extraktionsrundresa behövs för moderna år.

Exempel (Socialdemokraterna valmanifest 2022):

```
﻿VÅRT SVERIGE KAN BÄTTRE

SOCIALDEMOKRATERNAS VALMANIFEST 2022
VÅRT SVERIGE KAN BÄTTRE

Sverige är ett fantastiskt land. Här finns alla förutsättningar för att leva ett gott liv: friheten, resurserna och omsorgen om varandra. ...
```

## Licens och rättigheter

SND publicerar inte någon enskild formell licens (CC0, CC BY) på Vi vill-samlingen. Det är forskningsdata vars primärt syfte är humaniora-lingvistisk forskning.

**Källmaterialet (partiprogrammen själva)** har respektive parti som upphovsman. Programmen publiceras officiellt för att påverka opinion — de är menade att läsas, citeras och diskuteras.

**Vad vi kan göra med rimlig säkerhet i Programkompassen:**
- Läsa, indexera och analysera texterna ("fair use" för forskning och journalistik).
- Citera korta utdrag som evidence-rader i demon.
- Summera partiernas positioner.
- Referera till SND som källa med länk till originaldokumentets SND-sida.

**Vad vi INTE ska göra utan explicit tillstånd:**
- Publicera fullständiga programtexter in extenso på vår sajt (vi har ju bara korta citat som evidence).
- Hävda att vi har licens på innehållet.
- Skapa derivativa distributioner (det är OK att ha extract-citat + analys; det är inte OK att re-hosta hela dokumentet).

**Praktisk attribution:**
> *"Evidence från partiprogram i samlingen Vi vill... (SND, Göteborgs universitet), ursprungligen publicerat av [parti] år [XXXX]."*

## Primär ingestionsstrategi

1. **Ladda ned TXT-versionerna** för aktuella program/manifest för alla 8 riksdagspartier, täckande minst 2014, 2018, 2022, 2024 där tillgängligt.
2. **Strippa BOM** och normalisera whitespace.
3. **Chunka per logisk rubrik eller paragraf**, typiskt 400–1000 tecken per chunk.
4. **Embedda per chunk** (1536-dim) till `source_chunks` med metadata:
   ```json
   {
     "party": "s",
     "document_type": "valmanifest",
     "year": 2022,
     "source_url": "https://snd.se/sv/vivill/party/s/v/2022",
     "download_url": "https://snd.se/sv/vivill/file/s/v/2022/txt",
     "section": "<heading chunk sits under>",
     "paragraph_index": 7
   }
   ```
5. **För PDF-only-dokument (äldre år)**: använd `pdftotext` eller `pdfminer.six`; kvaliteten är mycket sämre men fortfarande användbar.

## Fallback om SND av något skäl blir otillgängligt

Hämta direkt från partiernas egna hemsidor. Dessa URL:er kan ändras; hålls levande i `data/party-sites.yml` när ingestionen implementeras.

Riksdagspartier och deras officiella digitala hem (att besöka vid ingestion):

| Parti | Hemsida | Noterbart |
|---|---|---|
| S | https://www.socialdemokraterna.se | Valmanifest + partiprogram under "Vår politik" |
| M | https://www.moderaterna.se | "Politik" / "Program" |
| SD | https://sd.se | "Principprogram" + valmanifest |
| C | https://www.centerpartiet.se | "Våra politiska områden" |
| V | https://www.vansterpartiet.se | "Partiprogram" |
| KD | https://kristdemokraterna.se | "Principprogram" |
| MP | https://www.mp.se | "Partiprogram" |
| L | https://www.liberalerna.se | "Politik" / "Program" |

*Dessa URL:er har inte aktivt verifierats i denna undersökning — verifieras när Programkompassen (T-0018) faktiskt byggs.*

## Rekommenderat first-build-urval

För att komma igång med Programkompassen utan att ladda hela korpuset:

1. 8 partiers senaste valmanifest (2022).
2. 8 partiers senaste principprogram där tillgängligt.
3. SD, M, S 2018 också, för att kunna visa tidsdiff.

Totalt ~25 dokument, ~1–2 MB text, ~500–2000 chunks efter splitting. Billigt att embedda (~0.02 USD på `text-embedding-3-small`).

## Sample-filer som redan ligger i repo

```
data/samples/snd/
├── socialdemokraterna-valmanifest-2022.txt     32 KB
├── socialdemokraterna-valmanifest-2022.pdf    1.9 MB
├── moderaterna-valmanifest-2022.txt            78 KB
├── moderaterna-valmanifest-2022.pdf           442 KB
├── mp-valmanifest-2018.txt                     51 KB
└── mp-valmanifest-2018.pdf                    128 KB
```

## Blockers för Programkompassen-builden

Inga. Primär pipeline (direkta SND TXT-nedladdningar) fungerar, fallback (partiernas hemsidor) är välkänd och hanterlig. Licensläget är hanterbart så länge vi stannar vid korta citat + analys och attributerar SND + parti korrekt.
