-- user_preferences: stores per-user onboarding choices and learned preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  skill_level     text CHECK (skill_level IN ('Beginner', 'Student', 'Musician')),
  onboarding_mood text,
  preferred_ragas text[]   DEFAULT '{}',
  preferred_instruments text[] DEFAULT '{}',
  onboarding_done boolean  DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own preferences"
  ON user_preferences FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to read for analytics
CREATE POLICY "service role full access"
  ON user_preferences FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
