import { hybridRetrieve, groupHitsByParty } from "@/lib/retrieval/riksdag";
import { prisma } from "@/lib/db";

async function main(): Promise<void> {
  const topic = process.argv[2] ?? "bistånd och utveckling";
  console.log(`[retrieval] topic="${topic}"`);

  const t0 = Date.now();
  const hits = await hybridRetrieve({ topic, limit: 10 });
  const ms = Date.now() - t0;
  console.log(`[retrieval] ${hits.length} hits in ${ms}ms\n`);

  for (const h of hits) {
    const lex = h.lexicalRank !== null ? `lex=${h.lexicalRank}` : "lex=—";
    const sem = h.semanticRank !== null ? `sem=${h.semanticRank}` : "sem=—";
    console.log(
      `score=${h.score.toFixed(4)} ${lex} ${sem}  ${h.meta.talare} (${h.meta.parti})`,
    );
    console.log(`  ${h.text.slice(0, 200).replace(/\s+/g, " ")}`);
    console.log();
  }

  console.log("--- by party ---");
  for (const g of groupHitsByParty(hits)) {
    console.log(`${g.parti}: ${g.hits.length} hits, top score ${g.hits[0].score.toFixed(4)}`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
