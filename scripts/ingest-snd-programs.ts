/**
 * CLI: ingest party programmes from SND's "Vi vill..." collection
 * (or from the local sample fixtures if --local is passed).
 *
 *   pnpm tsx scripts/ingest-snd-programs.ts
 *
 * Defaults to a hand-picked set covering the 8 riksdag parties' most
 * recent valmanifest where SND has them. URLs follow the documented
 * pattern /sv/vivill/file/{party}/{type}/{year}/txt and were verified
 * during T-0003.
 *
 * Idempotent: existing externalIds (party-type-year) are skipped.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Prisma, SourceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRouter } from "@/lib/llm";

interface ProgramSpec {
  party: string;
  documentType: "valmanifest" | "principprogram" | "ovrigt";
  year: number;
  /** path under snd.se/sv/vivill/file (e.g. "s/v/2022"). */
  sndPath: string;
  /** Optional override path for a local fixture file. */
  localFixture?: string;
}

const PROGRAMS: ProgramSpec[] = [
  // 2022 valmanifest — same set we explored in T-0003
  {
    party: "S",
    documentType: "valmanifest",
    year: 2022,
    sndPath: "s/v/2022",
    localFixture: "data/samples/snd/socialdemokraterna-valmanifest-2022.txt",
  },
  {
    party: "M",
    documentType: "valmanifest",
    year: 2022,
    sndPath: "m/v/2022",
    localFixture: "data/samples/snd/moderaterna-valmanifest-2022.txt",
  },
  {
    party: "MP",
    documentType: "valmanifest",
    year: 2018,
    sndPath: "mp/v/2018",
    localFixture: "data/samples/snd/mp-valmanifest-2018.txt",
  },
  // Newly fetched: the rest of the riksdag parties' recent valmanifest
  { party: "SD", documentType: "valmanifest", year: 2022, sndPath: "sd/v/2022" },
  { party: "C", documentType: "valmanifest", year: 2022, sndPath: "c/v/2022" },
  { party: "V", documentType: "valmanifest", year: 2022, sndPath: "v/v/2022" },
  { party: "KD", documentType: "valmanifest", year: 2022, sndPath: "kd/v/2022" },
  { party: "L", documentType: "valmanifest", year: 2022, sndPath: "l/v/2022" },
];

const MAX_CHUNK_CHARS = 1200;

function chunkText(text: string): string[] {
  // Strip BOM, normalise whitespace
  const cleaned = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  // First split on double newlines (paragraphs); merge or split as needed.
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30); // drop short headers/empty lines
  const chunks: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= MAX_CHUNK_CHARS) {
      chunks.push(p);
      continue;
    }
    const sentences = p.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [p];
    let buf = "";
    for (const s of sentences) {
      if ((buf + s).length > MAX_CHUNK_CHARS && buf.length > 0) {
        chunks.push(buf.trim());
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf.trim().length > 0) chunks.push(buf.trim());
  }
  return chunks;
}

async function fetchProgramText(spec: ProgramSpec): Promise<string | null> {
  if (spec.localFixture) {
    const fp = resolve(process.cwd(), spec.localFixture);
    if (existsSync(fp)) {
      return readFileSync(fp, "utf-8");
    }
  }
  const url = `https://snd.se/sv/vivill/file/${spec.sndPath}/txt`;
  console.log(`[fetch] ${spec.party} ${spec.documentType} ${spec.year} from ${url}`);
  try {
    const res = await fetch(url, { headers: { accept: "text/plain" } });
    if (!res.ok) {
      console.warn(`[fetch] ${spec.party}: HTTP ${res.status}`);
      return null;
    }
    const text = await res.text();
    if (text.length < 200) {
      console.warn(`[fetch] ${spec.party}: text too short (${text.length} bytes), skipping`);
      return null;
    }
    return text;
  } catch (err) {
    console.warn(`[fetch] ${spec.party} error:`, (err as Error).message);
    return null;
  }
}

async function ingestProgram(spec: ProgramSpec): Promise<{
  ok: boolean;
  reason?: string;
  chunks?: number;
}> {
  const externalId = `${spec.party}-${spec.documentType}-${spec.year}`;
  const existing = await prisma.sourceDoc.findUnique({
    where: {
      sourceType_externalId: {
        sourceType: SourceType.PARTI_PROGRAM,
        externalId,
      },
    },
    select: { id: true },
  });
  if (existing) return { ok: true, reason: "already-ingested" };

  const text = await fetchProgramText(spec);
  if (!text) return { ok: false, reason: "fetch-failed" };

  const chunks = chunkText(text);
  if (chunks.length === 0) return { ok: false, reason: "no-chunks" };

  const router = getRouter();
  const embeddings = await router.embed("embedding", { texts: chunks });
  if (embeddings.embeddings.length !== chunks.length) {
    return { ok: false, reason: "embedding-mismatch" };
  }

  const title = `${spec.party} — ${spec.documentType} ${spec.year}`;
  const url = `https://snd.se/sv/vivill/party/${spec.sndPath}`;

  await prisma.$transaction(async (tx) => {
    const doc = await tx.sourceDoc.create({
      data: {
        sourceType: SourceType.PARTI_PROGRAM,
        externalId,
        title,
        url,
        publishedAt: new Date(`${spec.year}-01-01T00:00:00.000Z`),
        parsedText: text,
        metadataJson: {
          party: spec.party,
          documentType: spec.documentType,
          year: spec.year,
          sndPath: spec.sndPath,
        } as Prisma.InputJsonValue,
      },
    });
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = await tx.sourceChunk.create({
        data: {
          sourceDocId: doc.id,
          chunkIndex: i,
          text: chunks[i],
          metadataJson: {
            party: spec.party,
            paragraphIndex: i,
          } as Prisma.InputJsonValue,
        },
      });
      const vec = `[${embeddings.embeddings[i].join(",")}]`;
      await tx.$executeRawUnsafe(
        `UPDATE source_chunks SET embedding = $1::vector WHERE id = $2`,
        vec,
        chunk.id,
      );
    }
  });

  return { ok: true, chunks: chunks.length };
}

async function main(): Promise<void> {
  console.log(`[ingest] start — ${PROGRAMS.length} programmes`);
  let success = 0;
  let skipped = 0;
  let failed = 0;
  let totalChunks = 0;

  for (const spec of PROGRAMS) {
    const res = await ingestProgram(spec);
    if (res.ok && res.chunks) {
      success += 1;
      totalChunks += res.chunks;
      console.log(
        `[ok]    ${spec.party} ${spec.documentType} ${spec.year}: ${res.chunks} chunks`,
      );
    } else if (res.ok && res.reason === "already-ingested") {
      skipped += 1;
      console.log(
        `[skip]  ${spec.party} ${spec.documentType} ${spec.year}: already ingested`,
      );
    } else {
      failed += 1;
      console.log(
        `[fail]  ${spec.party} ${spec.documentType} ${spec.year}: ${res.reason}`,
      );
    }
  }
  console.log(
    `[ingest] done — ok=${success} skipped=${skipped} failed=${failed} chunks=${totalChunks}`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});
