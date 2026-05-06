# demokrati — AI och demokrati-demosvit

> Explorativt RISE-projekt. Sju webbdemos om AI som demokratisk lins, påverkansmotor och styrningsobjekt. Avsedd för publik körning på `demokrati.janson.org`. v1: alla 7 demos klara lokalt, deploy återstår.

Den här filen är intro + status. Djupare läsning:
- [`docs/conventions.md`](./docs/conventions.md) — kodmönster, DemoModule-anatomi, hur man bygger ett nytt demo
- [`docs/gotchas.md`](./docs/gotchas.md) — fallgropar vi har sprungit på
- [`docs/data/*.md`](./docs/data) — datakällsundersökningar (Riksdagen, SND)
- [`docs/demos/*.md`](./docs/demos) — per-demo dokumentation

## Produktstatus (v1)

7/7 demos shippade lokalt. VPS-deploy är T-0011 (READY) + T-0019 (full v1 deploy).

| # | Demo | Akt | Pipeline-typ | Status |
|---|---|---|---|---|
| 1 | [Riksdagsradarn](./docs/demos/riksdagsradarn.md) | I — lins | RAG över riksdagsanföranden | DONE |
| 2 | [Oenighetskartan](./docs/demos/oenighetskartan.md) | I — lins | Kuraterat corpus → inferrerade axlar | DONE |
| 3 | [Öppenhetsparadoxen](./docs/demos/oppenhetsparadoxen.md) | I — lins | Originaltext → 5 målgruppsversioner + diff | DONE |
| 4 | [Språkdriften](./docs/demos/sprakdriften.md) | II — påverkan | Samma fråga × N språk | DONE |
| 5 | [Programkompassen](./docs/demos/programkompassen.md) | II — påverkan | RAG över partiprogram → stance-matris | DONE |
| 6 | [Persuasionmaskinen](./docs/demos/persuasionmaskinen.md) | II — påverkan | Syntetiska profiler → tailored messages (riskmärkt) | DONE |
| 7 | [AI-konstitutionen](./docs/demos/ai-konstitutionen.md) | III — styrning | Baseline vs regelstyrt svar + trade-offs | DONE |

Datakorpora ingjorda i Postgres+pgvector:
- 500 riksdagsanföranden, april 2026 (Riksdagsradarn)
- 8 partiers valmanifest 2022 (MP=2018) — 795 chunks (Programkompassen)

QR-publikröstning för AI-konstitutionen är skissad i originalspecen men inte byggd; v1.1.

## Produktfilosofi

- **Inga content-guardrails** på demo-output. Persuasionmaskinen ska visa vad tekniken faktiskt kan — inte en städad version. Det är hela poängen med en forskningsdemonstrator.
- **Abuse-skydd kvarstår**: Redis rate-limit, hCaptcha (no-op tills SECRET sätts), hårt dagsmax per provider, admin-lösenord för `/ops`.
- **Inga användarkonton i v1**.
- **Inga överanspråk**: Språkdriften visar "observerade variationer" inte "mätt bias". Öppenhetsparadoxen flaggar "betydelseförskjutningar" inte "juridisk risk". Programkompassen är inte en röstningsrådgivare. Oenighetskartan är analytisk hypotes, inte psykologisk sanning. AI-konstitutionen är pedagogiskt fönster, inte demokratisk reglering.

## Tech stack

- **Frontend & API**: Next.js **16** (App Router, Turbopack, typedRoutes top-level), TypeScript strict, Tailwind v4, shadcn/ui-stil komponenter (egenbyggda Button/Card/Badge/Dialog/Tabs), next-intl 4
- **Locales**: sv / en / ar. Arabiska är RTL — använd `dir`-attribut på html i `[locale]/layout.tsx`, `rtl:`-varianter där det spelar roll
- **Worker**: separat Node-process via `tsx watch worker/src/index.ts`, BullMQ + ioredis, tre köer (`demo-run`, `ingest`, `warm`)
- **Lagring**: Postgres med pgvector + tsvector (Swedish FTS) + Redis + lokal disk för artefakter
- **Modellrouter**: provider-agnostisk med profiler (`fast` / `strong` / `multilingual` / `embedding` / `safe` / `compare`). Hårdkoda aldrig modellnamn i demo-kod — gå alltid via en profil
- **Validering**: alla LLM-output går via Zod-schema med en retry; pipeline-koden saneras (drop hittade IDs, fyll saknade fält)
- **Prompts** ligger per demo i `src/lib/demos/{demo}/prompts.ts` med ett `PROMPT_VERSIONS`-objekt — bumpa vid prompt-ändring för att invalidera cache
- **Testning**: Vitest unit + integration (`pnpm test:int`), Playwright E2E (kommer)

## Filstruktur

