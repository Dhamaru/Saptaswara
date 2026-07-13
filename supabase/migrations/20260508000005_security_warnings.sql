-- Fix Supabase Advisor warnings

-- ── 1. Function Search Path Mutable: match_ragas ─────────────────────────────
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
SET search_path = public
AS $$
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
$$;

-- ── 2. Extension in Public: vector ───────────────────────────────────────────
-- pgvector must stay in public for <=> operator. Cannot fix without breaking RAG.

-- ── 3. Public Bucket Allows Listing: storage.recordings ──────────────────────
-- Drop any existing broad policies on recordings bucket objects, then add
-- owner-scoped RLS policies using standard CREATE POLICY on storage.objects.

DROP POLICY IF EXISTS "Public read recordings"        ON storage.objects;
DROP POLICY IF EXISTS "Allow public select recordings" ON storage.objects;
DROP POLICY IF EXISTS "recordings public read"         ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

-- Users can only SELECT their own recordings (path: <uid>/filename)
CREATE POLICY "recordings owner select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can INSERT into their own folder
CREATE POLICY "recordings owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can DELETE their own recordings
CREATE POLICY "recordings owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 4. Leaked Password Protection Disabled ───────────────────────────────────
-- Manual step: Dashboard → Authentication → Settings → Password Protection
-- → enable "HaveIBeenPwned check". Cannot be set via SQL.
