# Gotchas

Saker som har bitit oss och hur vi löste dem. Numrerad lista — refererad från [`docs/conventions.md`](./conventions.md) och kommentarer i koden.

## 1. Zod `.default()` bryter `DemoModule`-generic

**Symptom**: `Type 'X | undefined' is not assignable to type 'X'` i `inputSchema`-fältet på `DemoModule`.

**Orsak**: `z.enum(...).default(...)` widar input-typen (tillåter undefined) men output-typen (efter parse) är konkret. `DemoModule<I, O>` använder samma type för in och ut, så typecheck kraschar.

**Fix**: dropp `.default(...)` från Zod-schemat. Exportera default-värdet som separat konstant istället:

```ts
export const sprakdriftenInputSchema = z.object({
  ...,
  style: z.enum(SPRAKDRIFTEN_STYLES),  // INTE .default("overview")
});
export const DEFAULT_SPRAKDRIFTEN_STYLE: SprakdriftenStyle = "overview";
```

Användarcode (UI / featured scenarios) sätter värdet explicit.

## 2. `server-only` kraschar i workern

**Symptom**: workern (kör via `tsx watch`) startar och kraschar omedelbart med:
> `This module cannot be imported from a Client Component module. It should only be used from a Server Component.`

**Orsak**: `server-only`-paketet kastar fel i alla bundles utom Next.js Server Components. tsx ser inte den miljö-flaggan.

**Fix**: ta bort `import "server-only";` från moduler som workern importerar. Workern är trusted server-side, så det är säkert att exponera. Klient-läckage hindras ändå av att UI-komponenter importerar typer från snävare paths (`schemas.ts`, inte `index.ts`).

## 3. typedRoutes behöver build-cykel efter nya routes

**Symptom**: typecheck klagar på en route som faktiskt finns i `app/`-trädet.

**Orsak**: Next 16:s `typedRoutes: true` genererar `Route`-typen i `.next/types/routes.d.ts` vid `next build`. Innan en build körts efter att en ny route lagts till finns inte typen.

**Fix**: kör `pnpm build` en gång efter en ny route — det regenererar typerna. Sen funkar `pnpm typecheck`.

## 4. BullMQ jobIds får inte innehålla `:`

**Symptom**: `Error: Custom Id cannot contain :` vid `queue.add()`.

**Orsak**: BullMQ använder `:` som separator i Redis-nycklar.

**Fix**: använd `-` eller `_`. Vi använder `run-${runId}` (se `src/lib/demos/pipeline.ts`).

## 5. next-intl `<Link>` accepterar inte `{ pathname, params }`-objekt

**Symptom**: runtime-fel:
> `Dynamic href '/sv/demo/[slug]' found in <Link> while using the '/app' router, this is not supported.`

**Orsak**: vi försökte vara fina och skicka `{ pathname: "/demo/[slug]", params: { slug } }` — next-intl expanderar inte den formen, så `[slug]` literalt hamnade i URL:en.

**Fix**: skicka konkret expanded sträng (next-intl prepender locale själv):

```tsx
<Link href={`/demo/${slug}` as never}>
```

`as never`-cast eftersom typedRoutes' Route-union inte widar för runtime-template-literals. Pragmatiskt OK.

## 6. Vitest integration-tester på samma BullMQ-kö konkurrerar

**Symptom**: integration-test som ska se en specifik job-output ser noll, eller får output från fel test.

**Orsak**: Vitest kör test-filer parallellt by default. När två filer skapar var sin Worker mot samma kö (`demo-run`) plockar de varandras jobb.

**Fix**: kör integration-svit serialiserat — `package.json` har `"test:int": "RUN_INTEGRATION=1 vitest run --no-file-parallelism"`. Unit-tester kör fortfarande parallellt.

## 7. Demo-rad måste seedas i DB innan första submitRun

**Symptom**: `Foreign key constraint violated on the constraint: runs_demoSlug_fkey`.

**Orsak**: `Run`-tabellen har FK på `Demo`. Ingen automatisk insert sker när `registerDemo()` anropas; de är två olika världar (kod och DB).

**Fix**: efter att en ny demo läggs till — seeda en rad:

```sql
INSERT INTO demos (slug, title, visibility, "currentVersion", "createdAt", "updatedAt")
VALUES ('{slug}', '{Title}', 'PUBLIC', 'v0.1.0', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
```

(En framtida förbättring: en startup-hook som synkar `registerAllDemos()` mot DB.)

## 8. HMR + registerDemo behöver vara idempotent

