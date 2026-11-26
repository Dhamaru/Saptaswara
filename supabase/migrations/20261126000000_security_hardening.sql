-- Security hardening: explicit write checks on conformance_scores and scoped
-- anonymous privileges. See the backend/security audit.

-- 1. conformance_scores used a single FOR ALL policy with only USING. Postgres
-- reuses USING as WITH CHECK for ALL policies, but making each operation
-- explicit matches the projects/layers hardening and prevents an ownership
-- transfer if the policy is ever split by a future edit.
DROP POLICY IF EXISTS "users own conformance scores via layer" ON conformance_scores;

CREATE POLICY "conformance_scores_select"
  ON conformance_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM layers l
      JOIN projects p ON p.id = l.project_id
      WHERE l.id = conformance_scores.layer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "conformance_scores_insert"
  ON conformance_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM layers l
      JOIN projects p ON p.id = l.project_id
      WHERE l.id = conformance_scores.layer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "conformance_scores_update"
  ON conformance_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM layers l
      JOIN projects p ON p.id = l.project_id
      WHERE l.id = conformance_scores.layer_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM layers l
      JOIN projects p ON p.id = l.project_id
      WHERE l.id = conformance_scores.layer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "conformance_scores_delete"
  ON conformance_scores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM layers l
      JOIN projects p ON p.id = l.project_id
      WHERE l.id = conformance_scores.layer_id AND p.user_id = auth.uid()
    )
  );

-- 2. Undo the blanket anon grant from 20260408120000_grant_anon_access.sql.
-- The default-privileges clause was the dangerous part: every future table
-- would become anonymously readable unless someone remembered to disable RLS.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;

-- 3. Restore read access only to the reference tables that intentionally
-- expose rows publicly (their SELECT policies are `USING (true)`).
GRANT SELECT ON ragas, raga_phrases TO anon;

DO $$
BEGIN
  IF to_regclass('public.raga_embeddings') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.raga_embeddings TO anon';
  END IF;
END $$;
