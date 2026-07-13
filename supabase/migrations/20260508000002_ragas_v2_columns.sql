-- Add modern_moods array and starter_raga flag to ragas table (PRD v2 §3.2)
ALTER TABLE ragas
  ADD COLUMN IF NOT EXISTS modern_moods text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS starter_raga boolean DEFAULT false;

-- Mark the 8 starter ragas
UPDATE ragas SET starter_raga = true
WHERE name IN ('Yaman', 'Bhoopali', 'Bhimpalasi', 'Bhairavi', 'Desh', 'Kafi', 'Hamsadhwani', 'Durga');

-- Seed modern_moods for common ragas
UPDATE ragas SET modern_moods = ARRAY['Calm', 'Focus'] WHERE name ILIKE '%Bhairav%';
UPDATE ragas SET modern_moods = ARRAY['Romantic', 'Calm'] WHERE name ILIKE '%Yaman%';
UPDATE ragas SET modern_moods = ARRAY['Devotional', 'Calm'] WHERE name ILIKE '%Bhairavi%';
UPDATE ragas SET modern_moods = ARRAY['Melancholic', 'Devotional'] WHERE name ILIKE '%Darbari%';
UPDATE ragas SET modern_moods = ARRAY['Joyful', 'Energetic'] WHERE name ILIKE '%Bhoopali%';
UPDATE ragas SET modern_moods = ARRAY['Romantic', 'Melancholic'] WHERE name ILIKE '%Bhimpalasi%';
UPDATE ragas SET modern_moods = ARRAY['Calm', 'Devotional'] WHERE name ILIKE '%Todi%';
UPDATE ragas SET modern_moods = ARRAY['Joyful', 'Romantic'] WHERE name ILIKE '%Kafi%';
UPDATE ragas SET modern_moods = ARRAY['Joyful'] WHERE name ILIKE '%Hamsadhwani%';
UPDATE ragas SET modern_moods = ARRAY['Focus', 'Calm'] WHERE name ILIKE '%Marwa%';
UPDATE ragas SET modern_moods = ARRAY['Melancholic', 'Romantic'] WHERE name ILIKE '%Desh%';
UPDATE ragas SET modern_moods = ARRAY['Energetic', 'Joyful'] WHERE name ILIKE '%Durga%';
UPDATE ragas SET modern_moods = ARRAY['Devotional', 'Melancholic'] WHERE name ILIKE '%Puriya%';
UPDATE ragas SET modern_moods = ARRAY['Focus', 'Melancholic'] WHERE name ILIKE '%Shree%';
UPDATE ragas SET modern_moods = ARRAY['Calm', 'Romantic'] WHERE name ILIKE '%Kedar%';
