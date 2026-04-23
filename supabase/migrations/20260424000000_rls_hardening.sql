-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: RLS hardening + schema fixes
-- Fixes:
--   1. projects / layers used FOR ALL without WITH CHECK — ownership transfer attack possible
--   2. practice_logs UPDATE missing WITH CHECK
--   3. layers.type CHECK excluded 'keyboard' — every main-sequence save was rejected by DB
--   4. projects missing bpm column — API inserts silently failed
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. PROJECTS — replace overbroad FOR ALL with explicit per-op policies ──────

DROP POLICY IF EXISTS "Users can manage own projects" ON projects;

-- SELECT: only your own rows
CREATE POLICY "projects_select"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: new row must be owned by the inserting user
CREATE POLICY "projects_insert"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: can only touch rows you own AND cannot transfer ownership to another user
CREATE POLICY "projects_update"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: can only delete rows you own
CREATE POLICY "projects_delete"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);


-- ── 2. LAYERS — replace overbroad FOR ALL with explicit per-op policies ────────

DROP POLICY IF EXISTS "Users can manage own layers" ON layers;

-- SELECT: visible only if the parent project belongs to you
CREATE POLICY "layers_select"
  ON layers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = layers.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- INSERT: can only insert into a project you own
CREATE POLICY "layers_insert"
  ON layers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = layers.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- UPDATE: can only touch layers in your projects, and cannot move them to another user's project
CREATE POLICY "layers_update"
  ON layers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = layers.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = layers.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- DELETE: can only delete layers in your own projects
CREATE POLICY "layers_delete"
  ON layers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = layers.project_id
        AND projects.user_id = auth.uid()
    )
  );


-- ── 3. PRACTICE LOGS — add missing WITH CHECK to UPDATE ───────────────────────

DROP POLICY IF EXISTS "Users can update their own practice logs" ON practice_logs;

CREATE POLICY "practice_logs_update"
  ON practice_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 4. LAYERS — expand type CHECK to include 'keyboard' ──────────────────────
-- The API inserts type='keyboard' for the main sequence layer. The original CHECK
-- only allowed ('melody','rhythm','drone'), causing every project save to fail the
-- DB constraint. Adding 'keyboard' as a valid type.

ALTER TABLE layers
  DROP CONSTRAINT IF EXISTS layers_type_check;

ALTER TABLE layers
  ADD CONSTRAINT layers_type_check
  CHECK (type IN ('melody', 'rhythm', 'drone', 'keyboard'));


-- ── 5. PROJECTS — add missing bpm column ─────────────────────────────────────
-- The API inserts { bpm } on every project save. Without this column the insert
-- either errors or silently drops the field depending on client version.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS bpm INTEGER DEFAULT 120;


-- ── 6. RAGAS — ensure no mutation from non-service-role clients ───────────────
-- RLS is already enabled with only a SELECT policy, so anon/authenticated users
-- cannot INSERT/UPDATE/DELETE ragas. Explicit denial policies make this auditable.
-- WHY service_role in ai/chat/route.ts: match_ragas() is a READ-ONLY RPC that
-- calls pgvector cosine similarity on public raga data. Service role is used solely
-- to bypass the anon rate-limit on the RPC call, not to access user data.

DROP POLICY IF EXISTS "ragas_no_insert" ON ragas;
CREATE POLICY "ragas_no_insert"
  ON ragas FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "ragas_no_update" ON ragas;
CREATE POLICY "ragas_no_update"
  ON ragas FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "ragas_no_delete" ON ragas;
CREATE POLICY "ragas_no_delete"
  ON ragas FOR DELETE
  USING (false);