**Symptom**: efter Turbopack HMR-reload kastar `registerDemo` "already registered with a different instance".

**Orsak**: HMR omladdar moduler, vilket skapar nya instanser av demo-objekten. Den gamla instansen sitter kvar i `registry`-Map:en.

**Fix**: `registerDemo` skriver alltid över befintlig (`registry.set(mod.id, mod)`) — vi tar inte ID-konflikt som fel. Se kommentar i `src/lib/demos/registry.ts`.

## 9. Riksdagens `p`-parameter paginerar inte

**Symptom**: ingestion fetchade `?p=0..3` men fick samma 50 anföranden varje gång.

**Orsak**: `data.riksdagen.se/anforandelista/` accepterar `p` men ignorerar det med `rm`-filter (verifierat 2026-04-27).

**Fix**: använd `sz=500` (eller upp till 1000+ — `sz` skalar). Single-page emulation-loop i `src/lib/ingest/riksdagen.ts`. För full korpustäckning behöver vi köra med olika `parti`-filter (deterministisk fallback).

## 10. Riksdagens JSON-list returnerar tomt `anforandetext`

**Symptom**: ingestion verkar fungera men `anforandetext` är `""` för alla anföranden.

**Orsak**: även om fältet finns i JSON-svaret är det alltid tomt. Full text serveras bara via XML-endpointen.

**Fix**: hämta XML separat per anförande via `anforande_url_xml` (alltid med i list-svaret). Texten där är HTML-escaped (`&lt;p&gt;`) — dekoda och splitta på `<p>`. Pipeline finns i `src/lib/ingest/riksdagen.ts`.

## 11. LLM-output trunkeras vid stora strukturerade svar

**Symptom**: `router.json()` får tillbaka avhugget JSON och kastar `SchemaValidationError`. Output ser ut att avbryta mitt i en sträng.

**Orsak**: `maxTokens` för lågt, eller modellen försöker producera för mycket strukturerad output i ett anrop.

**Fix-strategier**:
- Bumpa `maxTokens` (t.ex. 8000 eller 12000 för Sonnet)
- Splitta i flera LLM-anrop (Riksdagsradarn: claims-pass + narratives-pass)
- Strama åt prompten ("max 4 claims per party, max 250 chars per claim")
- Minska input (`retrievalLimit` för RAG-demos)

## 12. PATH töms mellan vissa Bash-anrop

**Symptom**: `command not found: pnpm` eller `command not found: git` i en Bash-tool-call.

**Orsak**: vissa Bash-kontexter ärver inte den interaktiva shellens PATH (särskilt efter `cd` med subshell-isolation).

**Fix**: sätt `export PATH=/opt/homebrew/bin:/usr/bin:/bin:$PATH` explicit i toppen av varje Bash-anrop som behöver `pnpm`, `git`, `docker`, eller `curl`.

## 13. Edit-tool kräver Read först — och cache invalideras vid externa modifikationer

**Symptom**: `File has not been read yet. Read it first before writing to it.` på en fil som faktiskt har lästs tidigare i sessionen.

**Orsak**: när andra processer (linter, Next.js auto-format, prisma generate) ändrar filen efter att vi läst den, måste den läsas om innan Edit accepteras.

**Fix**: gör en kort `Read` (några rader) precis innan Edit på filer som riskerar att ha modifierats utanför vår kontroll.

## 14. Featured cases är inte automatiskt cachade

**Symptom**: första klick på en featured case tar full live-runtime (~30s–2min).

**Orsak**: cache fylls av faktiska `executeRun`-anrop. Featured cases nämns bara i `scenarios.ts` — de blir cachade när de första gången körs.

**Fix-väg framåt** (T-0019): nattlig cache-warmer-job som kör alla featured scenarios via BullMQ `warm`-kön. Infrastrukturen finns (kö + handler-stub i `worker/src/handlers/warm.ts`).

## 15. Prisma migrate dev kan misslyckas på fel kolumnnamn — Prisma använder camelCase

**Symptom**: migration kraschar med `column "published_at" does not exist`.

**Orsak**: Prisma använder camelCase som default när inte `@map("snake_case")` är satt på fältet. Vi har `@@map("source_docs")` på tabellen men inte per-kolumn.

**Fix**: använd `"publishedAt"` (citerat) i raw SQL-migrations. När en migration har misslyckats, rensa `_prisma_migrations`-raden och redeploya:

```sql
DELETE FROM _prisma_migrations WHERE migration_name = '...';
```
