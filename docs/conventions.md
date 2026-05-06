# Conventions

Kodmönster vi följer i demokrati-projektet. Den som lägger till ett nytt demo eller ändrar pipelines bör läsa det här först.

## DemoModule-anatomin

Varje demo är en `DemoModule<I, O>` registrerad i `src/lib/demos/index.ts` via `registerDemo`. Interface i `src/lib/demos/module.ts`:

```ts
interface DemoModule<I, O> {
  id: string;
  title: string;
  visibility: "public" | "beta" | "hidden";
  supportsLive: boolean;
  supportsCustomInput: boolean;
  riskLevel: "low" | "medium" | "high";
  cacheTTLSeconds: number;
  promptVersions: Record<string, string>;
  modelProfile: string;

  inputSchema: ZodType<I>;
  outputSchema: ZodType<O>;

  getFeaturedScenarios(): Promise<Scenario<I>[]>;
  validateInput(input: I, mode: RunMode): Promise<ValidationResult>;
  run(input: I, ctx: DemoRunContext): Promise<O>;
  renderMeta(output: O): DemoRenderMeta;
}
```

`registerDemo` är **idempotent** — det är medvetet, för att klara HMR-omladdningar och multipla entry points (web + worker).

`DemoRunContext` ger demon tillgång till `runId`, `mode`, `log`, `setProgress`, och `signal` (timeout-styrd).

## Att bygga ett nytt demo

Följande 12 steg upprepas för varje demo. Inget steg är överraskande, men att missa ett (särskilt 4 och 12) ger mystiska fel.

