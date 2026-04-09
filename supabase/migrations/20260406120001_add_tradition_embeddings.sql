-- Migration: Add tradition column, embeddings, and match_ragas RPC
-- Depends on: 20260327_initial_schema.sql

-- 1. Enable pgvector (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add tradition column to ragas
ALTER TABLE ragas
  ADD COLUMN IF NOT EXISTS tradition TEXT CHECK (tradition IN ('Hindustani', 'Carnatic'));

-- 3. Add embedding column to ragas
ALTER TABLE ragas
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 4. Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS ragas_embedding_idx
  ON ragas
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- 5. match_ragas RPC
-- Returns up to `match_count` ragas whose embeddings exceed `match_threshold`
-- cosine similarity to `query_embedding`. The `content` column is a plain-text
-- summary of the raga, used directly as RAG context by /api/ai/suggest.

DROP FUNCTION IF EXISTS match_ragas(vector(768), float, int);

CREATE OR REPLACE FUNCTION match_ragas(
  query_embedding vector(768),
  match_threshold  float,
  match_count      int
)
RETURNS TABLE (
  id        UUID,
  name      TEXT,
  tradition TEXT,
  content   TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    r.name,
    r.tradition,
    -- Assemble a human-readable summary for the LLM context window
    concat_ws(E'\n',
      'Raga: '    || r.name,
      'Tradition: '|| COALESCE(r.tradition, 'Unknown'),
      'Thaat: '   || COALESCE(r.thaat, 'Unknown'),
      'Mood: '    || COALESCE(r.mood, 'Unknown'),
      'Time: '    || COALESCE(r.time_of_day, 'Unknown'),
      'Vadi: '    || COALESCE(r.vadi, ''),
      'Samvadi: ' || COALESCE(r.samvadi, ''),
      'Aroha: '   || COALESCE(array_to_string(r.aroha,   ' '), ''),
      'Avaroha: ' || COALESCE(array_to_string(r.avaroha, ' '), '')
    ) AS content,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM ragas r
  WHERE r.embedding IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) >= match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
$$;
