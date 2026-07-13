-- Fix CRITICAL: raga_embeddings had RLS disabled (Supabase Advisor alert)
-- Guard: skip entirely on a fresh DB that doesn't have raga_embeddings yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'raga_embeddings'
  ) THEN
    ALTER TABLE raga_embeddings ENABLE ROW LEVEL SECURITY;

    -- Public read — embeddings are non-sensitive; needed for anonymous RAG search
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'raga_embeddings' AND policyname = 'public read raga_embeddings'
    ) THEN
      CREATE POLICY "public read raga_embeddings"
        ON raga_embeddings FOR SELECT
        USING (true);
    END IF;

    -- Only service role can insert / update / delete embeddings
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'raga_embeddings' AND policyname = 'service role write raga_embeddings'
    ) THEN
      CREATE POLICY "service role write raga_embeddings"
        ON raga_embeddings FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
  END IF;
END
$$;
