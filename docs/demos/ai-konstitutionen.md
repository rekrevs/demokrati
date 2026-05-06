# AI-konstitutionen

Akt III-demo. Användaren väljer politisk fråga + en uppsättning regler ("konstitutionen"). Demon ställer frågan dels till en standard-assistent (utan regler), dels till samma modell med reglerna kompilerade till en systemprompt. Båda svaren visas sida vid sida med en analys av vad som flyttat sig.

## Pipeline (3 LLM-anrop, ~60–90s)

1. **Baseline** — `BASELINE_SYSTEM_PROMPT` (default helpful assistant) + frågan
2. **Governed** — `compileConstitution(ruleIds)` → systemprompt + frågan
3. **Compare** — strukturerad JSON-analys: `observedChanges[]` + `tradeoffs[]` på fast axelvokabulär (pluralism, tydlighet, neutralitet, handlingskraft, källkrav, minoritetsskydd, korthet, osäkerhetsmarkering)

## Regelbiblioteket (`rules.ts`)

12 regler. Varje rule har `id` (stabil), `label` (UI), `directive` (injiceras numrerad i systemprompt), och valfri `hint`. Exempel:

- `no_party_recommendation` — "Du får inte rekommendera, ranka eller endossera något specifikt politiskt parti."
- `multiple_perspectives` — "Presentera alltid minst två substantiellt olika perspektiv…"
- `fact_vs_value` — "Markera tydligt vad som är empiriska påståenden och vad som är värderingar."

`compileConstitution` mappar id → directive och bygger den slutgiltiga systemprompten.

## UI

Launcher har:
- Klickbara exempel-kort som fyller i fråga + förvald regeluppsättning
- Textarea för egen fråga (8–400 tecken)
- 12 togglebara regelkort med hint-text
- Räknare på antal valda regler
- Stor "Kör"-knapp

Run-page visar:
- Två kolumner: ostyrt vs regelstyrt svar (regelstyrt highlighted med brand-border)
- Active rules som badge-lista under det regelstyrda svaret
- "Vad ändrades?" med 3–6 punkter
- "Trade-offs" som rutnät med pil-ikoner (↑ ökade, ↓ minskade, − oförändrad) + förklarande text
- Methods-drawer med kompilerad systemprompt (transparens)

Stage-läge med QR-röstning är skissat i specen men ligger i v1.1 — för en scen-demo räcker det att operatören väljer regelset live i launchern.

## Begränsningar

- "Trade-offs" är heuristisk självbedömning av modellen — inte mätt.
- Två körningar med samma input kan ge något olika observerade förändringar (temperatur 0.4 på baseline/governed, 0.2 på compare).
- Reglerna är pedagogiska — inte en faktisk demokratisk reglering. Etiken är "se hur normativa val syns i output", inte "så här ska AI styras".

## Verifierat

Featured-fall "Vilket parti har bäst klimatpolitik?" med default-regler (no_party_recommendation, multiple_perspectives, fact_vs_value, mark_uncertainty) producerar:
- Ostyrt svar: 1238 tecken, ofta beskrivande och mer påståendelikt
- Regelstyrt svar: 1287 tecken, balanserat med flera perspektiv och osäkerhetsmarkeringar
- 6 observerade förändringar
- 6 trade-off-axlar med tydlig riktning

Total ~60–90s per körning.
