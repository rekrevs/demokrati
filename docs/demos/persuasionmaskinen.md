# Persuasionmaskinen

Akt II-demo, riskmärkt. Genererar samma policy-budskap formulerat olika för olika syntetiska väljarprofiler. Visar mekaniken bakom AI-driven personaliserad politisk påverkan.

## Vad demon är — och inte är

**Är:** ett pedagogiskt instrument som visar hur billigt och osynligt AI gör asymmetrisk persuasion. Synliggör vad demokratisk infrastruktur (transparens, annonsspårbarhet, plattformsansvar) behöver hantera.

**Är inte:**
- Ett kampanjverktyg. Ingen verklig partidata, inga verkliga kandidater, inga verkliga väljarprofiler.
- Optimerad för konvertering. Optimerad för pedagogisk kontrast.
- Tillgänglig för bulk-export. UI:t visar exempel — inga distributionsverktyg.

Inramning i UI:t (gult varningskort på launchern + warningCard från modellen i resultatet) är central.

## Pipeline (1 LLM-anrop, ~30–60s)

Single call producerar:
- Generiskt budskap (utan personalisering)
- 3–5 skräddarsydda budskap, en per profil
- För varje skräddarsydd: rhetoricalFrame, emotionalCore, changedLevers
- Avslutande warningCard (titel + 80–140 ord om risker och motmedel)

## Bibliotek (`library.ts`)

8 syntetiska profiler, var och en med ageBand, municipalityType, occupation, interests, concerns, politicalPriority, mediaHabits. Exempel:
- p1: småbarnsförälder i pendlingskommun
- p2: pensionär på landsbygden
- p4: universitetsstudent i storstad
- p5: vårdanställd

4 fiktiva policy-fall:
- AI-vårdtriage i regionen
- AI-granskning av skoluppgifter
- AI-optimerad kollektivtrafik
- AI-stöd i socialtjänstens prioritering

4 kanaltyper: kort socialt inlägg, SMS, e-post, flygblad — påverkar längd och format.

## UI

Launcher:
- Gult varningskort med ethics-text
- Featured-cases (kombination av case + profilset + kanal)

Run-page:
- Generiskt budskap i ett kort
- Skräddarsydda versioner i 2-kolumns grid, var och en med:
  - Profil-id + summary
  - Texten i muted box
  - Frame, emotional core, changed levers (badges)
- Modellens warningCard i amber

## Verifierat

Vårdtriage med 4 profiler i kort-post-format ger:
- 4 distinkta retoriska inramningar:
  - Småbarnsförälder: "Vardagseffektivitet för stressade familjer"
  - Pensionär (landsbygd): "Landsbygdens rättvisa och risk att glömmas bort"
  - Student: "Strukturell rättvisa och algoritmisk maktanalys"
  - Vårdanställd: "Professionell autonomi och arbetsmiljörisk"

Varje profil får 300–400 tecken anpassad text. Skillnaden i emotionell kärna är pedagogiskt slående.

## Säkerhetsåtgärder i kod

- Profile-IDs valideras mot lista; okända kastar fel
- Policy-case-ID valideras
- Inga real-party-mentions (instruerat i system-prompt)
- riskLevel="high" i DemoModule (kan användas av rate-limit senare)
- Inga export-funktioner i UI

## Begränsningar

- Profilbiblioteket är 8 personor — täcker grovt men inte uttömmande.
- Skav-momentet (samma motor kan göra "syntetisk gräsrotsrörelse") är *inte* implementerat — flaggat i specen men medvetet utelämnat så demon inte blir ett operativt verktyg.
