CREATE TABLE IF NOT EXISTS layers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text DEFAULT 'Layer',
  type text CHECK (type IN ('keyboard','drum','voice')),
  volume float8 DEFAULT 1.0,
  events jsonb DEFAULT '[]',
  clip_url text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access via project ownership" ON layers;
CREATE POLICY "Access via project ownership" ON layers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = layers.project_id 
      AND projects.user_id = auth.uid()
    )
  );
