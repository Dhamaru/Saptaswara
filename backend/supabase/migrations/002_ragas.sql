CREATE TABLE IF NOT EXISTS ragas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  aroha text[] NOT NULL,
  avaroha text[] NOT NULL,
  vadi text,
  samvadi text,
  pakad text,
  thaat text,
  time_of_day text,
  mood text,
  jati text,
  semitones int[],
  hz_sa float8 DEFAULT 261.63,
  hz_map jsonb,
  tags text[],
  vishranti_sthan text,
  verified boolean DEFAULT false,
  source_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ragas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read ragas" ON ragas;
CREATE POLICY "Anyone can read ragas" ON ragas
  FOR SELECT USING (true);
