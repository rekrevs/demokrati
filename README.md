# demokrati

> Publik demosvit om AI och demokrati. Sju webbdemos som visar AI som demokratisk lins, påverkansmotor och styrningsobjekt.

Ett explorativt projekt från [RISE](https://ri.se), publicerat på **[demokrati.janson.org](https://demokrati.janson.org)**.

## Demos

1. **Riksdagsradarn** — spårbar sammanfattning av riksdagsdebatter.
2. **Språkdriften** — flerspråkig politisk driftdetektor.
3. **Oenighetskartan** — visualisering av konfliktens verkliga dimensioner.
4. **Öppenhetsparadoxen** — begriplighet vs. juridisk/politisk precision.
5. **AI-konstitutionen** — publikstyrd demokratisk systemprompt.
6. **Persuasionmaskinen** — personaliserad politisk övertalning i skala.
7. **Programkompassen** — partiprogram och valmanifest som positionskarta.

## Utveckling

Kräver Node 20+, pnpm 9+, Docker, Postgres med pgvector, Redis.

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d     # postgres + redis
pnpm prisma migrate dev
pnpm dev                                           # http://localhost:3000
pnpm worker                                        # i separat shell
```

Se [`CLAUDE.md`](./CLAUDE.md) för arkitektur, konventioner och designbeslut.

## Licens

Källkod: MIT. Demoinnehåll och datamaterial kan ha andra villkor — se respektive `docs/data/*.md`.
