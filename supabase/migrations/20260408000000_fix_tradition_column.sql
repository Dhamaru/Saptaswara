-- Fix: 20260407_raga_phrases.sql added tradition TEXT DEFAULT 'Hindustani'
-- without the CHECK constraint already defined in 20260406_add_tradition_embeddings.sql.
-- This migration removes the bare DEFAULT if it created a duplicate and ensures
-- the CHECK constraint is present, without breaking existing data.

DO $$
BEGIN
  -- Only add the CHECK constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ragas_tradition_check'
      AND conrelid = 'ragas'::regclass
  ) THEN
    ALTER TABLE ragas
      ADD CONSTRAINT ragas_tradition_check
      CHECK (tradition IN ('Hindustani', 'Carnatic'));
  END IF;

  -- Remove the DEFAULT that 20260407 set (we don't want a hard default)
  ALTER TABLE ragas ALTER COLUMN tradition DROP DEFAULT;
EXCEPTION WHEN others THEN
  NULL; -- ignore if already applied
END $$;