```
src/
  app/
    [locale]/
      page.tsx                    # demo-index
      layout.tsx                  # html/body med lang+dir
      demo/{slug}/
        page.tsx                  # SSR wrapper
        launcher.tsx              # client launcher
        runs/[runId]/
          page.tsx                # SSR wrapper för run
          run-view.tsx            # client polling + rendering
          (demo-specifika subkomponenter)
    ops/                          # admin under separat layout (locale-fri)
    api/
      demos/                      # GET /api/demos
      run/[slug]/                 # POST submit
      runs/[id]/                  # GET status + progress
      admin/                      # /api/admin/login, /logout
  components/
    shared/                       # ResultCard, ComparisonGrid, MethodsDrawer, SharePanel
    ui/                           # Button/Card/Badge/Dialog/Tabs (shadcn-stil)
  lib/
    demos/
      module.ts                   # DemoModule interface + ProgressUpdate
      registry.ts                 # idempotent register/get/list
      pipeline.ts                 # submitRun + executeRun + ctx.setProgress
      cache-key.ts                # stableStringify + sha256
      index.ts                    # registerAllDemos
      nav.ts                      # demo-katalog (act + status) för startsidan
      {slug}/                     # per-demo modul
        schemas.ts
        prompts.ts
        pipeline.ts
        scenarios.ts              # featured cases
        index.ts                  # DemoModule
    llm/                          # provider-adapters + router + profiles
    retrieval/                    # riksdag + program (hybrid FTS + pgvector + RRF)
    ingest/                       # riksdagen
    db/                           # Prisma-klient
    queue/                        # BullMQ + enqueue helper
    auth/                         # admin cookie
    ratelimit/                    # Redis fixed-window
    captcha/                      # hCaptcha verifier (no-op when secret unset)
worker/
  src/
    index.ts                      # boots Worker per kö
    handlers/                     # demo-run, ingest, warm
prisma/                           # schema.prisma + migrations
data/samples/                     # fixtures (riksdagen XML, SND txt/pdf)
docs/                             # (linked from this file)
scripts/                          # ingest-riksdagen.ts, ingest-snd-programs.ts, test-retrieval.ts
wotan/                            # backlog.json + dev-log/ — använd /wotan
messages/                         # sv.json, en.json, ar.json
```

## Arbetssätt

- **Alla tasks via `/wotan`**. Redigera inte `backlog.json` direkt.
- **TDD när det går**: rött test innan ny logik. För UI-komponenter och prompts är tester sparsamma — fokus är schemas, pipelines, cache-key, retrieval.
- **Dataåtkomst verifieras innan demos byggs** (lärdom från T-0002/T-0003).
- **Långa autonoma pass**: gör klart större helheter innan återkoppling.
- **Hur man bygger ett nytt demo**: se [`docs/conventions.md`](./docs/conventions.md#att-bygga-ett-nytt-demo) — det är en 12-stegs-checklista.

## Viktiga kommandon

```bash
pnpm install
pnpm dev                          # http://localhost:3000
pnpm worker                       # i separat shell — krävs för att demos ska köra
pnpm test                         # Vitest unit
pnpm test:int                     # Vitest unit + integration (kräver docker:dev körande)
pnpm test:e2e                     # Playwright (browsers ej installerade i v1)
pnpm typecheck
pnpm build
pnpm lint

# Docker-stack (postgres+pgvector + redis)
pnpm docker:dev                   # up -d
pnpm docker:down                  # ner

# Prisma
pnpm prisma migrate dev
pnpm prisma studio

# Ingestion
pnpm tsx scripts/ingest-riksdagen.ts --rm 2025/26 --pageSize 500 --excludeRepliker
pnpm tsx scripts/ingest-snd-programs.ts
pnpm tsx scripts/test-retrieval.ts "kärnkraft kortsiktigt klimat"
```

## Deploy (planerat — T-0011)

- VPS: `64.112.126.34` (Debian 13, 8 GB RAM, delas med GitLab + befintlig Postgres)
- DNS: `demokrati.janson.org` (A-record satt via HostUp UAPI; zon kvar i HostUp cPanel)
- TLS: Caddy + Let's Encrypt i container
- Postgres: återanvänd host-databasen, `demokrati`-db + pgvector-extension
- Reverse proxy + web + worker + redis som Docker Compose-stack
- Ingen Cloudflare. Ingen GitHub Actions (tills vidare).

## Disclaimers (ska finnas synligt på sajten)

> "Dessa demos visar möjligheter och risker med AI i demokratins informationsmiljö. De är inte röstningsrådgivare, kampanjverktyg eller automatiserade beslutsstöd. Alla syntetiska exempel är märkta som syntetiska."

Per-demo disclaimer-text finns i `messages/{locale}.json` under varje demos `dirDisclaimer`-nyckel. Per-demo etisk inramning är dokumenterad i `docs/demos/{slug}.md` under "Etisk inramning".
