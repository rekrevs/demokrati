import { XMLParser } from "fast-xml-parser";
import { Prisma, SourceType } from "@prisma/client";
import { prisma } from "../db";
import { getRouter } from "../llm";

const ANFORANDELISTA_URL = "https://data.riksdagen.se/anforandelista/";

export interface AnforandeListEntry {
  /** UUID identifier (also `anforande_id` in raw response). */
  anforandeId: string;
  /** Used for the XML URL path: `{dokId}-{anforandeNummer}`. */
  dokId: string;
  anforandeNummer: number;
  dokTitel: string;
  dokDatum: string;
  /** Riksmöte, e.g. "2025/26". */
  rm: string;
  avsnittsrubrik: string;
  underrubrik?: string;
  kammaraktivitet?: string;
  talare: string;
  parti: string;
  /** "N" for non-replik, "ja" for replik (per Riksdagen API). */
  replik: string;
  anforandeUrlXml: string;
  anforandeUrlHtml: string;
  protokollUrlWww: string;
}

export interface AnforandeFull extends AnforandeListEntry {
  /** Plain-text paragraphs, HTML-decoded and split. */
  paragraphs: string[];
}

interface ListParams {
  rm: string;
  size?: number;
  parti?: string;
  excludeRepliker?: boolean;
  /** 0-indexed page number for the API's `p` parameter. */
  page?: number;
}

/**
 * Fetch one page of the anforandelista. The API returns metadata plus
 * `anforande_url_xml` per entry — the actual text must be fetched
 * separately (see fetchAnforandeText). The list-response's
 * `anforandetext` field is empty in practice.
 */
export async function fetchAnforandelista(
  params: ListParams,
): Promise<{ totalAvailable: number; entries: AnforandeListEntry[] }> {
  const url = new URL(ANFORANDELISTA_URL);
  url.searchParams.set("rm", params.rm);
  url.searchParams.set("utformat", "json");
  url.searchParams.set("sz", String(params.size ?? 100));
  if (params.page !== undefined) {
    url.searchParams.set("p", String(params.page));
  }
  if (params.parti) url.searchParams.set("parti", params.parti);
  if (params.excludeRepliker) url.searchParams.set("anftyp", "Nej");

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `Riksdagen anforandelista returned HTTP ${res.status} for ${url}`,
    );
  }
  const data = (await res.json()) as {
    anforandelista?: {
      "@antal"?: string | number;
      anforande?: RawListEntry | RawListEntry[];
    };
  };
  const list = data.anforandelista;
  if (!list) return { totalAvailable: 0, entries: [] };
  const totalAvailable = Number(list["@antal"] ?? 0);
  const raw = list.anforande;
  const entries = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return { totalAvailable, entries: entries.map(normaliseListEntry) };
}

interface RawListEntry {
  dok_id: string;
  dok_titel: string;
  dok_rm: string;
  dok_datum: string;
  avsnittsrubrik?: string;
  underrubrik?: string;
  kammaraktivitet?: string;
  anforande_id: string;
  anforande_nummer: string | number;
  talare: string;
  parti: string;
  replik?: string;
  anforande_url_xml: string;
  anforande_url_html: string;
  protokoll_url_www: string;
}

function normaliseListEntry(r: RawListEntry): AnforandeListEntry {
  return {
    anforandeId: r.anforande_id,
    dokId: r.dok_id,
    anforandeNummer: Number(r.anforande_nummer),
    dokTitel: r.dok_titel,
    dokDatum: r.dok_datum,
    rm: r.dok_rm,
    avsnittsrubrik: r.avsnittsrubrik ?? "",
    underrubrik: r.underrubrik || undefined,
    kammaraktivitet: r.kammaraktivitet || undefined,
    talare: r.talare,
    parti: r.parti,
    replik: r.replik ?? "N",
    anforandeUrlXml: r.anforande_url_xml,
    anforandeUrlHtml: r.anforande_url_html,
    protokollUrlWww: r.protokoll_url_www,
  };
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  trimValues: false,
  parseTagValue: false,
});

