-- Initial Schema for Saptaswara (Resonant Void)
-- This file ensures the project is 'platform independent' (portable to any Supabase instance)

-- 1. Ragas Table
CREATE TABLE IF NOT EXISTS ragas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  thaat TEXT,
  time_of_day TEXT,
  vadi TEXT,
  samvadi TEXT,
  aroha TEXT[],
  avaroha TEXT[],
  mood TEXT,
  prahara INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  raga_id UUID REFERENCES ragas(id),
  title TEXT DEFAULT 'Untitled Composition',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Layers Table (Sequencer Data)
CREATE TABLE IF NOT EXISTS layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('melody', 'rhythm', 'drone')),
  events JSONB DEFAULT '{"sequence": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES (Ensures anyone can read/browse, but only owners can edit)

-- Ragas: Read access to everyone
ALTER TABLE ragas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access for Ragas" ON ragas FOR SELECT USING (true);

-- Projects: Only owner
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- Layers: Only owner
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own layers" ON layers FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid())
);
