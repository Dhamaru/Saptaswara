-- Migration: Create practice_logs table
-- Depends on: 20260406_add_tradition_embeddings.sql (or initial schema)

CREATE TABLE IF NOT EXISTS practice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  raga TEXT NOT NULL,
  notes TEXT,
  intensity TEXT CHECK (intensity IN ('Deep', 'Meditative', 'Focused', 'Light', 'Creative')),
  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES
ALTER TABLE practice_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own practice logs" ON practice_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own practice logs" ON practice_logs 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice logs" ON practice_logs 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice logs" ON practice_logs 
  FOR DELETE USING (auth.uid() = user_id);