/**
 * Fetch the full text of a single anförande via its XML endpoint.
 * The text inside <anforandetext> is HTML-escaped (`&lt;p&gt;…`); this
 * function returns the cleaned plain-text paragraphs.
 */
export async function fetchAnforandeText(
  entry: AnforandeListEntry,
): Promise<string[]> {
  const res = await fetch(entry.anforandeUrlXml, {
    headers: { accept: "application/xml" },
  });
  if (!res.ok) {
    throw new Error(
      `Riksdagen single-anforande returned HTTP ${res.status} for ${entry.anforandeUrlXml}`,
    );
  }
  const xml = await res.text();
  return parseAnforandeXml(xml);
}

export function parseAnforandeXml(xml: string): string[] {
  const parsed = xmlParser.parse(xml) as {
    anforande?: { anforandetext?: string; "@not"?: string };
  };
  const a = parsed?.anforande;
  if (!a) return [];
  if (a["@not"]) return []; // "felaktigt anrop" stub
  const raw = a.anforandetext;
  if (!raw) return [];
  return extractParagraphs(raw);
}

/**
 * The Riksdagen XML wraps `<anforandetext>` content as HTML-escaped
 * entities: `&lt;p&gt;…&lt;/p&gt;`. After decoding we get a string
 * that contains real `<p>` tags around each paragraph.
 */
