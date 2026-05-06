import { Prisma, SourceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRouter } from "@/lib/llm";

export interface ProgramHit {
  chunkId: string;
  sourceDocId: string;
  text: string;
  score: number;
  party: string;
  documentType: string;
  year: number | null;
  sourceTitle: string;
  sourceUrl: string | null;
}

const RRF_K = 60;

interface RawHit {
  chunk_id: string;
  source_doc_id: string;
  text: string;
  rrf_score: string | number;
  party: string;
  document_type: string;
  year_int: number | null;
  doc_title: string;
  doc_url: string | null;
}

/**
 * Hybrid retrieval over party-programme chunks. Filters to a single
 * party (so we get evidence per party). Combines lexical (Swedish FTS)
 * and semantic (pgvector cosine) via Reciprocal Rank Fusion.
 */
export async function retrieveForParty(
  party: string,
  topic: string,
  limit = 6,
): Promise<ProgramHit[]> {
  const router = getRouter();
  const embed = await router.embed("embedding", { texts: [topic] });
  const queryVector = embed.embeddings[0];
  if (!queryVector) throw new Error("Failed to embed topic");
  const vectorLiteral = `[${queryVector.join(",")}]`;
  const candidate = limit * 4;

  const rows = await prisma.$queryRaw<RawHit[]>(Prisma.sql`
    WITH filtered AS (
      SELECT c.id AS chunk_id,
             c."sourceDocId" AS source_doc_id,
             c.text,
             c.embedding,
             d.title AS doc_title,
             d.url AS doc_url,
             d."metadataJson"->>'party' AS party,
             d."metadataJson"->>'documentType' AS document_type,
             NULLIF((d."metadataJson"->>'year')::text, '')::int AS year_int
      FROM source_chunks c
      JOIN source_docs d ON d.id = c."sourceDocId"
      WHERE d."sourceType" = ${SourceType.PARTI_PROGRAM}::"SourceType"
        AND d."metadataJson"->>'party' = ${party}
    ),
    lex AS (
      SELECT chunk_id,
             ROW_NUMBER() OVER (
               ORDER BY ts_rank_cd(to_tsvector('swedish', text), plainto_tsquery('swedish', ${topic})) DESC
             ) AS rnk
      FROM filtered
      WHERE to_tsvector('swedish', text) @@ plainto_tsquery('swedish', ${topic})
      LIMIT ${candidate}
    ),
    sem AS (
      SELECT chunk_id,
             ROW_NUMBER() OVER (ORDER BY embedding <=> ${vectorLiteral}::vector) AS rnk
      FROM filtered
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${candidate}
    ),
    fused AS (
      SELECT COALESCE(lex.chunk_id, sem.chunk_id) AS chunk_id,
             (CASE WHEN lex.rnk IS NULL THEN 0 ELSE 1.0 / (${RRF_K} + lex.rnk) END)
             + (CASE WHEN sem.rnk IS NULL THEN 0 ELSE 1.0 / (${RRF_K} + sem.rnk) END)
             AS rrf_score
      FROM lex FULL OUTER JOIN sem USING (chunk_id)
    )
    SELECT f.chunk_id,
           f.rrf_score,
           filt.source_doc_id,
           filt.text,
           filt.party,
           filt.document_type,
           filt.year_int,
           filt.doc_title,
           filt.doc_url
    FROM fused f
    JOIN filtered filt ON filt.chunk_id = f.chunk_id
    ORDER BY f.rrf_score DESC
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    chunkId: r.chunk_id,
    sourceDocId: r.source_doc_id,
    text: r.text,
    score: Number(r.rrf_score),
    party: r.party,
    documentType: r.document_type ?? "okänt",
    year: r.year_int,
    sourceTitle: r.doc_title,
    sourceUrl: r.doc_url,
  }));
}

/** Which parties currently have at least one chunk in our corpus. */
export async function partiesWithCoverage(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ party: string }>>(Prisma.sql`
    SELECT DISTINCT d."metadataJson"->>'party' AS party
    FROM source_docs d
    WHERE d."sourceType" = ${SourceType.PARTI_PROGRAM}::"SourceType"
  `);
  return new Set(rows.map((r) => r.party).filter(Boolean));
}
