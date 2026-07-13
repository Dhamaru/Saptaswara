-- prahara (time-of-day quarter 1-8) missing from live DB because the column
-- was in the initial schema file but the DB was seeded before that file was committed.
ALTER TABLE ragas
  ADD COLUMN IF NOT EXISTS prahara INTEGER;
