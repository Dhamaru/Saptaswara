-- Enforce one layer per track type per project.
-- Guards upsertTracks correctness at DB level — prevents duplicate rows from concurrent saves.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'layers_project_type_unique'
  ) THEN
    ALTER TABLE layers ADD CONSTRAINT layers_project_type_unique UNIQUE (project_id, type);
  END IF;
END $$;
