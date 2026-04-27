import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getRouter } from "../llm";

export interface RiksdagRetrievalQuery {
  topic: string;
  dateFrom?: Date;
  dateTo?: Date;
  parties?: string[];
  /** Total combined results to return after fusion. Default 30. */
  limit?: number;
  /** Per-strategy candidate count (lex and sem each pull this many). Default 60. */
  candidateLimit?: number;
}

export interface RiksdagHit {
  chunkId: string;
  sourceDocId: string;
  text: string;
  score: number;
  lexicalRank: number | null;
  semanticRank: number | null;
  paragraphIndex: number;
  meta: {
    title: string;
    url: string | null;
    publishedAt: Date | null;
    talare: string;
    parti: string;
    avsnittsrubrik: string;
    underrubrik: string | null;
    dokId: string;
    dokDatum: string;
    anforandeId: string;
    anforandeNummer: number;
    anforandeUrlHtml: string;
    protokollUrlWww: string | null;
  };
}

const RRF_K = 60;

interface RawHit {
  chunk_id: string;
  source_doc_id: string;
  text: string;
  rrf_score: string | number;
  lex_rank: number | null;
  sem_rank: number | null;
  paragraph_index: number;
  doc_title: string;
  doc_url: string | null;
  doc_published_at: Date | null;
  doc_metadata: Prisma.JsonValue;
}

export async function hybridRetrieve(
  q: RiksdagRetrievalQuery,
): Promise<RiksdagHit[]> {
  const candidateLimit = q.candidateLimit ?? 60;
  const limit = q.limit ?? 30;

  const router = getRouter();
  const embed = await router.embed("embedding", { texts: [q.topic] });
  const queryVector = embed.embeddings[0];
  if (!queryVector || queryVector.length === 0) {
    throw new Error("Failed to embed query topic");
  }
  const vectorLiteral = `[${queryVector.join(",")}]`;

  const partyFilter = q.parties?.length
    ? Prisma.sql`AND d."metadataJson"->>'parti' = ANY(${q.parties}::text[])`
    : Prisma.empty;
  const dateFromFilter = q.dateFrom
    ? Prisma.sql`AND d."publishedAt" >= ${q.dateFrom}`
    : Prisma.empty;
  const dateToFilter = q.dateTo
    ? Prisma.sql`AND d."publishedAt" <= ${q.dateTo}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<RawHit[]>(Prisma.sql`
    WITH filtered AS (
      SELECT c.id AS chunk_id,
             c."sourceDocId" AS source_doc_id,
             c.text,
             c."chunkIndex" AS paragraph_index,
             c.embedding,
             d.title AS doc_title,
             d.url AS doc_url,
             d."publishedAt" AS doc_published_at,
             d."metadataJson" AS doc_metadata
      FROM source_chunks c
      JOIN source_docs d ON d.id = c."sourceDocId"
      WHERE d."sourceType" = 'RIKSDAG_ANFORANDE'
        ${partyFilter}
        ${dateFromFilter}
        ${dateToFilter}
    ),
    lex AS (
      SELECT chunk_id,
             ROW_NUMBER() OVER (
               ORDER BY ts_rank_cd(to_tsvector('swedish', text), plainto_tsquery('swedish', ${q.topic})) DESC
             ) AS rnk
      FROM filtered
      WHERE to_tsvector('swedish', text) @@ plainto_tsquery('swedish', ${q.topic})
      ORDER BY ts_rank_cd(to_tsvector('swedish', text), plainto_tsquery('swedish', ${q.topic})) DESC
      LIMIT ${candidateLimit}
    ),
    sem AS (
      SELECT chunk_id,
             ROW_NUMBER() OVER (ORDER BY embedding <=> ${vectorLiteral}::vector) AS rnk
      FROM filtered
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${candidateLimit}
    ),
    fused AS (
      SELECT COALESCE(lex.chunk_id, sem.chunk_id) AS chunk_id,
             lex.rnk::int AS lex_rank,
             sem.rnk::int AS sem_rank,
             (CASE WHEN lex.rnk IS NULL THEN 0 ELSE 1.0 / (${RRF_K} + lex.rnk) END)
             + (CASE WHEN sem.rnk IS NULL THEN 0 ELSE 1.0 / (${RRF_K} + sem.rnk) END)
             AS rrf_score
      FROM lex FULL OUTER JOIN sem USING (chunk_id)
    )
    SELECT f.chunk_id,
           f.lex_rank,
           f.sem_rank,
           f.rrf_score,
           filt.source_doc_id,
           filt.text,
           filt.paragraph_index,
           filt.doc_title,
           filt.doc_url,
           filt.doc_published_at,
           filt.doc_metadata
    FROM fused f
    JOIN filtered filt ON filt.chunk_id = f.chunk_id
    ORDER BY f.rrf_score DESC
    LIMIT ${limit}
  `);

  return rows.map(rowToHit);
}

function rowToHit(r: RawHit): RiksdagHit {
  const meta = r.doc_metadata as Record<string, unknown> | null;
  return {
    chunkId: r.chunk_id,
    sourceDocId: r.source_doc_id,
    text: r.text,
    score: Number(r.rrf_score),
    lexicalRank: r.lex_rank,
    semanticRank: r.sem_rank,
    paragraphIndex: r.paragraph_index,
    meta: {
      title: r.doc_title,
      url: r.doc_url,
      publishedAt: r.doc_published_at,
      talare: String(meta?.talare ?? ""),
      parti: String(meta?.parti ?? ""),
      avsnittsrubrik: String(meta?.avsnittsrubrik ?? ""),
      underrubrik: typeof meta?.underrubrik === "string" ? meta.underrubrik : null,
      dokId: String(meta?.dokId ?? ""),
      dokDatum: String(meta?.dokDatum ?? ""),
      anforandeId: String(meta?.anforandeId ?? ""),
      anforandeNummer: Number(meta?.anforandeNummer ?? 0),
      anforandeUrlHtml: String(meta?.anforandeUrlHtml ?? ""),
      protokollUrlWww:
        typeof meta?.protokollUrlWww === "string"
          ? meta.protokollUrlWww
          : null,
    },
  };
}

/**
 * Group retrieval hits by speaker/party for downstream summarisation.
 * Each group preserves chunk order by best score.
 */
export function groupHitsByParty(
  hits: RiksdagHit[],
): Array<{ parti: string; hits: RiksdagHit[] }> {
  const buckets = new Map<string, RiksdagHit[]>();
  for (const h of hits) {
    const p = h.meta.parti || "—";
    if (!buckets.has(p)) buckets.set(p, []);
    buckets.get(p)!.push(h);
  }
  return [...buckets.entries()]
    .map(([parti, list]) => ({
      parti,
      hits: list.sort((a, b) => b.score - a.score),
    }))
    .sort((a, b) => b.hits[0].score - a.hits[0].score);
}
