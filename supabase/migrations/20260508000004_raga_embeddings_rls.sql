-- Fix CRITICAL: raga_embeddings had RLS disabled (Supabase Advisor alert)
ALTER TABLE raga_embeddings ENABLE ROW LEVEL SECURITY;

-- Public read — embeddings are non-sensitive; needed for anonymous RAG search
CREATE POLICY "public read raga_embeddings"
  ON raga_embeddings FOR SELECT
  USING (true);

-- Only service role can insert / update / delete embeddings
CREATE POLICY "service role write raga_embeddings"
  ON raga_embeddings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
