/**
 * CLI: ingest Riksdag anföranden into the local Postgres + pgvector.
 *
 *   pnpm tsx scripts/ingest-riksdagen.ts --rm 2025/26 --pageSize 50 --maxPages 4
 *
 * Idempotent: existing anförande_id rows are skipped. Embeddings are
 * generated via the configured `embedding` profile (see .env).
 */
import { ingestRange } from "@/lib/ingest/riksdagen";
import { prisma } from "@/lib/db";

interface CliArgs {
  rm: string;
  pageSize: number;
  maxPages: number;
  excludeRepliker: boolean;
  parti?: string;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const args: Partial<CliArgs> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case "--rm":
        args.rm = v;
        i += 1;
        break;
      case "--pageSize":
        args.pageSize = Number(v);
        i += 1;
        break;
      case "--maxPages":
        args.maxPages = Number(v);
        i += 1;
        break;
      case "--parti":
        args.parti = v;
        i += 1;
        break;
      case "--excludeRepliker":
        args.excludeRepliker = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (k.startsWith("--")) {
          console.error(`Unknown flag: ${k}`);
          process.exit(2);
        }
    }
  }
  return {
    rm: args.rm ?? "2025/26",
    pageSize: args.pageSize ?? 50,
    maxPages: args.maxPages ?? 4,
    excludeRepliker: args.excludeRepliker ?? false,
    parti: args.parti,
  };
}

function printHelp(): void {
  console.log(
    [
      "Usage: pnpm tsx scripts/ingest-riksdagen.ts [flags]",
      "",
      "  --rm <rm>            Riksmöte to ingest (default 2025/26)",
      "  --pageSize <n>       Anföranden per page (default 50)",
      "  --maxPages <n>       Page cap (default 4 → up to 200 anföranden)",
      "  --parti <code>       Limit to a single party",
      "  --excludeRepliker    Skip repliker (anftyp=Nej)",
      "  --help               Show this",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const args = parseArgs();
  console.log(
    `[ingest] start rm=${args.rm} pageSize=${args.pageSize} maxPages=${args.maxPages} parti=${args.parti ?? "*"} excludeRepliker=${args.excludeRepliker}`,
  );

  const start = Date.now();
  try {
    const stats = await ingestRange({
      rm: args.rm,
      pageSize: args.pageSize,
      maxPages: args.maxPages,
      parti: args.parti,
      excludeRepliker: args.excludeRepliker,
      log: (event, data) => {
        console.log(`[ingest:${event}]`, data ?? "");
      },
    });

    const seconds = Math.round((Date.now() - start) / 100) / 10;
    console.log(
      `[ingest] done in ${seconds}s — listed=${stats.listed} fetched=${stats.fetched} skipped=${stats.skipped} chunks=${stats.chunksWritten} errors=${stats.errors}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});