export function extractParagraphs(htmlEscapedOrPlain: string): string[] {
  const decoded = decodeHtmlEntities(htmlEscapedOrPlain);
  // Split on <p> ... </p> boundaries; tolerate variations and nested whitespace.
  const paragraphs: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(decoded)) !== null) {
    const text = stripTags(m[1]).trim();
    if (text.length > 0) paragraphs.push(text);
  }
  if (paragraphs.length === 0) {
    // Fallback: no <p> tags at all — split on double newlines.
    return decoded
      .split(/\n{2,}/)
      .map((p) => stripTags(p).trim())
      .filter((p) => p.length > 0);
  }
  return paragraphs;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?)\]])/g, "$1")
    .replace(/([(\[])\s+/g, "$1")
    .trim();
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp|#39);/g,
      (m) => HTML_ENTITIES[m] ?? m,
    )
    .replace(/&#(\d+);/g, (_m, code) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

const MAX_CHUNK_CHARS = 1200;

/**
 * Split paragraphs into chunks suitable for embedding. Short paragraphs
 * pass through as-is. Long ones (>MAX_CHUNK_CHARS) split at sentence
 * boundaries.
 */
export function chunkParagraphs(paragraphs: string[]): string[] {
  const chunks: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= MAX_CHUNK_CHARS) {
      chunks.push(p);
      continue;
    }
    // Long paragraph: split on sentence-ending punctuation.
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

export interface IngestRangeOptions {
  rm: string;
  pageSize?: number;
  maxPages?: number;
  parti?: string;
  excludeRepliker?: boolean;
  /** Optional log callback for ingestion progress. */
  log?: (event: string, data?: unknown) => void;
}

export interface IngestStats {
  listed: number;
  fetched: number;
  skipped: number;
  chunksWritten: number;
  errors: number;
}

/**
 * End-to-end ingestion: list → fetch each anförande's XML → chunk →
 * embed → upsert SourceDoc + SourceChunks. Idempotent: re-running a
 * date range that's already been ingested skips existing docs.
 */
export async function ingestRange(
  opts: IngestRangeOptions,
): Promise<IngestStats> {
  const log = opts.log ?? (() => undefined);
  const router = getRouter();
  const stats: IngestStats = {
    listed: 0,
    fetched: 0,
    skipped: 0,
    chunksWritten: 0,
    errors: 0,
  };
  // Riksdagen's `p` query param is documented but does not actually
  // paginate the rm-scoped list endpoint (verified 2026-04-27: p=0..3
  // returned the same 5 ids). `sz` does scale, so we issue one large
  // fetch instead of looping pages. `pageSize` is treated as the cap
  // on total items fetched in this call. `maxPages` is kept as an arg
  // for API compatibility with the CLI but ignored.
  const pageSize = opts.pageSize ?? 500;
  void opts.maxPages; // intentionally unused — see comment above

  for (let page = 0; page < 1; page += 1) {
    const { entries } = await fetchAnforandelista({
      rm: opts.rm,
      size: pageSize,
      parti: opts.parti,
      excludeRepliker: opts.excludeRepliker,
    });
    if (entries.length === 0) break;
    stats.listed += entries.length;
    log("page", { page, count: entries.length });

    for (const entry of entries) {
      try {
        const existing = await prisma.sourceDoc.findUnique({
          where: {
            sourceType_externalId: {
              sourceType: SourceType.RIKSDAG_ANFORANDE,
              externalId: entry.anforandeId,
            },
          },
          select: { id: true },
        });
        if (existing) {
          stats.skipped += 1;
          continue;
        }
        const paragraphs = await fetchAnforandeText(entry);
        if (paragraphs.length === 0) {
          stats.skipped += 1;
          continue;
        }
        const chunks = chunkParagraphs(paragraphs);
        if (chunks.length === 0) {
          stats.skipped += 1;
          continue;
        }
        const embeddings = await router.embed("embedding", { texts: chunks });
        if (embeddings.embeddings.length !== chunks.length) {
          throw new Error(
            `Embedding count mismatch: ${embeddings.embeddings.length} vs ${chunks.length}`,
          );
        }

        await prisma.$transaction(async (tx) => {
          const doc = await tx.sourceDoc.create({
            data: {
              sourceType: SourceType.RIKSDAG_ANFORANDE,
              externalId: entry.anforandeId,
              title: makeTitle(entry),
              url: entry.anforandeUrlXml,
              publishedAt: parseDate(entry.dokDatum),
              parsedText: paragraphs.join("\n\n"),
              metadataJson: makeMetadata(entry) as Prisma.InputJsonValue,
            },
          });
          for (let i = 0; i < chunks.length; i += 1) {
            const text = chunks[i];
            const vector = embeddings.embeddings[i];
            // pgvector column requires raw SQL: Prisma's Unsupported() doesn't
            // generate a setter. We insert with chunkIndex + text via Prisma,
            // then update the embedding column via $executeRaw.
            const chunk = await tx.sourceChunk.create({
              data: {
                sourceDocId: doc.id,
                chunkIndex: i,
                text,
                metadataJson: { paragraphIndex: i } as Prisma.InputJsonValue,
              },
            });
            const vectorLiteral = `[${vector.join(",")}]`;
            await tx.$executeRawUnsafe(
              `UPDATE source_chunks SET embedding = $1::vector WHERE id = $2`,
              vectorLiteral,
              chunk.id,
            );
            stats.chunksWritten += 1;
          }
        });
        stats.fetched += 1;
        if (stats.fetched % 10 === 0) {
          log("progress", { ...stats });
        }
      } catch (err) {
        stats.errors += 1;
        log("error", {
          anforandeId: entry.anforandeId,
          message: (err as Error).message,
        });
      }
    }

    if (entries.length < pageSize) break;
  }

  log("done", { ...stats });
  return stats;
}

function makeTitle(e: AnforandeListEntry): string {
  const date = e.dokDatum.slice(0, 10);
  const subject = e.underrubrik || e.avsnittsrubrik || e.dokTitel;
  return `${e.talare} (${e.parti}) — ${subject} (${date})`;
}

function parseDate(input: string): Date | null {
  const d = new Date(input.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function makeMetadata(e: AnforandeListEntry): Record<string, unknown> {
  return {
    dokId: e.dokId,
    dokTitel: e.dokTitel,
    dokRm: e.rm,
    dokDatum: e.dokDatum,
    avsnittsrubrik: e.avsnittsrubrik,
    underrubrik: e.underrubrik,
    kammaraktivitet: e.kammaraktivitet,
    talare: e.talare,
    parti: e.parti,
    replik: e.replik,
    anforandeNummer: e.anforandeNummer,
    anforandeUrlHtml: e.anforandeUrlHtml,
    protokollUrlWww: e.protokollUrlWww,
  };
}
