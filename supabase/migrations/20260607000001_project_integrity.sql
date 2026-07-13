-- Fix 11: projects.user_id must not be NULL (orphaned rows are inaccessible via RLS)
DELETE FROM projects WHERE user_id IS NULL;
ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;

-- Fix 12: layers.project_id must not be NULL (orphaned layers are inaccessible via RLS)
DELETE FROM layers WHERE project_id IS NULL;
ALTER TABLE layers ALTER COLUMN project_id SET NOT NULL;

-- Fix 5: Atomic project+layer creation via a single transaction.
-- Calling the two inserts separately from application code allows a window where
-- a project exists without a layer (orphan) if the layer insert fails.
-- SECURITY INVOKER: runs as the calling user so RLS policies still apply.
CREATE OR REPLACE FUNCTION create_project_with_layer(
  p_title    TEXT,
  p_raga_id  UUID,
  p_bpm      INTEGER,
  p_user_id  UUID,
  p_sequence JSONB DEFAULT 'null'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_project_id UUID;
  v_layer_id   UUID;
BEGIN
  INSERT INTO projects (title, raga_id, bpm, user_id)
  VALUES (p_title, p_raga_id, p_bpm, p_user_id)
  RETURNING id INTO v_project_id;

  INSERT INTO layers (project_id, name, type, events)
  VALUES (
    v_project_id,
    'Main Sequence',
    'melody',
    jsonb_build_object('sequence', p_sequence)
  )
  RETURNING id INTO v_layer_id;

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'layer_id',   v_layer_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_project_with_layer TO authenticated;
