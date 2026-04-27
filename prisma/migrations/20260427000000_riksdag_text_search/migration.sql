-- Indexes for Riksdagsradarn hybrid retrieval (full-text + pgvector cosine).
-- Postgres' built-in Swedish text-search dictionary handles stemming and
-- stop-words; tsvector with a GIN index makes lexical filtering fast.
-- HNSW is pgvector >= 0.5; we have 0.8 on the dev image.
-- (publishedAt already has an index from the initial migration.)

CREATE INDEX IF NOT EXISTS source_chunks_text_swedish_idx
  ON source_chunks USING GIN (to_tsvector('swedish', text));

CREATE INDEX IF NOT EXISTS source_chunks_embedding_idx
  ON source_chunks USING hnsw (embedding vector_cosine_ops);
