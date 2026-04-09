-- Migration: 20260407_raga_phrases.sql
-- Description: Adds the 72 Melakarta ragas and a system for storing raga phrases.

-- 1. Create raga_phrases table
CREATE TABLE IF NOT EXISTS raga_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raga_id UUID REFERENCES ragas(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g., 'Pakad', 'Arohana', 'Characteristic Phrase'
  sequence TEXT[] NOT NULL, -- Sequence of swaras (e.g., {'S', 'R', 'G', 'm', 'P'})
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add melakarta_number column to ragas table
ALTER TABLE ragas ADD COLUMN IF NOT EXISTS melakarta_number INTEGER;
ALTER TABLE ragas ADD COLUMN IF NOT EXISTS tradition TEXT DEFAULT 'Hindustani';

-- 3. Add Row Level Security for raga_phrases (matching ragas table)
ALTER TABLE raga_phrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access for phrases" ON raga_phrases FOR SELECT USING (true);

-- 3. Populate Melakarta Ragas (Sample of all 72)
-- Note: Melakarta ragas are Sampurna (7 notes in Aroha/Avaroha).

INSERT INTO ragas (name, aroha, avaroha, tradition, melakarta_number) VALUES
  ('Kanakangi', ARRAY['S', 'r', 'R', 'm', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'm', 'R', 'r', 'S'], 'Carnatic', 1),
  ('Ratnangi', ARRAY['S', 'r', 'R', 'm', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'm', 'R', 'r', 'S'], 'Carnatic', 2),
  ('Ganamurti', ARRAY['S', 'r', 'R', 'm', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'm', 'R', 'r', 'S'], 'Carnatic', 3),
  ('Vanaspati', ARRAY['S', 'r', 'R', 'm', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'm', 'R', 'r', 'S'], 'Carnatic', 4),
  ('Manavati', ARRAY['S', 'r', 'R', 'm', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'm', 'R', 'r', 'S'], 'Carnatic', 5),
  ('Tanarupi', ARRAY['S', 'r', 'R', 'm', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'm', 'R', 'r', 'S'], 'Carnatic', 6),
  ('Senavati', ARRAY['S', 'r', 'g', 'm', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'm', 'g', 'r', 'S'], 'Carnatic', 7),
  ('Hanumatodi', ARRAY['S', 'r', 'g', 'm', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'm', 'g', 'r', 'S'], 'Carnatic', 8),
  ('Dhenuka', ARRAY['S', 'r', 'g', 'm', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'm', 'g', 'r', 'S'], 'Carnatic', 9),
  ('Natakapriya', ARRAY['S', 'r', 'g', 'm', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'm', 'g', 'r', 'S'], 'Carnatic', 10),
  ('Kokilapriya', ARRAY['S', 'r', 'g', 'm', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'm', 'g', 'r', 'S'], 'Carnatic', 11),
  ('Rupavati', ARRAY['S', 'r', 'g', 'm', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'm', 'g', 'r', 'S'], 'Carnatic', 12),
  ('Gayakapriya', ARRAY['S', 'r', 'G', 'm', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'm', 'G', 'r', 'S'], 'Carnatic', 13),
  ('Vakulabharanam', ARRAY['S', 'r', 'G', 'm', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'm', 'G', 'r', 'S'], 'Carnatic', 14),
  ('Mayamalavagowla', ARRAY['S', 'r', 'G', 'm', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'm', 'G', 'r', 'S'], 'Carnatic', 15),
  ('Chakravakam', ARRAY['S', 'r', 'G', 'm', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'm', 'G', 'r', 'S'], 'Carnatic', 16),
  ('Suryakantam', ARRAY['S', 'r', 'G', 'm', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'm', 'G', 'r', 'S'], 'Carnatic', 17),
  ('Hatakambari', ARRAY['S', 'r', 'G', 'm', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'm', 'G', 'r', 'S'], 'Carnatic', 18),
  ('Jhankaradhwani', ARRAY['S', 'R', 'g', 'm', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'm', 'g', 'R', 'S'], 'Carnatic', 19),
  ('Natabhairavi', ARRAY['S', 'R', 'g', 'm', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'm', 'g', 'R', 'S'], 'Carnatic', 20),
  ('Keeravani', ARRAY['S', 'R', 'g', 'm', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'm', 'g', 'R', 'S'], 'Carnatic', 21),
  ('Kharaharapriya', ARRAY['S', 'R', 'g', 'm', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'm', 'g', 'R', 'S'], 'Carnatic', 22),
  ('Gourimanohari', ARRAY['S', 'R', 'g', 'm', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'm', 'g', 'R', 'S'], 'Carnatic', 23),
  ('Varunapriya', ARRAY['S', 'R', 'g', 'm', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'm', 'g', 'R', 'S'], 'Carnatic', 24),
  ('Mararanjani', ARRAY['S', 'R', 'G', 'm', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'm', 'G', 'R', 'S'], 'Carnatic', 25),
  ('Charukesi', ARRAY['S', 'R', 'G', 'm', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'm', 'G', 'R', 'S'], 'Carnatic', 26),
  ('Sarasangi', ARRAY['S', 'R', 'G', 'm', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'm', 'G', 'R', 'S'], 'Carnatic', 27),
  ('Harikambhoji', ARRAY['S', 'R', 'G', 'm', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'm', 'G', 'R', 'S'], 'Carnatic', 28),
  ('Dheerasankarabharanam', ARRAY['S', 'R', 'G', 'm', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'm', 'G', 'R', 'S'], 'Carnatic', 29),
  ('Naganandini', ARRAY['S', 'R', 'G', 'm', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'm', 'G', 'R', 'S'], 'Carnatic', 30),
  ('Yagapriya', ARRAY['S', 'g', 'G', 'm', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'm', 'G', 'g', 'S'], 'Carnatic', 31),
  ('Ragavardhini', ARRAY['S', 'g', 'G', 'm', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'm', 'G', 'g', 'S'], 'Carnatic', 32),
  ('Gangeyabhushani', ARRAY['S', 'g', 'G', 'm', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'm', 'G', 'g', 'S'], 'Carnatic', 33),
  ('Vagadheeswari', ARRAY['S', 'g', 'G', 'm', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'm', 'G', 'g', 'S'], 'Carnatic', 34),
  ('Shulini', ARRAY['S', 'g', 'G', 'm', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'm', 'G', 'g', 'S'], 'Carnatic', 35),
  ('Chalanata', ARRAY['S', 'g', 'G', 'm', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'm', 'G', 'g', 'S'], 'Carnatic', 36),
  ('Salagam', ARRAY['S', 'r', 'R', 'M', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'M', 'R', 'r', 'S'], 'Carnatic', 37),
  ('Jalarnavam', ARRAY['S', 'r', 'R', 'M', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'M', 'R', 'r', 'S'], 'Carnatic', 38),
  ('Jhalavarali', ARRAY['S', 'r', 'R', 'M', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'M', 'R', 'r', 'S'], 'Carnatic', 39),
  ('Navaneetam', ARRAY['S', 'r', 'R', 'M', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'M', 'R', 'r', 'S'], 'Carnatic', 40),
  ('Pavani', ARRAY['S', 'r', 'R', 'M', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'M', 'R', 'r', 'S'], 'Carnatic', 41),
  ('Raghupriya', ARRAY['S', 'r', 'R', 'M', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'M', 'R', 'r', 'S'], 'Carnatic', 42),
  ('Gavambhodi', ARRAY['S', 'r', 'g', 'M', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'M', 'g', 'r', 'S'], 'Carnatic', 43),
  ('Bhavapriya', ARRAY['S', 'r', 'g', 'M', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'M', 'g', 'r', 'S'], 'Carnatic', 44),
  ('Shubhapantuvarali', ARRAY['S', 'r', 'g', 'M', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'M', 'g', 'r', 'S'], 'Carnatic', 45),
  ('Shadvidamargini', ARRAY['S', 'r', 'g', 'M', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'M', 'g', 'r', 'S'], 'Carnatic', 46),
  ('Suvarnangi', ARRAY['S', 'r', 'g', 'M', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'M', 'g', 'r', 'S'], 'Carnatic', 47),
  ('Divyamani', ARRAY['S', 'r', 'g', 'M', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'M', 'g', 'r', 'S'], 'Carnatic', 48),
  ('Dhavalambari', ARRAY['S', 'r', 'G', 'M', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'M', 'G', 'r', 'S'], 'Carnatic', 49),
  ('Namanarayani', ARRAY['S', 'r', 'G', 'M', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'M', 'G', 'r', 'S'], 'Carnatic', 50),
  ('Kamavardhini', ARRAY['S', 'r', 'G', 'M', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'M', 'G', 'r', 'S'], 'Carnatic', 51),
  ('Ramapriya', ARRAY['S', 'r', 'G', 'M', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'M', 'G', 'r', 'S'], 'Carnatic', 52),
  ('Gamanashrama', ARRAY['S', 'r', 'G', 'M', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'M', 'G', 'r', 'S'], 'Carnatic', 53),
  ('Vishwambari', ARRAY['S', 'r', 'G', 'M', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'M', 'G', 'r', 'S'], 'Carnatic', 54),
  ('Shamalangi', ARRAY['S', 'r', 'g', 'M', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'M', 'g', 'R', 'S'], 'Carnatic', 55),
  ('Shanmukhapriya', ARRAY['S', 'R', 'g', 'M', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'M', 'g', 'R', 'S'], 'Carnatic', 56),
  ('Simhendramadhyamam', ARRAY['S', 'R', 'g', 'M', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'M', 'g', 'R', 'S'], 'Carnatic', 57),
  ('Hemavati', ARRAY['S', 'R', 'g', 'M', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'M', 'g', 'R', 'S'], 'Carnatic', 58),
  ('Dharmavati', ARRAY['S', 'R', 'g', 'M', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'M', 'g', 'R', 'S'], 'Carnatic', 59),
  ('Neetimati', ARRAY['S', 'R', 'g', 'M', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'M', 'g', 'R', 'S'], 'Carnatic', 60),
  ('Kantamani', ARRAY['S', 'R', 'G', 'M', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'M', 'G', 'R', 'S'], 'Carnatic', 61),
  ('Rishabhapriya', ARRAY['S', 'R', 'G', 'M', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'M', 'G', 'R', 'S'], 'Carnatic', 62),
  ('Latangi', ARRAY['S', 'R', 'G', 'M', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'M', 'G', 'R', 'S'], 'Carnatic', 63),
  ('Vachaspati', ARRAY['S', 'R', 'G', 'M', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'M', 'G', 'R', 'S'], 'Carnatic', 64),
  ('Mechakalyani', ARRAY['S', 'R', 'G', 'M', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'M', 'G', 'R', 'S'], 'Carnatic', 65),
  ('Chitrambari', ARRAY['S', 'R', 'G', 'M', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'M', 'G', 'R', 'S'], 'Carnatic', 66),
  ('Sucharitra', ARRAY['S', 'g', 'G', 'M', 'P', 'd', 'D', 'S'''], ARRAY['S''', 'D', 'd', 'P', 'M', 'G', 'g', 'S'], 'Carnatic', 67),
  ('Jyotiswarupini', ARRAY['S', 'g', 'G', 'M', 'P', 'd', 'n', 'S'''], ARRAY['S''', 'n', 'd', 'P', 'M', 'G', 'g', 'S'], 'Carnatic', 68),
  ('Dhatuvardhani', ARRAY['S', 'g', 'G', 'M', 'P', 'd', 'N', 'S'''], ARRAY['S''', 'N', 'd', 'P', 'M', 'G', 'g', 'S'], 'Carnatic', 69),
  ('Nasikabhushani', ARRAY['S', 'g', 'G', 'M', 'P', 'D', 'n', 'S'''], ARRAY['S''', 'n', 'D', 'P', 'M', 'G', 'g', 'S'], 'Carnatic', 70),
  ('Kosalam', ARRAY['S', 'g', 'G', 'M', 'P', 'D', 'N', 'S'''], ARRAY['S''', 'N', 'D', 'P', 'M', 'G', 'g', 'S'], 'Carnatic', 71),
  ('Rasikapriya', ARRAY['S', 'g', 'G', 'M', 'P', 'n', 'N', 'S'''], ARRAY['S''', 'N', 'n', 'P', 'M', 'G', 'g', 'S'], 'Carnatic', 72)
ON CONFLICT (name) DO NOTHING;

-- 4. Initial Phrases for key ragas
-- Mayamalavagowla (Sarali Varisai 1 sequence as a phrase)
INSERT INTO raga_phrases (raga_id, label, sequence)
SELECT id, 'Sarali Varisai 1', ARRAY['S', 'r', 'G', 'm', 'P', 'd', 'N', 'S''']
FROM ragas WHERE name = 'Mayamalavagowla';

-- Kharaharapriya (Characteristic leap)
INSERT INTO raga_phrases (raga_id, label, sequence)
SELECT id, 'Characteristic Leap', ARRAY['S', 'R', 'g', 'm', 'P', 'D', 'P']
FROM ragas WHERE name = 'Kharaharapriya';
