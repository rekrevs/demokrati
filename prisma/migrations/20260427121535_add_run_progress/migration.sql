-- DropIndex
DROP INDEX "source_chunks_embedding_idx";

-- AlterTable
ALTER TABLE "runs" ADD COLUMN     "progress" JSONB;