1. **Wotan-task**: `/wotan add` med rimlig storlek (L för nya demos i denna stack).
2. **Schemas** (`src/lib/demos/{slug}/schemas.ts`): Zod input + output. Alla enums som arrays exporteras separat (`SPRAKDRIFTEN_TONES = [...] as const`). Undvik `z.enum(...).default(...)` — se [gotcha #1](./gotchas.md#1-zod-default-bryter-demomodule-generic).
3. **Prompts** (`src/lib/demos/{slug}/prompts.ts`): exportera `PROMPT_VERSIONS = { name: "v1", ... } as const`. Varje prompt en separat funktion `xxxPrompt(args): { system, user }`. Bumpa version vid varje semantisk prompt-ändring — det invaliderar cache-key.
4. **Pipeline** (`src/lib/demos/{slug}/pipeline.ts`): `runXxxPipeline(input, deps): Promise<Output>` där `deps: PipelineDeps = { router?, log?, setProgress? }`. Validera LLM-output via `router.json(profile, req, schema)`. Sanera påhittade IDs, fyll saknade obligatoriska fält. Anropa `setProgress({ phase, message, data? })` vid varje fas.
5. **Scenarios** (`src/lib/demos/{slug}/scenarios.ts`): minst 4 featured cases.
6. **DemoModule** (`src/lib/demos/{slug}/index.ts`): bind ihop till en `DemoModule`. Sätt `riskLevel`, `cacheTTLSeconds`, `modelProfile`, `promptVersions`. `validateInput` bör vara strikt.
7. **Register** i `src/lib/demos/index.ts` — lägg till `import` + `registerDemo(...)` i `registerAllDemos()`.
8. **Seeda Demo-rad i Postgres** — annars FK-fel vid första `submitRun`:
   ```bash
   docker exec -i demokrati-pg-dev psql -U demokrati -d demokrati -c "
     INSERT INTO demos (slug, title, visibility, \"currentVersion\", \"createdAt\", \"updatedAt\")
     VALUES ('{slug}', '{Title}', 'PUBLIC', 'v0.1.0', NOW(), NOW())
     ON CONFLICT (slug) DO NOTHING;"
   ```
9. **UI**:
   - `src/app/[locale]/demo/{slug}/page.tsx` — SSR wrapper, `setRequestLocale(locale)` + render launcher
   - `src/app/[locale]/demo/{slug}/launcher.tsx` — `"use client"`, featured-cards + ev. interaktiva inputs
   - `src/app/[locale]/demo/{slug}/runs/[runId]/page.tsx` — SSR wrapper
   - `src/app/[locale]/demo/{slug}/runs/[runId]/run-view.tsx` — `"use client"` polling + rendering
   - Demo-specifika subkomponenter i samma katalog
10. **i18n** — lägg till en namespace `{slug}` i `messages/{sv,en,ar}.json` med minst: `title`, `tagline`, `intro`, `chooseFeatured`, `run`, `running`, `failed`, `waitingForResult`, `backToDemo`, `methodsTitle`, `dirDisclaimer`. Ha plural-stränger (`{n, plural, ...}`) för räknare.
11. **Uppdatera `src/lib/demos/nav.ts`** — sätt `status: "built"` för demot. Hemsidan läser detta.
12. **Smoke-test** — submit en featured case via `curl POST /api/run/{slug}`, polla `GET /api/runs/{id}` tills COMPLETED, inspektera `output`. Spara även en kort docs-fil i `docs/demos/{slug}.md` med pipeline, kuriosa, begränsningar.

## Pipeline-konvention

Alla pipelines följer samma mönster:

```ts
export interface PipelineDeps {
  log?: (event: string, data?: unknown) => void;
  setProgress?: (update: { phase: string; message: string; data?: Record<string, unknown> }) => Promise<void>;
}

export async function runXxxPipeline(
  input: XxxInput,
  deps: PipelineDeps = {},
): Promise<XxxOutput> {
  const log = deps.log ?? (() => undefined);
  const setProgress = deps.setProgress ?? (async () => undefined);
  log("start", { ... });
  await setProgress({ phase: "...", message: "..." });

  // ... LLM calls via router

  return outputSchema.parse({ ... });
}
```

`setProgress` skriver till `runs.progress` (JSON-kolumn) som UI:t pollar via `GET /api/runs/[id]`. Fas-sekvensen visas som en ordnad lista i run-vyn (`PHASE_ORDER`-konstant per demo).

## Cache-key

`src/lib/demos/cache-key.ts` beräknar deterministisk hash över:
- demo slug
- input hash (stable JSON serialisation, alfabetisk nyckelordning)
- promptVersions (alla versionssträngar)
- modelProfile
- valfri sourceRevision

Bumpa `PROMPT_VERSIONS.{name}` när du ändrar en prompt — det invaliderar cache och tvingar omkörning.

## Modellrouter

`src/lib/llm/router.ts` exponerar `text`, `json`, `embed`. Profiler resolveras från env-vars (`MODEL_FAST_PROVIDER`, `MODEL_FAST_NAME`, etc.). `json()` validerar mot Zod-schema och gör en retry med korrigerings-prompt om första försöket bryter schema.

**Hårdkoda aldrig modellnamn i demo-kod**. Gå alltid via en profil. Om en demo behöver en specifik typ av modell (t.ex. cross-provider compare), introducera en ny profil och dokumentera den i [docs/demos](./demos)/.

## i18n-konvention

- Varje demo äger en namespace i `messages/{sv,en,ar}.json`
- Plural-format för räknare: `"itemsCount": "{n, plural, =1 {1 item} other {# items}}"` — arabiska behöver `=2 {…} few {…} many {…}` för korrekt grammatik
- RTL-språk: använd `dir`-attribut på element som visar fri text på språket, inte bara på `html`
- Aldrig hårdkoda svenska/engelska/arabiska strängar i komponenter — alltid via `useTranslations`

## Etisk inramning

Per-demo disclaimers ska:
1. Stå **i UI:t**, inte bara i koden — som botten på run-vyn (`dirDisclaimer`-nyckel) och som varnings­banner när det är en risk-demo
2. Stå **i `docs/demos/{slug}.md`** under "Etisk inramning"
3. Vara **specifik** — inte boilerplate. T.ex. Persuasionmaskinen har en strikare framing än Programkompassen

`riskLevel` på DemoModule-nivå styr potentiellt rate-limit och CAPTCHA-strikthet (infrastruktur finns, ej aktivt kopplat ännu).

## Ingestion-konvention

Externa data (Riksdagen, SND, etc.) ingjuts via CLI-skript i `scripts/`:
- Idempotent på `(sourceType, externalId)`
- Embedda chunks via modellroutern (`embedding`-profil) i samma transaktion som chunken skrivs
- Använd `$executeRawUnsafe` för pgvector-kolumnen (Prisma stödjer inte `vector` direkt)
- Logga progress per N items
- Dokumentera schema och gotchas i `docs/data/{source}.md`

## Ny ingestion-källa

1. Verifiera tillgång + format mot riktig endpoint **innan** kod skrivs (lärdom T-0002/T-0003)
2. Spara fixtures i `data/samples/{source}/`
3. Skriv `docs/data/{source}.md` med: endpoints, schema, licens/attribution, gotchas, ingestionsstrategi
4. Skriv `src/lib/ingest/{source}.ts` med rena hjälpfunktioner + en `ingestRange` orchestrator
5. Skriv `scripts/ingest-{source}.ts` CLI med arg-parsing
6. Lägg till migration för ev. nya index (FTS, HNSW)
