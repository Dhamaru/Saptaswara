-- Add instrument column to layers table for per-track instrument persistence.
ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS instrument TEXT DEFAULT 'piano';

-- Backfill existing rows with a type-appropriate instrument instead of the
-- generic 'piano' default (app always sets instrument explicitly on save;
-- this only affects rows written before this column existed).
UPDATE layers SET instrument = 'tabla' WHERE type = 'rhythm' AND instrument = 'piano';
UPDATE layers SET instrument = 'tambura' WHERE type = 'drone' AND instrument = 'piano';
UPDATE layers SET instrument = 'harmonium' WHERE type = 'vocal' AND instrument = 'piano';
UPDATE layers SET instrument = 'sarod' WHERE type = 'bass' AND instrument = 'piano';

-- Add check constraint for supported canonical instruments
ALTER TABLE layers DROP CONSTRAINT IF EXISTS layers_instrument_check;
ALTER TABLE layers ADD CONSTRAINT layers_instrument_check
  CHECK (instrument IN (
    'piano',
    'veena',
    'bansuri',
    'tambura',
    'harmonium',
    'sarangi',
    'sitar',
    'sarod',
    'santoor',
    'shehnai',
    'tabla',
    'mridangam'
  ));
