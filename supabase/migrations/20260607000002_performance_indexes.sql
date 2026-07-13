-- ============================================================
-- Performance Indexes — Saptaswara Scaling Pass
-- ============================================================
-- Every table that appears in a WHERE, JOIN, ORDER BY, or RLS
-- policy needs an index on the filtered column(s).  Without
-- these, Postgres falls back to sequential scans that grow
-- linearly with user count.
-- ============================================================

-- ── projects ────────────────────────────────────────────────
-- Composite covers: WHERE user_id = ? ORDER BY updated_at DESC
-- (every dashboard + profile load).  Also satisfies the simple
-- WHERE user_id = ? predicate used by RLS.
CREATE INDEX IF NOT EXISTS idx_projects_user_updated
  ON projects(user_id, updated_at DESC);

-- FK to ragas — used in dashboard JOIN: ragas(name)
CREATE INDEX IF NOT EXISTS idx_projects_raga_id
  ON projects(raga_id);

-- ── layers ──────────────────────────────────────────────────
-- project_id is both a FK and the column used in the layers
-- RLS correlated subquery:
--   EXISTS (SELECT 1 FROM projects
--           WHERE projects.id = project_id
--             AND projects.user_id = auth.uid())
-- Without this index every INSERT/SELECT/UPDATE/DELETE on layers
-- performs a sequential scan of the entire layers table per row.
CREATE INDEX IF NOT EXISTS idx_layers_project_id
  ON layers(project_id);

-- ── practice_logs ───────────────────────────────────────────
-- Composite covers: WHERE user_id = ? ORDER BY log_date DESC
-- (journal GET, profile streak, statistics queries).
-- Also satisfies the simple WHERE user_id = ? used by RLS.
CREATE INDEX IF NOT EXISTS idx_practice_logs_user_date
  ON practice_logs(user_id, log_date DESC);

-- ── raga_phrases ────────────────────────────────────────────
-- PostgREST expands ragas.select('*, raga_phrases(*)')  into a
-- correlated subquery: WHERE raga_phrases.raga_id = ragas.id
-- With 72–200 ragas and no index this is N sequential scans.
CREATE INDEX IF NOT EXISTS idx_raga_phrases_raga_id
  ON raga_phrases(raga_id);

-- ── conformance_scores ──────────────────────────────────────
-- FK columns; used when loading score history for a layer.
CREATE INDEX IF NOT EXISTS idx_conformance_scores_layer_id
  ON conformance_scores(layer_id);
CREATE INDEX IF NOT EXISTS idx_conformance_scores_raga_id
  ON conformance_scores(raga_id);

-- ── ragas — vector index upgrade ────────────────────────────
-- The existing ivfflat index (ragas_embedding_idx, lists=50)
-- uses probes=1 by default, which searches only 1/50 of the
-- index (~2% recall).  HNSW gives >95% recall with no tuning
-- required and is strictly better for a small dataset (< 1000
-- rows).  Requires pgvector >= 0.5.0 (Supabase has used this
-- since mid-2023).
DROP INDEX IF EXISTS ragas_embedding_idx;
CREATE INDEX IF NOT EXISTS idx_ragas_embedding_hnsw
  ON ragas USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── match_ragas — recall fix ─────────────────────────────────
-- Rewrite as plpgsql so we can SET LOCAL search parameters and
-- document the change.  Functionally identical to the original
-- SQL function; the HNSW index above makes probe tuning moot,
-- but the plpgsql form allows future parameter tweaks.
CREATE OR REPLACE FUNCTION match_ragas(
  query_embedding  vector(768),
  match_threshold  float,
  match_count      int
)
RETURNS TABLE (
  id         UUID,
  name       TEXT,
  tradition  TEXT,
  content    TEXT,
  similarity float
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.tradition,
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
END;
$$;
