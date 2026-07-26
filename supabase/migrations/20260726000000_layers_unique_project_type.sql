-- Enforce one layer per track type per project.
-- Guards upsertTracks correctness at DB level — prevents duplicate rows from concurrent saves.
ALTER TABLE layers
  ADD CONSTRAINT IF NOT EXISTS layers_project_type_unique UNIQUE (project_id, type);
