# demokrati — AI och demokrati-demosvit

> Explorativt RISE-projekt. Sju publika webbdemos om AI som demokratisk lins, påverkansmotor och styrningsobjekt. Körs publikt på `demokrati.janson.org`.

## Produktfilosofi

- **Inga content-guardrails** på demo-output. Persuasionmaskinen ska visa vad tekniken faktiskt kan — inte en städad version. Det är hela poängen med en forskningsdemonstrator.
- **Abuse-skydd kvarstår**: Redis rate-limit, hCaptcha, hårt dagsmax per provider, admin-lösenord för `/ops`.
- **Inga användarkonton i v1**. QR-röstning i AI-konstitutionen är sessionsbaserad.
- **Inga överanspråk**: Språkdriften visar "observerade variationer" inte "mätt bias". Öppenhetsparadoxen flaggar "betydelseförskjutningar" inte "juridisk risk". Programkompassen är inte en röstningsrådgivare.

## Tech stack

- **Frontend & API**: Next.js 15 (App Router), TypeScript strict, Tailwind v4, shadcn/ui, next-intl.
- **Locales**: sv / en / ar. Arabiska är RTL (använd `rtl:`-varianter genomgående).
- **Worker**: separat Node-process med BullMQ.
- **Lagring**: Postgres (med pgvector) + Redis + lokal disk för artefakter (S3-kompatibel senare vid behov).
- **Modellrouter**: provider-agnostisk med profiler (fast / strong / multilingual / embedding / safe / compare). Hårdkoda aldrig modellnamn i demo-kod.
- **Validering**: alla LLM-output går via Zod-schema. Alla prompts versionerade i `src/lib/prompts/`.
- **Testning**: Vitest (unit/integration) + Playwright (E2E).

## Deploy

- VPS: `64.112.126.34` (Debian 13, 8 GB RAM, delas med GitLab + Postgres).
- DNS: `demokrati.janson.org` → A-record via HostUp UAPI. Zon ligger kvar i HostUp cPanel.
- TLS: Caddy + Let's Encrypt i container.
- Postgres: återanvänd host-databasen, ny `demokrati`-db + pgvector.
- Reverse proxy + web + worker + redis som Docker Compose-stack.
- Ingen Cloudflare. Ingen GitHub Actions (tills vidare).

## Arbetssätt

- **Alla tasks via `/wotan`**. Redigera inte `backlog.json` direkt.
- **TDD är obligatoriskt**, även för features. Rött test först, grön implementation, refaktor.
- **Dataåtkomst verifieras innan demos byggs**. Inga fejk-API:er som substitut för otestad verklighet.
- **Långa autonoma pass**: gör klart större helheter innan återkoppling.

## Demos (v1)

1. Riksdagsradarn — spårbar sammanfattning av riksdagsdebatter
2. Språkdriften — flerspråkig politisk driftdetektor ← **byggs först som provsmak**
3. Oenighetskartan — dynamisk konfliktvisualisering (Transformationsmotorn inbyggd)
4. Öppenhetsparadoxen — transformation med betydelseförskjutningar
5. AI-konstitutionen — publikstyrd systemprompt med QR-röstning
6. Persuasionmaskinen — personaliserad påverkan på syntetiska profiler
7. Programkompassen — partiprogram → positioner (ej SVT-baserad)

## Viktiga kommandon

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm test             # Vitest
pnpm test:e2e         # Playwright
pnpm lint
pnpm typecheck
pnpm build

# Worker
pnpm worker

# Databas
pnpm prisma migrate dev
pnpm prisma studio
```

## Datakällor

- **Riksdagens öppna data**: anföranden via `data.riksdagen.se`. Se `docs/data/riksdagen.md` när den finns.
- **SND partiprogram**: Svenska partiprogram och valmanifest via `snd.se`. Se `docs/data/snd.md` när den finns.
- **Offentliga beslut**: manuellt kurerade i v1.

## Filstruktur

```
src/
  app/                      # Next.js App Router (routes)
  components/shared/        # Återanvändbara UI-komponenter
  components/demos/         # Demo-specifik UI
  lib/
    demos/                  # DemoModule + pipeline + per-demo-moduler
    llm/                    # Provider-adapters + router
    prompts/                # Versionerade prompts
    retrieval/              # Embedding + chunking + hybrid-search
    ingest/                 # Riksdagen/SND/etc.
    db/                     # Prisma-klient
    queue/                  # BullMQ-setup
worker/                     # BullMQ worker-process
prisma/                     # schema.prisma + migrations
data/                       # Samples + fixtures
docs/                       # Dokumentation
  data/                     # Datakällor
  deploy/                   # VPS-driftrunbooks
wotan/                      # Tasks (backlog.json + dev-log/)
tests/e2e/                  # Playwright
```

## Disclaimers (ska finnas synligt)

> "Dessa demos visar möjligheter och risker med AI i demokratins informationsmiljö. De är inte röstningsrådgivare, kampanjverktyg eller automatiserade beslutsstöd. Alla syntetiska exempel är märkta som syntetiska."
