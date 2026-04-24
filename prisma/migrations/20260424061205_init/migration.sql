-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'BETA', 'HIDDEN');

-- CreateEnum
CREATE TYPE "RunMode" AS ENUM ('FEATURED', 'EXPLORE', 'STAGE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('RIKSDAG_ANFORANDE', 'PARTI_PROGRAM', 'MYNDIGHETSBESLUT', 'KOMMUNALT_BESLUT', 'SYNTHETIC', 'USER_INPUT');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('JSON', 'PNG', 'HTML', 'SHARE_CARD', 'EXPORT');

-- CreateEnum
CREATE TYPE "FeedbackSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateTable
CREATE TABLE "demos" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'HIDDEN',
    "currentVersion" TEXT NOT NULL DEFAULT 'v0.1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demos_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL,
    "demoSlug" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "inputJson" JSONB NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "demoSlug" TEXT NOT NULL,
    "scenarioId" TEXT,
    "mode" "RunMode" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "inputHash" TEXT NOT NULL,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB,
    "errorJson" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tokenIn" INTEGER NOT NULL DEFAULT 0,
    "tokenOut" INTEGER NOT NULL DEFAULT 0,
    "providerSummary" JSONB,
    "cacheKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "demoSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "schemaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_docs" (
    "id" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "rawStoragePath" TEXT,
    "parsedText" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_chunks" (
    "id" TEXT NOT NULL,
    "sourceDocId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "metadataJson" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "demoSlug" TEXT NOT NULL,
    "sentiment" "FeedbackSentiment" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scenarios_demoSlug_isFeatured_idx" ON "scenarios"("demoSlug", "isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "scenarios_demoSlug_slug_key" ON "scenarios"("demoSlug", "slug");

-- CreateIndex
CREATE INDEX "runs_demoSlug_status_idx" ON "runs"("demoSlug", "status");

-- CreateIndex
CREATE INDEX "runs_cacheKey_idx" ON "runs"("cacheKey");

-- CreateIndex
CREATE INDEX "runs_createdAt_idx" ON "runs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_demoSlug_name_version_key" ON "prompt_versions"("demoSlug", "name", "version");

-- CreateIndex
CREATE INDEX "source_docs_sourceType_publishedAt_idx" ON "source_docs"("sourceType", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "source_docs_sourceType_externalId_key" ON "source_docs"("sourceType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "source_chunks_sourceDocId_chunkIndex_key" ON "source_chunks"("sourceDocId", "chunkIndex");

-- CreateIndex
CREATE INDEX "artifacts_runId_idx" ON "artifacts"("runId");

-- CreateIndex
CREATE INDEX "feedback_demoSlug_sentiment_idx" ON "feedback"("demoSlug", "sentiment");

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_demoSlug_fkey" FOREIGN KEY ("demoSlug") REFERENCES "demos"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_demoSlug_fkey" FOREIGN KEY ("demoSlug") REFERENCES "demos"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_demoSlug_fkey" FOREIGN KEY ("demoSlug") REFERENCES "demos"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_sourceDocId_fkey" FOREIGN KEY ("sourceDocId") REFERENCES "source_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_demoSlug_fkey" FOREIGN KEY ("demoSlug") REFERENCES "demos"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
