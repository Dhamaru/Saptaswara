-- Expand layers.type CHECK to include all studio track types.
-- Required for multi-track persistence (vocal, bass, pad tracks).
ALTER TABLE layers DROP CONSTRAINT IF EXISTS layers_type_check;
ALTER TABLE layers ADD CONSTRAINT layers_type_check
  CHECK (type IN ('melody', 'rhythm', 'drone', 'keyboard', 'vocal', 'bass', 'pad'));
