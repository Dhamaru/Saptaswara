-- conformance_scores: stores raga conformance analysis results per layer (PRD v2 §3.1)
CREATE TABLE IF NOT EXISTS conformance_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id        uuid REFERENCES layers(id) ON DELETE CASCADE,
  raga_id         uuid REFERENCES ragas(id),
  score           float NOT NULL CHECK (score >= 0 AND score <= 100),
  note_breakdown  jsonb DEFAULT '{}',
  dominant_swara  text,
  non_raga_count  integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE conformance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own conformance scores via layer"
  ON conformance_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM layers l
      JOIN projects p ON p.id = l.project_id
      WHERE l.id = layer_id AND p.user_id = auth.uid()
    )
  );

-- Add conformance_score float to layers table
ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS conformance_score float;
